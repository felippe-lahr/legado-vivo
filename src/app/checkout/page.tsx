"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { salvarEmailCheckout } from "../actions";

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;

interface BrickController {
  unmount: () => void;
}
interface BricksBuilder {
  create: (
    brick: string,
    container: string,
    settings: unknown,
  ) => Promise<BrickController>;
}
interface MercadoPagoInstance {
  bricks: () => BricksBuilder;
}
declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: { locale?: string },
    ) => MercadoPagoInstance;
  }
}

interface PixData {
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
}

function SelosConfianca() {
  return (
    <div className="mt-6 border-t border-roxo/15 pt-5">
      <div className="flex items-center justify-center gap-2 mb-3">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <rect
            x="4"
            y="10"
            width="16"
            height="11"
            rx="2"
            stroke="#9DE39D"
            strokeWidth="1.8"
          />
          <path
            d="M8 10V7a4 4 0 0 1 8 0v3"
            stroke="#9DE39D"
            strokeWidth="1.8"
          />
        </svg>
        <span className="text-[#9DE39D] text-xs font-semibold tracking-wide">
          Pagamento 100% seguro
        </span>
      </div>
      <p className="text-creme-suave/50 text-xs text-center leading-relaxed mb-4">
        Seus dados são criptografados (SSL) e processados com padrão de
        segurança PCI. Não armazenamos os dados do seu cartão.
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5">
          <span className="text-[#666] text-[11px]">Processado por</span>
          <span className="text-[#00a3e0] text-[12px] font-extrabold tracking-tight">
            Mercado Pago
          </span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-fundo px-3 py-1.5 border border-roxo/15 text-creme-suave/60 text-[11px] font-semibold">
          SSL
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-fundo px-3 py-1.5 border border-roxo/15 text-creme-suave/60 text-[11px] font-semibold">
          PCI DSS
        </span>
      </div>
    </div>
  );
}

function CheckoutInterno() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session");

  const [email, setEmail] = useState("");
  const [etapa, setEtapa] = useState<"email" | "pagamento">("email");
  const [salvando, setSalvando] = useState(false);
  const [sdkPronto, setSdkPronto] = useState(false);
  const [pix, setPix] = useState<PixData | null>(null);
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const brickCriado = useRef(false);

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function continuar() {
    if (!sessionId || !emailValido) return;
    setSalvando(true);
    setErro(null);
    try {
      await salvarEmailCheckout(sessionId, email);
      setEtapa("pagamento");
    } catch {
      setErro("Não foi possível continuar. Verifique seu e-mail.");
    } finally {
      setSalvando(false);
    }
  }

  // Monta o Payment Brick quando a etapa de pagamento começa e o SDK carregou.
  useEffect(() => {
    if (etapa !== "pagamento" || !sdkPronto || brickCriado.current) return;
    if (!MP_PUBLIC_KEY || !window.MercadoPago || !sessionId) {
      setErro("Pagamento indisponível no momento.");
      return;
    }
    brickCriado.current = true;

    const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
    const bricks = mp.bricks();

    bricks
      .create("payment", "payment_brick_container", {
        initialization: {
          amount: 9.9,
          payer: { email: email.trim().toLowerCase() },
        },
        customization: {
          visual: { style: { theme: "dark" } },
          paymentMethods: {
            creditCard: "all",
            debitCard: "all",
            bankTransfer: "all", // PIX
            maxInstallments: 1,
          },
        },
        callbacks: {
          onReady: () => {},
          onError: (error: unknown) => {
            console.error("[brick] erro:", error);
          },
          onSubmit: ({ formData }: { formData: Record<string, unknown> }) => {
            return fetch("/api/mercadopago/pagar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId,
                email: email.trim().toLowerCase(),
                formData,
              }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (!data.ok) throw new Error(data.erro || "Falha no pagamento.");
                if (data.status === "approved") {
                  router.push(`/resultado?session=${sessionId}&pago=1`);
                  return;
                }
                if (data.pix?.qrCodeBase64 || data.pix?.qrCode) {
                  setPix(data.pix);
                  return;
                }
                if (data.status === "in_process" || data.status === "pending") {
                  setPendente(true);
                  return;
                }
                throw new Error("Pagamento não aprovado.");
              });
          },
        },
      })
      .catch((e) => {
        console.error("[brick] falha ao montar:", e);
        setErro("Não foi possível carregar o pagamento. Recarregue a página.");
      });
  }, [etapa, sdkPronto, email, sessionId, router]);

  if (!sessionId) {
    return (
      <main className="app-shell justify-center text-center">
        <p className="text-red-300 mb-6">Sessão não encontrada.</p>
        <button onClick={() => router.push("/")} className="text-roxo underline">
          Voltar ao início
        </button>
      </main>
    );
  }

  // ── Tela de PIX gerado ───────────────────────────────────────────
  if (pix) {
    return (
      <main className="app-shell justify-center text-center">
        <div className="fade-in">
          <h1 className="text-2xl text-creme mb-3">Quase lá!</h1>
          <p className="text-creme-suave/80 text-sm mb-5">
            Escaneie o QR Code abaixo no app do seu banco. Assim que o PIX for
            confirmado, liberamos seu acesso e enviamos por e-mail.
          </p>
          {pix.qrCodeBase64 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/png;base64,${pix.qrCodeBase64}`}
              alt="QR Code do PIX"
              width={220}
              height={220}
              className="mx-auto rounded-2xl bg-white p-3"
            />
          )}
          {pix.qrCode && (
            <div className="mt-5">
              <p className="text-creme-suave/60 text-xs mb-2">
                Ou copie o código PIX:
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(pix.qrCode!)}
                className="w-full rounded-2xl border border-roxo/30 bg-fundo-suave p-3 text-creme-suave/80 text-xs break-all"
              >
                {pix.qrCode}
                <span className="block mt-2 text-roxo">Toque para copiar</span>
              </button>
            </div>
          )}
          <button
            onClick={() => router.push(`/resultado?session=${sessionId}`)}
            className="w-full text-center text-creme-suave/60 text-sm mt-6 underline"
          >
            Já paguei — ver meu resultado
          </button>
        </div>
      </main>
    );
  }

  // ── Tela de pagamento pendente (sem PIX, ex: em análise) ──────────
  if (pendente) {
    return (
      <main className="app-shell justify-center text-center">
        <div className="fade-in">
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-2xl text-creme mb-3">Pagamento em análise</h1>
          <p className="text-creme-suave/80 text-sm">
            Estamos confirmando seu pagamento. Assim que for aprovado, você
            recebe o acesso por e-mail. Pode levar alguns minutos.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell justify-center">
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onLoad={() => setSdkPronto(true)}
        onReady={() => setSdkPronto(true)}
      />
      <div className="fade-in">
        <p className="text-roxo text-xs tracking-[0.2em] uppercase mb-3">
          Perfil completo
        </p>
        <h1 className="text-3xl text-creme mb-5">
          Desbloqueie tudo que você revelou.
        </h1>

        <ul className="flex flex-col gap-2.5 mb-7">
          {[
            "O padrão que silenciosamente te limita",
            "3 ações concretas para os próximos 30 dias",
            "A pergunta feita sob medida para você",
            "Acesso permanente ao seu perfil",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm">
              <span className="text-roxo mt-0.5">✦</span>
              <span className="text-creme-suave/90">{item}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-2xl border border-roxo/25 bg-fundo-suave p-5 mb-6">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-creme-suave/80 text-sm">Investimento</span>
            <span className="font-titulo text-2xl text-creme">R$ 9,90</span>
          </div>
          <p className="text-creme-suave/50 text-xs">
            Pagamento único. Cartão ou PIX.
          </p>
        </div>

        {etapa === "email" && (
          <>
            <label className="block text-creme-suave/80 text-sm mb-2">
              Para onde enviamos seu acesso?
            </label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-2xl border border-roxo/25 bg-fundo-suave p-4 text-creme placeholder:text-creme-suave/35 mb-4 focus:border-roxo/70 transition"
            />
            {erro && <p className="text-red-300 text-sm mb-3">{erro}</p>}
            <button
              onClick={continuar}
              disabled={!emailValido || salvando}
              className="w-full rounded-full bg-roxo py-3.5 text-fundo font-semibold text-base transition active:scale-[0.99] disabled:opacity-40"
            >
              {salvando ? "Carregando…" : "Continuar para o pagamento"}
            </button>
          </>
        )}

        {etapa === "pagamento" && (
          <>
            <p className="text-creme-suave/70 text-xs mb-3">
              Enviaremos o acesso para <strong>{email.trim()}</strong>.{" "}
              <button
                onClick={() => {
                  setEtapa("email");
                  brickCriado.current = false;
                }}
                className="text-roxo underline"
              >
                alterar
              </button>
            </p>
            <div id="payment_brick_container" />
            {erro && <p className="text-red-300 text-sm mt-3">{erro}</p>}
          </>
        )}

        <SelosConfianca />

        <button
          onClick={() => router.push(`/resultado?session=${sessionId}`)}
          className="w-full text-center text-creme-suave/60 text-sm mt-4 underline"
        >
          Voltar ao meu resultado
        </button>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell justify-center text-center">
          <p className="text-creme-suave/60 pulse-soft">Carregando…</p>
        </main>
      }
    >
      <CheckoutInterno />
    </Suspense>
  );
}
