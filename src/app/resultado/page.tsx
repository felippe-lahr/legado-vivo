"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { emojiDoIcone } from "@/lib/icones";
import type { Profile } from "@/lib/types";
import { getResultado, finalizarQuiz } from "../actions";
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

function Bloqueado({
  sessionId,
  titulo,
}: {
  sessionId: string;
  titulo: string;
}) {
  const router = useRouter();
  return (
    <div className="relative rounded-2xl border border-roxo/25 bg-fundo-suave p-5 overflow-hidden">
      <div className="blur-[6px] select-none pointer-events-none">
        <h3 className="font-titulo text-lg text-creme mb-2">{titulo}</h3>
        <p className="text-creme-suave/80 text-sm">
          Conteúdo reservado para o seu perfil completo. Aqui revelamos seus
          talentos invisíveis, o padrão que te limita e os próximos passos.
        </p>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-fundo/40 px-4 text-center">
        <span className="text-2xl">🔒</span>
        <button
          onClick={() => router.push(`/checkout?session=${sessionId}`)}
          className="rounded-full bg-roxo px-6 py-2.5 text-fundo font-semibold text-sm"
        >
          Desbloquear por R$ 9,90
        </button>
      </div>
    </div>
  );
}

function ResultadoInterno() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session");
  const aguardandoPagamento = params.get("pago") === "1";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [pago, setPago] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

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
          // Tenta finalizar o quiz (gera o perfil) caso ainda não exista.
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
        setCarregando(false);

        // Se voltou do Mercado Pago mas o webhook ainda não confirmou,
        // tenta novamente algumas vezes.
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

        {/* Ativos (insight liberado) */}
        <section className="rounded-2xl border border-roxo/25 bg-fundo-suave p-5">
          <h2 className="font-titulo text-lg text-creme mb-2">
            Suas forças invisíveis
          </h2>
          <p className="text-creme-suave/90 text-sm leading-relaxed">
            {profile.ativos}
          </p>
        </section>

        {/* Conteúdo premium */}
        {pago ? (
          <>
            <section className="rounded-2xl border border-roxo/25 bg-fundo-suave p-5">
              <h2 className="font-titulo text-lg text-creme mb-2">
                O padrão que te limita
              </h2>
              <p className="text-creme-suave/90 text-sm leading-relaxed">
                {profile.risco}
              </p>
            </section>

            <section>
              <h2 className="font-titulo text-xl text-creme mb-4">
                Seus próximos 30 dias
              </h2>
              <ol className="flex flex-col gap-3">
                {profile.acoes.map((acao, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-2xl border border-roxo/20 bg-fundo-suave p-4"
                  >
                    <span className="text-roxo font-titulo text-lg leading-none">
                      {i + 1}
                    </span>
                    <span className="text-creme-suave/90 text-sm">{acao}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="text-center py-4">
              <p className="text-roxo text-xs tracking-[0.2em] uppercase mb-3">
                Uma pergunta para carregar
              </p>
              <p className="font-titulo text-xl text-creme leading-snug">
                “{profile.pergunta_final_reflexao}”
              </p>
            </section>
          </>
        ) : (
          <>
            <p className="text-center text-creme-suave/80 text-sm">
              Você viu o começo. O seu perfil completo revela o padrão que te
              limita, suas 3 ações para os próximos 30 dias e a pergunta feita
              sob medida para você.
            </p>
            <Bloqueado sessionId={sessionId} titulo="O padrão que te limita" />
            <Bloqueado sessionId={sessionId} titulo="Seus próximos 30 dias" />
            <button
              onClick={() => router.push(`/checkout?session=${sessionId}`)}
              className="w-full rounded-full bg-roxo py-3.5 text-fundo font-semibold text-base"
            >
              Desbloquear meu perfil completo · R$ 9,90
            </button>
          </>
        )}

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
