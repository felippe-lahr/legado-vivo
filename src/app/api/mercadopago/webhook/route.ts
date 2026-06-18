import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consultarPagamento } from "@/lib/mercadopago";
import { processarPagamentoConfirmado } from "@/lib/bonus";

export const dynamic = "force-dynamic";

/**
 * Webhook do Mercado Pago. Recebe a notificação de pagamento, consulta o
 * status e, se aprovado, marca a sessão como paga (`paid_at`).
 */
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    let paymentId =
      url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? null;
    const tipo = url.searchParams.get("type") ?? url.searchParams.get("topic");

    // O corpo também pode trazer os dados da notificação.
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }
    if (!paymentId && body && typeof body === "object") {
      const b = body as { type?: string; data?: { id?: string } };
      if ((b.type === "payment" || !tipo) && b.data?.id) {
        paymentId = b.data.id;
      }
    }

    if (!paymentId) {
      // Nada a fazer (pode ser um ping de teste). Responde 200 para o MP.
      return NextResponse.json({ received: true });
    }

    const { status, sessionId } = await consultarPagamento(paymentId);

    if (status === "approved" && sessionId) {
      await prisma.session.updateMany({
        where: { id: sessionId, paidAt: null },
        data: { paidAt: new Date() },
      });
      // Gera a Carta 1 (se necessário), registra a pergunta pendente do bônus
      // e envia a Carta 1 por e-mail. Idempotente.
      await processarPagamentoConfirmado(sessionId);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Erro no webhook do Mercado Pago:", err);
    // Responde 200 mesmo em erro para evitar reentregas em loop do MP.
    return NextResponse.json({ received: true });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
