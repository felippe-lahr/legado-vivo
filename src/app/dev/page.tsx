import { testSeedHabilitado } from "../actions";
import { DevSeed } from "./DevSeed";

export const dynamic = "force-dynamic";

export default async function DevPage() {
  const habilitado = await testSeedHabilitado();

  if (!habilitado) {
    return (
      <main className="app-shell justify-center text-center">
        <p className="text-creme-suave/60">
          Modo de teste desabilitado.
        </p>
        <p className="text-creme-suave/40 text-sm mt-2">
          Defina <code className="text-roxo">ENABLE_TEST_SEED=1</code> para
          habilitar.
        </p>
      </main>
    );
  }

  return (
    <main className="app-shell justify-center">
      <div className="fade-in">
        <p className="text-roxo text-xs tracking-[0.2em] uppercase mb-3">
          Modo de teste
        </p>
        <h1 className="text-3xl text-creme mb-2">Sessão pré-preenchida</h1>
        <p className="text-creme-suave/70 text-sm mb-8">
          Gera uma sessão com as 20 respostas preenchidas e o perfil pronto,
          pulando direto para o resultado ou o checkout.
        </p>
        <DevSeed />
      </div>
    </main>
  );
}
