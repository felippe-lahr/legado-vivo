"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { excluirDados } from "./actions";

/**
 * Botão discreto que cumpre a promessa "você pode apagar tudo": exclui de
 * verdade a sessão no banco e leva a pessoa de volta ao início.
 */
export function ApagarDados({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  function apagar() {
    startTransition(async () => {
      try {
        await excluirDados(sessionId);
      } finally {
        router.push("/");
      }
    });
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="text-creme-suave/40 text-xs underline underline-offset-2 hover:text-creme-suave/70 transition"
      >
        Apagar minhas respostas
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-creme-suave/70 text-xs text-center">
        Tem certeza? Isto apaga tudo para sempre, sem como recuperar.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={apagar}
          disabled={pending}
          className="text-red-300 text-xs underline underline-offset-2 disabled:opacity-50"
        >
          {pending ? "Apagando…" : "Sim, apagar tudo"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={pending}
          className="text-creme-suave/60 text-xs underline underline-offset-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
