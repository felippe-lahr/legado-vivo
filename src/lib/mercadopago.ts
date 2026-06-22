import { MercadoPagoConfig, Payment } from "mercadopago";

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

export interface ResultadoPagamento {
  status: string | undefined;
  statusDetail: string | undefined;
  id: number | undefined;
  /** Dados do PIX/boleto quando o pagamento fica pendente. */
  pix?: { qrCode?: string; qrCodeBase64?: string; ticketUrl?: string };
}

/**
 * Cria um pagamento (Checkout Transparente / Payment Brick) a partir do
 * `formData` gerado no navegador pelo Brick. Funciona para cartão e PIX.
 * O valor é fixado no servidor (R$ 9,90) por segurança.
 */
export async function criarPagamento(
  sessionId: string,
  formData: Record<string, unknown>,
): Promise<ResultadoPagamento> {
  const payment = new Payment(getConfig());

  const body = {
    ...formData,
    transaction_amount: PRECO,
    external_reference: sessionId,
    notification_url: `${baseUrl()}/api/mercadopago/webhook`,
  };

  let result;
  try {
    result = await payment.create({
      body,
    } as Parameters<Payment["create"]>[0]);
  } catch (err) {
    console.error("[criarPagamento] Falha no Mercado Pago:", err);
    throw err;
  }

  const tx = result.point_of_interaction?.transaction_data;
  return {
    status: result.status,
    statusDetail: result.status_detail,
    id: result.id,
    pix: tx
      ? {
          qrCode: tx.qr_code,
          qrCodeBase64: tx.qr_code_base64,
          ticketUrl: tx.ticket_url,
        }
      : undefined,
  };
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
