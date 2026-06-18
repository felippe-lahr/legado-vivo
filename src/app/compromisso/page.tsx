"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const PROMESSAS = [
  {
    titulo: "Só você tem acesso",
    desc: "Nenhuma outra pessoa pode ler suas respostas. Nem familiares, nem nós.",
  },
  {
    titulo: "Você pode apagar tudo",
    desc: "Quando quiser, sem perguntas, suas respostas desaparecem por completo.",
  },
  {
    titulo: "Sem julgamento",
    desc: "Não existe resposta certa, errada, boa ou ruim aqui. Só existe a verdade.",
  },
];

function CompromissoInterno() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session");

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
      <div className="fade-in">
        <p className="text-roxo text-xs tracking-[0.2em] uppercase mb-4">
          Antes de começarmos
        </p>
        <h1 className="text-3xl text-creme mb-5 leading-tight">
          Isto só funciona se você for honesto — com você mesmo.
        </h1>
        <p className="text-creme-suave text-base mb-8">
          Não existe resposta errada. Existe a resposta que você não quer admitir
          nem para si mesmo. É essa que queremos ouvir.
        </p>

        <div className="flex flex-col gap-3 mb-8">
          {PROMESSAS.map((p) => (
            <div
              key={p.titulo}
              className="rounded-2xl border border-roxo/25 bg-fundo-suave px-5 py-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-roxo mt-0.5">✦</span>
                <div>
                  <p className="text-creme font-titulo text-base leading-tight mb-1">
                    {p.titulo}
                  </p>
                  <p className="text-creme-suave/80 text-sm">{p.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-creme-suave/70 text-sm italic border-l-2 border-roxo/50 pl-4 mb-9">
          “Quanto mais honesto você for agora, mais fiel será o espelho que você
          vai ver no final.”
        </p>

        <button
          onClick={() => router.push(`/quiz?session=${sessionId}`)}
          className="w-full rounded-full bg-roxo py-3.5 text-fundo font-semibold text-base transition active:scale-[0.99]"
        >
          Estou pronto para ser honesto →
        </button>
      </div>
    </main>
  );
}

export default function CompromissoPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell justify-center text-center">
          <p className="text-creme-suave/60 pulse-soft">Carregando…</p>
        </main>
      }
    >
      <CompromissoInterno />
    </Suspense>
  );
}
