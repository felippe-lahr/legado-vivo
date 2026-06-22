"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarSessaoSemente, marcarPagaTeste } from "../actions";

const FAIXAS = [
  { id: "50-60", label: "50 a 60 anos" },
  { id: "60-70", label: "60 a 70 anos" },
  { id: "70+", label: "70 anos ou mais" },
];

type Destino = "resultado" | "checkout" | "carta-paga";

export function DevSeed() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ativo, setAtivo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function gerar(faixaId: string, destino: Destino) {
    setAtivo(`${faixaId}-${destino}`);
    setErro(null);
    startTransition(async () => {
      try {
        const sessionId = await criarSessaoSemente(faixaId);
        if (destino === "carta-paga") {
          await marcarPagaTeste(sessionId);
          router.push(`/resultado?session=${sessionId}`);
          return;
        }
        router.push(`/${destino}?session=${sessionId}`);
      } catch {
        setErro("Falha ao gerar a sessão de teste.");
        setAtivo(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {FAIXAS.map((f) => (
        <div
          key={f.id}
          className="rounded-2xl border border-roxo/25 bg-fundo-suave p-4"
        >
          <p className="text-creme font-titulo text-lg mb-3">{f.label}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => gerar(f.id, "resultado")}
              className="flex-1 rounded-full bg-roxo py-2.5 text-fundo font-semibold text-sm transition active:scale-[0.99] disabled:opacity-40"
            >
              {ativo === `${f.id}-resultado` ? "Gerando…" : "→ Resultado"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => gerar(f.id, "checkout")}
              className="flex-1 rounded-full border border-roxo/50 py-2.5 text-roxo font-semibold text-sm transition active:scale-[0.99] disabled:opacity-40"
            >
              {ativo === `${f.id}-checkout` ? "Gerando…" : "→ Checkout"}
            </button>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => gerar(f.id, "carta-paga")}
            className="mt-2 w-full rounded-full border border-roxo/30 py-2.5 text-creme-suave/80 font-semibold text-sm transition active:scale-[0.99] disabled:opacity-40"
          >
            {ativo === `${f.id}-carta-paga`
              ? "Gerando…"
              : "→ Carta completa (paga, teste)"}
          </button>
        </div>
      ))}
      {erro && <p className="text-red-300 text-sm">{erro}</p>}
    </div>
  );
}
