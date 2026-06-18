"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getFaixa, flattenPerguntas } from "@/lib/questions";
import { emojiDoIcone } from "@/lib/icones";
import type { Bloco, Faixa, PerguntaComBloco } from "@/lib/types";
import { getSessionState, obterPergunta, salvarResposta } from "../actions";
import { ApagarDados } from "../ApagarDados";

function ProgressoBlocos({
  faixa,
  numeroAtual,
}: {
  faixa: Faixa;
  numeroAtual: number;
}) {
  return (
    <div className="flex gap-2 mb-6">
      {faixa.blocos.map((bloco: Bloco) => {
        const numeros = bloco.perguntas.map((p) => p.numero);
        const tamanho = numeros.length;
        const respondidas = numeros.filter((n) => n < numeroAtual).length;
        const ativo = numeros.includes(numeroAtual);
        const ratio = Math.min(respondidas / tamanho, 1);
        return (
          <div key={bloco.id} className="flex-1">
            <div className="h-1.5 rounded-full bg-roxo/15 overflow-hidden">
              <div
                className="h-full bg-roxo transition-all duration-500"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
            <p
              className={`mt-1.5 text-[10px] tracking-wide text-center ${
                ativo ? "text-roxo" : "text-creme-suave/40"
              }`}
            >
              {bloco.titulo}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function QuizInterno() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session");

  const [faixa, setFaixa] = useState<Faixa | null>(null);
  const [perguntas, setPerguntas] = useState<PerguntaComBloco[]>([]);
  const [numeroAtual, setNumeroAtual] = useState(1);
  const [perguntaAtual, setPerguntaAtual] = useState<PerguntaComBloco | null>(
    null,
  );
  const [textoPergunta, setTextoPergunta] = useState("");
  const [resposta, setResposta] = useState("");
  const [carregandoPergunta, setCarregandoPergunta] = useState(true);
  const [falhaPergunta, setFalhaPergunta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const totalRef = useRef(0);

  // Carrega o texto da pergunta `numero` (fixa do JSON ou dinâmica via IA).
  const carregarPergunta = useCallback(
    async (lista: PerguntaComBloco[], numero: number) => {
      const pergunta = lista.find((p) => p.numero === numero) ?? null;
      setPerguntaAtual(pergunta);
      setResposta("");
      setErro(null);
      setFalhaPergunta(false);
      if (!pergunta || !sessionId) return;

      if (pergunta.tipo === "fixa" && pergunta.texto) {
        setTextoPergunta(pergunta.texto);
        setCarregandoPergunta(false);
        return;
      }

      // Pergunta dinâmica: limpa o texto anterior para não parecer repetição.
      setTextoPergunta("");
      setCarregandoPergunta(true);
      try {
        const texto = await obterPergunta(sessionId, numero);
        setTextoPergunta(texto);
        setFalhaPergunta(false);
      } catch {
        setFalhaPergunta(true);
      } finally {
        setCarregandoPergunta(false);
      }
    },
    [sessionId],
  );

  // Inicialização: descobre a faixa, retoma de onde parou.
  useEffect(() => {
    if (!sessionId) {
      setErro("Sessão não encontrada.");
      setCarregandoPergunta(false);
      return;
    }
    let cancelado = false;
    (async () => {
      try {
        const estado = await getSessionState(sessionId);
        const faixaData = getFaixa(estado.faixaId);
        if (!faixaData) throw new Error("Faixa inválida");
        const lista = flattenPerguntas(faixaData);
        totalRef.current = estado.total;
        if (cancelado) return;
        setFaixa(faixaData);
        setPerguntas(lista);

        if (estado.answers.length >= estado.total) {
          // Já respondeu tudo: vai direto para o resultado.
          router.replace(`/resultado?session=${sessionId}`);
          return;
        }
        const proximo = estado.answers.length + 1;
        setNumeroAtual(proximo);
        await carregarPergunta(lista, proximo);
      } catch {
        if (!cancelado) {
          setErro("Não foi possível carregar sua conversa.");
          setCarregandoPergunta(false);
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [sessionId, router, carregarPergunta]);

  async function continuar() {
    if (!sessionId || !perguntaAtual || !resposta.trim()) return;
    setEnviando(true);
    setErro(null);
    try {
      await salvarResposta(
        sessionId,
        numeroAtual,
        perguntaAtual.id,
        textoPergunta,
        resposta,
      );

      if (numeroAtual >= totalRef.current) {
        // A resposta já foi salva. A geração do perfil acontece na página de
        // resultado (que tem sua própria tela de carregamento e retry), então
        // navegamos sempre — mesmo que a IA demore.
        setFinalizando(true);
        router.push(`/resultado?session=${sessionId}`);
        return;
      }

      const proximo = numeroAtual + 1;
      setNumeroAtual(proximo);
      await carregarPergunta(perguntas, proximo);
    } catch {
      setErro("Algo deu errado ao salvar sua resposta. Tente novamente.");
      setFinalizando(false);
    } finally {
      setEnviando(false);
    }
  }

  if (finalizando) {
    return (
      <main className="app-shell justify-center text-center">
        <div className="fade-in">
          <div className="text-5xl mb-6 pulse-soft">✶</div>
          <h1 className="text-2xl text-creme mb-3">
            Estamos lendo o que você compartilhou…
          </h1>
          <p className="text-creme-suave/80 text-sm">
            Revelando seu arquétipo e o que você carrega sem perceber. Isso leva
            alguns segundos.
          </p>
        </div>
      </main>
    );
  }

  if (erro && !perguntaAtual) {
    return (
      <main className="app-shell justify-center text-center">
        <p className="text-red-300 mb-6">{erro}</p>
        <button
          onClick={() => router.push("/")}
          className="text-roxo underline"
        >
          Voltar ao início
        </button>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {faixa && (
        <ProgressoBlocos faixa={faixa} numeroAtual={numeroAtual} />
      )}

      <div className="flex-1 flex flex-col" key={numeroAtual}>
        {perguntaAtual && (
          <div className="fade-in flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xl" aria-hidden>
                {emojiDoIcone(perguntaAtual.bloco.icone)}
              </span>
              <p className="text-roxo text-xs tracking-[0.18em] uppercase">
                {perguntaAtual.bloco.titulo} · {numeroAtual} de{" "}
                {totalRef.current}
              </p>
            </div>

            {carregandoPergunta ? (
              <p className="text-creme/60 text-xl font-titulo pulse-soft">
                Preparando uma pergunta só para você…
              </p>
            ) : falhaPergunta ? (
              <div className="rounded-2xl border border-roxo/25 bg-fundo-suave p-5">
                <p className="text-creme mb-1">
                  Não conseguimos preparar esta pergunta agora.
                </p>
                <p className="text-creme-suave/70 text-sm mb-4">
                  Foi um soluço momentâneo. Tente de novo.
                </p>
                <button
                  onClick={() => carregarPergunta(perguntas, numeroAtual)}
                  className="rounded-full bg-roxo px-6 py-2.5 text-fundo font-semibold text-sm"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-2xl text-creme mb-3 leading-snug">
                  {textoPergunta}
                </h1>
                {perguntaAtual.subtexto && (
                  <p className="text-creme-suave/70 text-sm mb-5">
                    {perguntaAtual.subtexto}
                  </p>
                )}

                <textarea
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                  placeholder="Escreva com sinceridade. Ninguém além de você vê isto."
                  rows={6}
                  autoFocus
                  className="w-full rounded-2xl border border-roxo/25 bg-fundo-suave p-4 text-creme placeholder:text-creme-suave/35 text-base resize-none focus:border-roxo/70 transition"
                />
              </>
            )}

            {erro && <p className="text-red-300 text-sm mt-3">{erro}</p>}

            {!falhaPergunta && (
              <div className="mt-auto pt-6">
                <button
                  onClick={continuar}
                  disabled={carregandoPergunta || enviando || !resposta.trim()}
                  className="w-full rounded-full bg-roxo py-3.5 text-fundo font-semibold text-base transition active:scale-[0.99] disabled:opacity-40"
                >
                  {enviando
                    ? "Guardando…"
                    : numeroAtual >= totalRef.current
                      ? "Ver meu perfil"
                      : "Continuar"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {sessionId && (
        <div className="pt-6 text-center">
          <ApagarDados sessionId={sessionId} />
        </div>
      )}
    </main>
  );
}

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell justify-center text-center">
          <p className="text-creme-suave/60 pulse-soft">Carregando…</p>
        </main>
      }
    >
      <QuizInterno />
    </Suspense>
  );
}
