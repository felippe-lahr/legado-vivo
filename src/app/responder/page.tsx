"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getRespostaBonusState, salvarRespostaBonus } from "../actions";

function ResponderInterno() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session");

  const [pergunta, setPergunta] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [jaRespondeu, setJaRespondeu] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setErro("Link inválido.");
      setCarregando(false);
      return;
    }
    let cancelado = false;
    getRespostaBonusState(sessionId)
      .then((data) => {
        if (cancelado) return;
        if (!data.pergunta) {
          setErro("Esta pergunta ainda não está disponível.");
        } else {
          setPergunta(data.pergunta);
          setJaRespondeu(data.jaRespondeu);
        }
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar a pergunta.");
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [sessionId]);

  async function enviar() {
    if (!sessionId || !resposta.trim()) return;
    setEnviando(true);
    setErro(null);
    try {
      await salvarRespostaBonus(sessionId, resposta);
      setEnviado(true);
    } catch {
      setErro("Algo deu errado ao enviar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <main className="app-shell justify-center text-center">
        <p className="text-creme-suave/60 pulse-soft">Carregando…</p>
      </main>
    );
  }

  if (erro && !pergunta) {
    return (
      <main className="app-shell justify-center text-center">
        <p className="text-red-300 mb-6">{erro}</p>
        <button onClick={() => router.push("/")} className="text-roxo underline">
          Voltar ao início
        </button>
      </main>
    );
  }

  if (enviado || jaRespondeu) {
    return (
      <main className="app-shell justify-center text-center">
        <div className="fade-in">
          <div className="text-5xl mb-6">✶</div>
          <h1 className="text-2xl text-creme mb-3">Recebido. Obrigado.</h1>
          <p className="text-creme-suave/80 text-sm leading-relaxed">
            Em alguns dias você vai receber a carta de volta — uma reação ao que
            você acabou de escrever. Fique de olho no seu e-mail.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="fade-in flex flex-col flex-1">
        <p className="text-roxo text-xs tracking-[0.2em] uppercase mb-4">
          Sua bússola está te esperando
        </p>
        <p className="text-creme-suave text-sm mb-3">
          Há alguns dias eu te deixei esta pergunta. Não para te cobrar nada —
          só porque quero saber o que você fez com ela.
        </p>
        <h1 className="font-titulo text-2xl text-creme mb-6 leading-snug">
          “{pergunta}”
        </h1>

        <textarea
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          placeholder="Escreva com calma. Não existe resposta certa."
          rows={8}
          autoFocus
          className="w-full rounded-2xl border border-roxo/25 bg-fundo-suave p-4 text-creme placeholder:text-creme-suave/35 text-base resize-none focus:border-roxo/70 transition"
        />

        {erro && <p className="text-red-300 text-sm mt-3">{erro}</p>}

        <div className="mt-auto pt-6">
          <button
            onClick={enviar}
            disabled={enviando || !resposta.trim()}
            className="w-full rounded-full bg-roxo py-3.5 text-fundo font-semibold text-base transition active:scale-[0.99] disabled:opacity-40"
          >
            {enviando ? "Enviando…" : "Enviar minha resposta"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ResponderPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell justify-center text-center">
          <p className="text-creme-suave/60 pulse-soft">Carregando…</p>
        </main>
      }
    >
      <ResponderInterno />
    </Suspense>
  );
}
