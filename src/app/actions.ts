"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  getFaixa,
  getPerguntaByNumero,
  listFaixaIds,
  totalPerguntas,
} from "@/lib/questions";
import { gerarPerguntaDinamica, gerarPerfil } from "@/lib/anthropic";
import type { Answer, Profile } from "@/lib/types";

function lerAnswers(value: unknown): Answer[] {
  if (Array.isArray(value)) return value as Answer[];
  return [];
}

/** Cria uma nova sessão para a faixa etária escolhida e devolve o id. */
export async function createSession(faixaId: string): Promise<string> {
  if (!listFaixaIds().includes(faixaId)) {
    throw new Error(`Faixa etária inválida: ${faixaId}`);
  }
  const session = await prisma.session.create({
    data: { ageGroup: faixaId, answers: [] },
  });
  return session.id;
}

export interface SessionState {
  faixaId: string;
  answers: Answer[];
  total: number;
  hasProfile: boolean;
  paid: boolean;
}

/** Estado da sessão para o quiz retomar de onde parou. */
export async function getSessionState(sessionId: string): Promise<SessionState> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Sessão não encontrada.");
  const faixa = getFaixa(session.ageGroup);
  if (!faixa) throw new Error("Faixa da sessão inválida.");
  return {
    faixaId: session.ageGroup,
    answers: lerAnswers(session.answers),
    total: totalPerguntas(faixa),
    hasProfile: session.profile !== null,
    paid: session.paidAt !== null,
  };
}

/**
 * Retorna o texto da pergunta de número `numero`. Perguntas fixas vêm do JSON;
 * perguntas dinâmicas (4, 6, 8) são geradas em tempo real pela Claude API
 * a partir das respostas anteriores.
 */
export async function obterPergunta(
  sessionId: string,
  numero: number,
): Promise<string> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Sessão não encontrada.");
  const faixa = getFaixa(session.ageGroup);
  if (!faixa) throw new Error("Faixa da sessão inválida.");

  const pergunta = getPerguntaByNumero(faixa, numero);
  if (!pergunta) throw new Error(`Pergunta ${numero} não encontrada.`);

  if (pergunta.tipo === "fixa" && pergunta.texto) {
    return pergunta.texto;
  }

  // Dinâmica: gera com base nas respostas já dadas.
  const answers = lerAnswers(session.answers);
  return gerarPerguntaDinamica(session.ageGroup, pergunta, answers);
}

/** Salva (ou substitui) a resposta de uma pergunta na sessão. */
export async function salvarResposta(
  sessionId: string,
  numero: number,
  perguntaId: string,
  texto: string,
  resposta: string,
): Promise<void> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Sessão não encontrada.");

  const answers = lerAnswers(session.answers).filter((a) => a.numero !== numero);
  answers.push({ numero, perguntaId, texto, resposta: resposta.trim() });
  answers.sort((a, b) => a.numero - b.numero);

  await prisma.session.update({
    where: { id: sessionId },
    data: { answers: answers as unknown as Prisma.InputJsonValue },
  });
}

/**
 * Finaliza o quiz: gera o perfil final via Claude (se ainda não existir) e
 * persiste em `sessions.profile`. Idempotente.
 */
export async function finalizarQuiz(sessionId: string): Promise<Profile> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Sessão não encontrada.");

  if (session.profile) {
    return session.profile as unknown as Profile;
  }

  const faixa = getFaixa(session.ageGroup);
  if (!faixa) throw new Error("Faixa da sessão inválida.");

  const answers = lerAnswers(session.answers);
  if (answers.length < totalPerguntas(faixa)) {
    throw new Error("O quiz ainda não foi totalmente respondido.");
  }

  const profile = await gerarPerfil(session.ageGroup, answers);

  await prisma.session.update({
    where: { id: sessionId },
    data: { profile: profile as unknown as Prisma.InputJsonValue },
  });

  return profile;
}

export interface ResultadoData {
  profile: Profile | null;
  faixaId: string;
  paid: boolean;
  email: string | null;
}

/** Dados para a página de resultado. */
export async function getResultado(sessionId: string): Promise<ResultadoData> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Sessão não encontrada.");
  return {
    profile: (session.profile as unknown as Profile) ?? null,
    faixaId: session.ageGroup,
    paid: session.paidAt !== null,
    email: session.email,
  };
}

/**
 * Inicia o checkout: salva o e-mail e cria a preferência de pagamento no
 * Mercado Pago (R$ 9,90). Retorna a URL de checkout.
 */
export async function iniciarCheckout(
  sessionId: string,
  email: string,
): Promise<string> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Sessão não encontrada.");

  const emailLimpo = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
    throw new Error("E-mail inválido.");
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { email: emailLimpo },
  });

  // Importação dinâmica para não acoplar o SDK do Mercado Pago ao bundle
  // das demais actions.
  const { criarPreferencia } = await import("@/lib/mercadopago");
  return criarPreferencia(sessionId, emailLimpo);
}
