import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const PRECO = 9.9;

function getConfig(): MercadoPagoConfig {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
  }
  return new MercadoPagoConfig({ accessToken });
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

/**
 * Cria uma preferência de pagamento de R$ 9,90 para a sessão e retorna a URL
 * de checkout do Mercado Pago (init_point).
 */
export async function criarPreferencia(
  sessionId: string,
  email: string,
): Promise<string> {
  const preference = new Preference(getConfig());

  let result;
  try {
    result = await preference.create({
      body: {
        items: [
          {
            id: `legado-vivo-${sessionId}`,
            title: "Meu Legado Vivo — Seu perfil completo",
            description: "Diagnóstico completo: arquétipo, dimensões e ações.",
            quantity: 1,
            unit_price: PRECO,
            currency_id: "BRL",
          },
        ],
        payer: { email },
        external_reference: sessionId,
        back_urls: {
          success: `${baseUrl()}/resultado?session=${sessionId}&pago=1`,
          pending: `${baseUrl()}/resultado?session=${sessionId}`,
          failure: `${baseUrl()}/checkout?session=${sessionId}&erro=1`,
        },
        auto_return: "approved",
        notification_url: `${baseUrl()}/api/mercadopago/webhook`,
      },
    });
  } catch (err) {
    console.error("[criarPreferencia] Falha no Mercado Pago:", err);
    throw err;
  }

  const url = result.init_point ?? result.sandbox_init_point;
  if (!url) throw new Error("Mercado Pago não retornou a URL de checkout.");
  return url;
}

/**
 * Consulta um pagamento pelo id e retorna o status e a referência externa
 * (sessionId). Usado pelo webhook para confirmar o pagamento.
 */
export async function consultarPagamento(
  paymentId: string,
): Promise<{ status: string | undefined; sessionId: string | undefined }> {
  const payment = new Payment(getConfig());
  const result = await payment.get({ id: paymentId });
  return {
    status: result.status,
    sessionId: result.external_reference,
  };
}
