import { prisma } from "@/lib/prisma";
import { gerarCarta1, gerarCarta2 } from "@/lib/anthropic";
import {
  enviarCarta1,
  enviarCarta2,
  enviarLembreteDia7,
  enviarLembreteFinal,
} from "@/lib/email";
import type { Answer, Profile } from "@/lib/types";

function lerAnswers(value: unknown): Answer[] {
  return Array.isArray(value) ? (value as Answer[]) : [];
}

const DIA = 24 * 60 * 60 * 1000;

/**
 * Executado quando um pagamento é confirmado: garante a Carta 1, registra a
 * pergunta pendente (para o bônus de 10 dias) e envia a Carta 1 por e-mail.
 * Idempotente — seguro chamar mais de uma vez.
 */
export async function processarPagamentoConfirmado(
  sessionId: string,
): Promise<void> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return;

  const profile = session.profile as unknown as Profile | null;
  if (!profile) {
    console.warn(`[bonus] Sessão ${sessionId} paga mas sem perfil.`);
    return;
  }

  // Garante que a Carta 1 exista.
  let carta1 = session.carta1;
  if (!carta1) {
    try {
      carta1 = await gerarCarta1(
        session.ageGroup,
        lerAnswers(session.answers),
        profile,
      );
    } catch (err) {
      console.error("[bonus] Falha ao gerar Carta 1 pós-pagamento:", err);
      return;
    }
  }

  // Registra carta + pergunta pendente do bônus.
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      carta1,
      perguntaPendente:
        session.perguntaPendente ?? profile.pergunta_final_reflexao ?? null,
    },
  });

  // Envia a Carta 1 por e-mail (uma única vez).
  if (session.email && !session.carta1EnviadaEm) {
    try {
      await enviarCarta1(session.email, carta1);
      await prisma.session.update({
        where: { id: sessionId },
        data: { carta1EnviadaEm: new Date() },
      });
    } catch (err) {
      console.error("[bonus] Falha ao enviar Carta 1 por e-mail:", err);
    }
  }
}

interface CronResultado {
  lembretesDia7: number;
  cartas2: number;
  lembretesFinais: number;
}

/**
 * Rotina diária do bônus de 10 dias:
 *  - Dia 7: envia lembrete com a pergunta pendente (se ainda não respondeu).
 *  - Dia 10: se respondeu, gera e envia a Carta 2; se não, envia um único
 *    lembrete final gentil.
 */
export async function processarCronBonus(): Promise<CronResultado> {
  const agora = Date.now();
  const resultado: CronResultado = {
    lembretesDia7: 0,
    cartas2: 0,
    lembretesFinais: 0,
  };

  // Só interessam sessões pagas, com e-mail e pergunta pendente registrada.
  const sessoes = await prisma.session.findMany({
    where: {
      paidAt: { not: null },
      email: { not: null },
      perguntaPendente: { not: null },
      carta2EnviadaEm: null,
    },
  });

  for (const s of sessoes) {
    if (!s.paidAt || !s.email || !s.perguntaPendente) continue;
    const idade = agora - s.paidAt.getTime();

    // ── Dia 10+: já respondeu → Carta 2 ──────────────────────────────
    if (idade >= 10 * DIA && s.respostaBonus && !s.carta2) {
      try {
        const carta2 = await gerarCarta2(
          s.ageGroup,
          s.perguntaPendente,
          s.respostaBonus,
          s.carta1 ?? "",
        );
        await enviarCarta2(s.email, carta2);
        await prisma.session.update({
          where: { id: s.id },
          data: { carta2, carta2EnviadaEm: new Date() },
        });
        resultado.cartas2 += 1;
      } catch (err) {
        console.error(`[cron] Falha na Carta 2 da sessão ${s.id}:`, err);
      }
      continue;
    }

    // ── Dia 10+: não respondeu → lembrete final único ────────────────
    if (idade >= 10 * DIA && !s.respostaBonus && !s.lembreteFinalEm) {
      try {
        await enviarLembreteFinal(s.email, s.id, s.perguntaPendente);
        await prisma.session.update({
          where: { id: s.id },
          data: { lembreteFinalEm: new Date() },
        });
        resultado.lembretesFinais += 1;
      } catch (err) {
        console.error(`[cron] Falha no lembrete final da sessão ${s.id}:`, err);
      }
      continue;
    }

    // ── Dia 7-10: lembrete da pergunta pendente ──────────────────────
    if (
      idade >= 7 * DIA &&
      idade < 10 * DIA &&
      !s.respostaBonus &&
      !s.lembreteDia7Em
    ) {
      try {
        await enviarLembreteDia7(s.email, s.id, s.perguntaPendente);
        await prisma.session.update({
          where: { id: s.id },
          data: { lembreteDia7Em: new Date() },
        });
        resultado.lembretesDia7 += 1;
      } catch (err) {
        console.error(`[cron] Falha no lembrete dia 7 da sessão ${s.id}:`, err);
      }
    }
  }

  return resultado;
}
