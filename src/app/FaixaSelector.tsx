"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "./actions";
import { AvatarFaixa } from "./AvatarFaixa";

interface FaixaItem {
  id: string;
  label: string;
  icone: string;
}

function formatarFaixa(id: string): string {
  if (id.endsWith("+")) return `${id.replace("+", "")} anos ou mais`;
  const [a, b] = id.split("-");
  if (a && b) return `${a} a ${b} anos`;
  return id;
}

export function FaixaSelector({ faixas }: { faixas: FaixaItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function escolher(id: string) {
    setSelecionada(id);
    setErro(null);
    startTransition(async () => {
      try {
        const sessionId = await createSession(id);
        router.push(`/compromisso?session=${sessionId}`);
      } catch {
        setErro("Não foi possível iniciar agora. Tente novamente.");
        setSelecionada(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {faixas.map((f) => {
        const carregando = pending && selecionada === f.id;
        return (
          <button
            key={f.id}
            type="button"
            disabled={pending}
            onClick={() => escolher(f.id)}
            className="text-left rounded-2xl border border-roxo/25 bg-fundo-suave px-5 py-4 transition active:scale-[0.99] hover:border-roxo/60 disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              <AvatarFaixa faixaId={f.id} className="h-11 w-11 shrink-0" />
              <div>
                <p className="text-creme font-titulo text-lg leading-tight">
                  {formatarFaixa(f.id)}
                </p>
                <p className="text-roxo text-sm">
                  {carregando ? "Preparando sua conversa…" : f.label}
                </p>
              </div>
            </div>
          </button>
        );
      })}
      {erro && <p className="text-red-300 text-sm mt-1">{erro}</p>}
    </div>
  );
}
