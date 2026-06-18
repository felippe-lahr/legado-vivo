import { Resend } from "resend";

let client: Resend | null = null;
function getClient(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY não configurado.");
    client = new Resend(key);
  }
  return client;
}

function from(): string {
  return process.env.FROM_EMAIL ?? "Meu Legado Vivo <onboarding@resend.dev>";
}

export function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

const FUNDO = "#1C1728";
const ROXO = "#BAA2FF";
const CREME = "#FAF8F4";

/** Quebra um texto corrido em parágrafos <p> para o e-mail. */
function paragrafos(texto: string): string {
  return texto
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:${CREME};">${escapar(
          p,
        )}</p>`,
    )
    .join("");
}

function escapar(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Monta o HTML base de uma carta/e-mail. */
function layout(conteudo: string): string {
  return `<!doctype html>
<html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${FUNDO};">
  <div style="max-width:560px;margin:0 auto;padding:40px 28px;">
    <p style="font-family:Georgia,serif;font-size:22px;color:${ROXO};margin:0 0 28px;letter-spacing:0.5px;">Meu Legado Vivo</p>
    ${conteudo}
    <p style="margin:36px 0 0;font-size:12px;color:#8a8398;line-height:1.6;">
      Esta mensagem é só sua. Ninguém mais a recebeu.
    </p>
  </div>
</body></html>`;
}

/** Envia a Carta 1 (Bússola) por e-mail após o pagamento. */
export async function enviarCarta1(
  email: string,
  carta: string,
): Promise<void> {
  const html = layout(`
    <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${ROXO};margin:0 0 20px;">Sua Carta 1 · Bússola</p>
    ${paragrafos(carta)}
  `);
  await getClient().emails.send({
    from: from(),
    to: email,
    subject: "A carta que você nunca recebeu",
    html,
  });
}

/** Lembrete do dia 7: convida a pessoa a responder a pergunta pendente. */
export async function enviarLembreteDia7(
  email: string,
  sessionId: string,
  pergunta: string,
): Promise<void> {
  const link = `${baseUrl()}/responder?session=${sessionId}`;
  const html = layout(`
    <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${ROXO};margin:0 0 20px;">Sua bússola está te esperando</p>
    <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:${CREME};">Há alguns dias eu te deixei uma pergunta:</p>
    <p style="margin:0 0 24px;font-size:18px;line-height:1.6;color:${ROXO};font-family:Georgia,serif;">“${escapar(
      pergunta,
    )}”</p>
    <p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:${CREME};">Não para te cobrar nada — só porque quero saber o que você fez com ela.</p>
    <a href="${link}" style="display:inline-block;background:${ROXO};color:${FUNDO};text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px;font-size:15px;">Responder agora</a>
  `);
  await getClient().emails.send({
    from: from(),
    to: email,
    subject: "Sua bússola está te esperando",
    html,
  });
}

/** Envia a Carta 2 (A Carta de Volta) no dia 10, se a pessoa respondeu. */
export async function enviarCarta2(
  email: string,
  carta: string,
): Promise<void> {
  const html = layout(`
    <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${ROXO};margin:0 0 20px;">Sua Carta 2 · A Carta de Volta</p>
    ${paragrafos(carta)}
  `);
  await getClient().emails.send({
    from: from(),
    to: email,
    subject: "A carta de volta",
    html,
  });
}

/** Lembrete final gentil (dia 10) para quem não respondeu. Único, sem insistência. */
export async function enviarLembreteFinal(
  email: string,
  sessionId: string,
  pergunta: string,
): Promise<void> {
  const link = `${baseUrl()}/responder?session=${sessionId}`;
  const html = layout(`
    <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:${CREME};">A pergunta ainda está aqui, caso você queira:</p>
    <p style="margin:0 0 24px;font-size:18px;line-height:1.6;color:${ROXO};font-family:Georgia,serif;">“${escapar(
      pergunta,
    )}”</p>
    <p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:${CREME};">Sem pressa e sem cobrança. Se um dia bater vontade de responder, é só por aqui.</p>
    <a href="${link}" style="display:inline-block;background:${ROXO};color:${FUNDO};text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px;font-size:15px;">Responder</a>
  `);
  await getClient().emails.send({
    from: from(),
    to: email,
    subject: "A pergunta ainda está aqui",
    html,
  });
}
