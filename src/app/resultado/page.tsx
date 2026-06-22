"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { emojiDoIcone } from "@/lib/icones";
import type { Profile } from "@/lib/types";
import { getResultado, finalizarQuiz, obterCarta1 } from "../actions";
import { ApagarDados } from "../ApagarDados";

function Dimensoes({ dimensoes }: { dimensoes: Record<string, number> }) {
  const entradas = Object.entries(dimensoes);
  if (entradas.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {entradas.map(([nome, valorRaw]) => {
        const valor = Math.max(0, Math.min(100, Number(valorRaw) || 0));
        return (
          <div key={nome}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-creme">{nome}</span>
              <span className="text-roxo">{valor}</span>
            </div>
            <div className="h-2 rounded-full bg-roxo/15 overflow-hidden">
              <div
                className="h-full bg-roxo transition-all duration-700"
                style={{ width: `${valor}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Mostra os primeiros N palavras do texto. */
function primeirasNPalavras(texto: string, n: number): string {
  return texto.split(/\s+/).slice(0, n).join(" ");
}

function CartaCortada({
  sessionId,
  carta,
}: {
  sessionId: string;
  carta: string;
}) {
  const router = useRouter();
  const preview = primeirasNPalavras(carta, 70);

  return (
    <section className="rounded-2xl border border-roxo/25 bg-fundo-suave p-5">
      <p className="text-roxo text-xs tracking-[0.2em] uppercase mb-3">
        Carta 1 · Bússola
      </p>
      <div className="relative">
        <p className="text-creme/90 text-sm leading-relaxed whitespace-pre-line">
          {preview}…
        </p>
        {/* fade gradient over the cut */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-fundo-suave to-transparent" />
      </div>
      <div className="mt-5 flex flex-col gap-3">
        <p className="text-creme-suave/70 text-xs text-center">
          Sua carta completa revela o padrão que atravessa todas as suas
          respostas — com as suas próprias palavras.
        </p>
        <button
          onClick={() => router.push(`/checkout?session=${sessionId}`)}
          className="w-full rounded-full bg-roxo py-3 text-fundo font-semibold text-sm"
        >
          Ler minha carta completa · R$ 9,90
        </button>
      </div>
    </section>
  );
}

function CartaCompleta({ carta }: { carta: string }) {
  return (
    <section className="rounded-2xl border border-roxo/25 bg-fundo-suave p-6">
      <p className="text-roxo text-xs tracking-[0.2em] uppercase mb-4">
        Carta 1 · Bússola
      </p>
      <p className="text-creme/90 text-base leading-7 whitespace-pre-line">
        {carta}
      </p>
    </section>
  );
}

function ResultadoInterno() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session");
  const aguardandoPagamento = params.get("pago") === "1";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [carta, setCarta] = useState<string | null>(null);
  const [carregandoCarta, setCarregandoCarta] = useState(false);
  const [falhaCarta, setFalhaCarta] = useState(false);
  const [pago, setPago] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Garante que a geração da carta dispare uma única vez (sem auto-cancelar).
  const cartaSolicitada = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      setErro("Sessão não encontrada.");
      setCarregando(false);
      return;
    }
    let cancelado = false;
    let tentativas = 0;

    async function carregar() {
      try {
        const data = await getResultado(sessionId!);
        if (cancelado) return;

        if (!data.profile) {
          try {
            const p = await finalizarQuiz(sessionId!);
            if (!cancelado) {
              setProfile(p);
              setPago(data.paid);
              setCarregando(false);
            }
            return;
          } catch {
            if (!cancelado) {
              router.replace(`/quiz?session=${sessionId}`);
            }
            return;
          }
        }

        setProfile(data.profile);
        setPago(data.paid);
        setCarta(data.carta1);
        setCarregando(false);

        if (aguardandoPagamento && !data.paid && tentativas < 5) {
          tentativas += 1;
          setTimeout(carregar, 2500);
        }
      } catch {
        if (!cancelado) {
          setErro("Não foi possível carregar seu resultado.");
          setCarregando(false);
        }
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [sessionId, router, aguardandoPagamento]);

  // Gera a carta automaticamente depois que o perfil estiver disponível.
  // Dispara só uma vez (guarda por ref) e NÃO se auto-cancela: a requisição
  // da IA pode levar dezenas de segundos e não deve ser abortada por re-render.
  useEffect(() => {
    if (!sessionId || !profile || carta !== null || cartaSolicitada.current) {
      return;
    }
    cartaSolicitada.current = true;
    setCarregandoCarta(true);
    setFalhaCarta(false);
    obterCarta1(sessionId)
      .then((c) => setCarta(c))
      .catch((err) => {
        console.error("[resultado] Falha ao gerar a carta:", err);
        setFalhaCarta(true);
      })
      .finally(() => setCarregandoCarta(false));
  }, [sessionId, profile, carta]);

  function tentarCartaNovamente() {
    cartaSolicitada.current = false;
    setFalhaCarta(false);
    // Força o efeito a rodar de novo zerando o estado de carta.
    setCarta(null);
  }

  if (carregando) {
    return (
      <main className="app-shell justify-center text-center">
        <p className="text-creme-suave/60 pulse-soft">
          Revelando seu perfil…
        </p>
      </main>
    );
  }

  if (erro || !profile || !sessionId) {
    return (
      <main className="app-shell justify-center text-center">
        <p className="text-red-300 mb-6">{erro ?? "Resultado indisponível."}</p>
        <button onClick={() => router.push("/")} className="text-roxo underline">
          Voltar ao início
        </button>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="fade-in flex flex-col gap-7">
        {/* Arquétipo */}
        <section className="text-center pt-2">
          <div className="text-6xl mb-3">{emojiDoIcone(profile.icone)}</div>
          <p className="text-roxo text-xs tracking-[0.2em] uppercase mb-2">
            Seu arquétipo
          </p>
          <h1 className="text-3xl text-creme mb-4">{profile.arquetipo}</h1>
          <p className="text-creme-suave text-base leading-relaxed">
            {profile.frase}
          </p>
        </section>

        {/* Dimensões */}
        <section>
          <h2 className="font-titulo text-xl text-creme mb-4">
            Suas dimensões
          </h2>
          <Dimensoes dimensoes={profile.dimensoes} />
        </section>

        {/* Ativos (sempre liberado) */}
        <section className="rounded-2xl border border-roxo/25 bg-fundo-suave p-5">
          <h2 className="font-titulo text-lg text-creme mb-2">
            Suas forças invisíveis
          </h2>
          <p className="text-creme-suave/90 text-sm leading-relaxed">
            {profile.ativos}
          </p>
        </section>

        {/* Carta 1 */}
        {carregandoCarta && !carta ? (
          <section className="rounded-2xl border border-roxo/25 bg-fundo-suave p-5">
            <p className="text-roxo text-xs tracking-[0.2em] uppercase mb-3">
              Carta 1 · Bússola
            </p>
            <p className="text-creme/40 text-sm pulse-soft">
              Escrevendo sua carta…
            </p>
          </section>
        ) : carta ? (
          pago ? (
            <CartaCompleta carta={carta} />
          ) : (
            <CartaCortada sessionId={sessionId} carta={carta} />
          )
        ) : falhaCarta ? (
          <section className="rounded-2xl border border-roxo/25 bg-fundo-suave p-5 text-center">
            <p className="text-roxo text-xs tracking-[0.2em] uppercase mb-3">
              Carta 1 · Bússola
            </p>
            <p className="text-creme-suave/70 text-sm mb-4">
              Não conseguimos escrever sua carta agora. Foi um soluço
              momentâneo.
            </p>
            <button
              onClick={tentarCartaNovamente}
              className="rounded-full bg-roxo px-6 py-2.5 text-fundo font-semibold text-sm"
            >
              Tentar novamente
            </button>
          </section>
        ) : null}

        <div className="pt-4 pb-2 text-center">
          <ApagarDados sessionId={sessionId} />
        </div>
      </div>
    </main>
  );
}

export default function ResultadoPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell justify-center text-center">
          <p className="text-creme-suave/60 pulse-soft">Carregando…</p>
        </main>
      }
    >
      <ResultadoInterno />
    </Suspense>
  );
}
