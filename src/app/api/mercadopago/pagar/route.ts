import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarPagamento } from "@/lib/mercadopago";
import { processarPagamentoConfirmado } from "@/lib/bonus";

export const dynamic = "force-dynamic";

/**
 * Cria o pagamento do Checkout Transparente (Payment Brick). Recebe o
 * `formData` gerado pelo Brick no navegador (cartão ou PIX), cria o pagamento
 * no Mercado Pago e, se aprovado na hora (cartão), já marca a sessão como paga
 * e dispara a Carta 1. Para PIX, devolve o QR Code e o webhook confirma depois.
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, email, formData } = (await req.json()) as {
      sessionId?: string;
      email?: string;
      formData?: Record<string, unknown>;
    };

    if (!sessionId || !formData) {
      return NextResponse.json(
        { ok: false, erro: "Dados de pagamento incompletos." },
        { status: 400 },
      );
    }

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json(
        { ok: false, erro: "Sessão não encontrada." },
        { status: 404 },
      );
    }

    // Garante o e-mail na sessão (para enviar a Carta 1 por e-mail).
    const emailLimpo = (email ?? session.email ?? "").trim().toLowerCase();
    if (emailLimpo && emailLimpo !== session.email) {
      await prisma.session.update({
        where: { id: sessionId },
        data: { email: emailLimpo },
      });
    }

    const resultado = await criarPagamento(sessionId, formData);

    // Cartão aprovado na hora: marca como pago e dispara a Carta 1.
    if (resultado.status === "approved") {
      await prisma.session.updateMany({
        where: { id: sessionId, paidAt: null },
        data: { paidAt: new Date() },
      });
      await processarPagamentoConfirmado(sessionId);
    }

    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    console.error("[pagar] Falha ao criar pagamento:", err);
    return NextResponse.json(
      { ok: false, erro: "Não foi possível processar o pagamento." },
      { status: 500 },
    );
  }
}
