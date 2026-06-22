"use client";

import { Suspense, useState } from "react";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { iniciarCheckout } from "../actions";

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;

interface MercadoPagoCheckout {
  open: () => void;
}
interface MercadoPagoInstance {
  checkout: (opts: { preference: { id: string } }) => MercadoPagoCheckout;
}
declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: { locale?: string },
    ) => MercadoPagoInstance;
  }
}

function CheckoutInterno() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session");
  const erroPagamento = params.get("erro") === "1";

  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function pagar() {
    if (!sessionId || !emailValido) return;
    setEnviando(true);
    setErro(null);
    try {
      const { preferenceId, initPoint } = await iniciarCheckout(sessionId, email);

      // Tenta abrir o checkout como modal (lightbox), mantendo o usuário no
      // site. Se o SDK ou a chave pública não estiverem disponíveis, cai para
      // o redirect tradicional — a venda nunca trava.
      if (MP_PUBLIC_KEY && typeof window !== "undefined" && window.MercadoPago) {
        try {
          const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
          mp.checkout({ preference: { id: preferenceId } }).open();
          setEnviando(false);
          return;
        } catch (e) {
          console.error("[checkout] Falha ao abrir modal, usando redirect:", e);
        }
      }

      window.location.href = initPoint;
    } catch {
      setErro(
        "Não foi possível abrir o pagamento agora. Verifique seu e-mail e tente novamente.",
      );
      setEnviando(false);
    }
  }

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

  return (
    <main className="app-shell justify-center">
      <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" />
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
            Pagamento único e seguro via Mercado Pago.
          </p>
        </div>

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

        {erroPagamento && (
          <p className="text-amber-300 text-sm mb-3">
            O pagamento anterior não foi concluído. Você pode tentar de novo.
          </p>
        )}
        {erro && <p className="text-red-300 text-sm mb-3">{erro}</p>}

        <button
          onClick={pagar}
          disabled={!emailValido || enviando}
          className="w-full rounded-full bg-roxo py-3.5 text-fundo font-semibold text-base transition active:scale-[0.99] disabled:opacity-40"
        >
          {enviando ? "Abrindo pagamento…" : "Pagar R$ 9,90 e desbloquear"}
        </button>

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
