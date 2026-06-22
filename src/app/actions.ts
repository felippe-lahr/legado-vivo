"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  getFaixa,
  getPerguntaByNumero,
  flattenPerguntas,
  listFaixaIds,
  totalPerguntas,
} from "@/lib/questions";
import { gerarPerguntaDinamica, gerarPerfil, gerarCarta1 } from "@/lib/anthropic";
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

  let profile: Profile;
  try {
    profile = await gerarPerfil(session.ageGroup, answers);
  } catch (err) {
    console.error("[finalizarQuiz] Falha ao gerar o perfil:", err);
    throw err;
  }

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
  carta1: string | null;
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
    carta1: session.carta1 ?? null,
  };
}

/**
 * Gera e persiste a Carta 1 se ainda não existir. Idempotente.
 * Retorna o texto da carta.
 */
export async function obterCarta1(sessionId: string): Promise<string> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Sessão não encontrada.");

  if (session.carta1) return session.carta1;

  const profile = session.profile as unknown as Profile | null;
  if (!profile) throw new Error("Perfil ainda não gerado.");

  const answers = lerAnswers(session.answers);

  let carta: string;
  try {
    carta = await gerarCarta1(session.ageGroup, answers, profile);
  } catch (err) {
    console.error("[obterCarta1] Falha ao gerar carta:", err);
    throw err;
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { carta1: carta },
  });

  return carta;
}

/**
 * Exclusão real e definitiva da sessão (todas as respostas, perfil e dados).
 * Cumpre a promessa "você pode apagar tudo" — remove a linha do banco, não
 * apenas oculta. Idempotente: não falha se a sessão já não existir.
 */
export async function excluirDados(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

export interface RespostaBonusState {
  pergunta: string | null;
  jaRespondeu: boolean;
  pago: boolean;
}

/** Dados da página de resposta do bônus (dia 7/10). */
export async function getRespostaBonusState(
  sessionId: string,
): Promise<RespostaBonusState> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Sessão não encontrada.");
  return {
    pergunta: session.perguntaPendente ?? null,
    jaRespondeu: session.respostaBonus !== null,
    pago: session.paidAt !== null,
  };
}

/** Salva a resposta do bônus (a pessoa responde à pergunta da Carta 1). */
export async function salvarRespostaBonus(
  sessionId: string,
  texto: string,
): Promise<void> {
  const limpo = texto.trim();
  if (!limpo) throw new Error("Resposta vazia.");
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Sessão não encontrada.");
  if (!session.perguntaPendente) {
    throw new Error("Não há pergunta pendente para esta sessão.");
  }
  await prisma.session.update({
    where: { id: sessionId },
    data: { respostaBonus: limpo },
  });
}
export interface CheckoutData {
  preferenceId: string;
  initPoint: string;
}

export async function iniciarCheckout(
  sessionId: string,
  email: string,
): Promise<CheckoutData> {
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
  try {
    return await criarPreferencia(sessionId, emailLimpo);
  } catch (err) {
    console.error("[iniciarCheckout] Falha ao criar preferência:", err);
    throw err;
  }
}

// ─── Modo de teste (semente) ──────────────────────────────────────
// Habilitado apenas quando ENABLE_TEST_SEED === "1". Cria uma sessão já
// totalmente respondida e com perfil gerado, para testar o fluxo de
// resultado/pagamento sem responder o quiz inteiro a cada vez.

/** Verdadeiro se o modo de teste (seed) está habilitado no ambiente. */
export async function testSeedHabilitado(): Promise<boolean> {
  return process.env.ENABLE_TEST_SEED === "1";
}

const RESPOSTAS_SEMENTE = [
  "Quando penso nisso, lembro de momentos em que precisei recomeçar do zero e descobri uma força que eu não sabia que tinha.",
  "Sempre fui movido por cuidar das pessoas ao meu redor, mesmo quando isso significou deixar meus próprios sonhos em segundo plano.",
  "Tenho orgulho do que construí, mas confesso que às vezes me pergunto se segui o caminho que eu realmente queria.",
  "O que mais me marca é a sensação de que ainda tenho muito a oferecer e a viver, independente da idade.",
  "Aprendi que o tempo é o bem mais precioso, e hoje tento gastá-lo com quem e com o que importa de verdade.",
  "Há uma parte de mim que quer deixar algo que dure além da minha presença — uma marca, um exemplo.",
  "Já carreguei muitas culpas, mas estou aprendendo a me perdoar e a olhar para trás com mais gentileza.",
  "Minha maior alegria sempre veio das relações simples e verdadeiras, não das conquistas materiais.",
];

/**
 * Cria uma sessão de teste com todas as respostas preenchidas e o perfil já
 * gerado, devolvendo o id. Protegido por ENABLE_TEST_SEED.
 */
export async function criarSessaoSemente(faixaId: string): Promise<string> {
  if (process.env.ENABLE_TEST_SEED !== "1") {
    throw new Error("Modo de teste desabilitado.");
  }
  const faixa = getFaixa(faixaId);
  if (!faixa) throw new Error(`Faixa etária inválida: ${faixaId}`);

  const session = await prisma.session.create({
    data: { ageGroup: faixaId, answers: [] },
  });

  const answers: Answer[] = flattenPerguntas(faixa).map((p, i) => ({
    numero: p.numero,
    perguntaId: p.id,
    texto: p.texto ?? p.subtexto ?? "Pergunta personalizada de teste",
    resposta: RESPOSTAS_SEMENTE[i % RESPOSTAS_SEMENTE.length],
  }));

  await prisma.session.update({
    where: { id: session.id },
    data: { answers: answers as unknown as Prisma.InputJsonValue },
  });

  // Gera o perfil real (uma chamada à IA) para o fluxo ficar fiel.
  await finalizarQuiz(session.id);

  return session.id;
}
