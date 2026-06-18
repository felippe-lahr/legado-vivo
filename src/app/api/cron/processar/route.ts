import { NextRequest, NextResponse } from "next/server";
import { processarCronBonus } from "@/lib/bonus";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Endpoint disparado pelo cron do Railway (1x ao dia). Processa o bônus de
 * 10 dias: lembretes do dia 7, Carta 2 e lembrete final no dia 10.
 *
 * Protegido por um segredo compartilhado (header `x-cron-secret`).
 */
async function handler(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    return NextResponse.json(
      { ok: false, erro: "CRON_SECRET não configurado." },
      { status: 500 },
    );
  }

  const enviado =
    req.headers.get("x-cron-secret") ??
    req.nextUrl.searchParams.get("secret") ??
    "";
  if (enviado !== segredo) {
    return NextResponse.json({ ok: false, erro: "Não autorizado." }, { status: 401 });
  }

  try {
    const resultado = await processarCronBonus();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    console.error("[cron] Falha ao processar bônus:", err);
    return NextResponse.json({ ok: false, erro: "Falha interna." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handler(req);
}

export async function GET(req: NextRequest) {
  return handler(req);
}
