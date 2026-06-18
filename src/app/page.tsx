import { listFaixas, meta } from "@/lib/questions";
import { FaixaSelector } from "./FaixaSelector";

export default function Home() {
  const faixas = listFaixas().map(({ id, faixa }) => ({
    id,
    label: faixa.label,
    icone: faixa.blocos[0]?.icone ?? "compass",
  }));

  return (
    <main className="app-shell justify-center">
      <div className="fade-in">
        <p className="text-roxo text-sm tracking-[0.2em] uppercase mb-4">
          {meta.produto}
        </p>
        <h1 className="text-4xl text-creme mb-5">
          Sua história ainda está sendo escrita.
        </h1>
        <p className="text-creme-suave text-base mb-2">
          São {meta.total_perguntas_por_faixa} perguntas. Não existem respostas
          certas — existem as suas.
        </p>
        <p className="text-creme-suave/80 text-sm mb-10">
          Ao final, revelamos o que você carrega sem perceber: seus talentos
          esquecidos, seus padrões e o próximo capítulo que te espera.
        </p>

        <h2 className="text-creme text-lg mb-4">Por onde começamos?</h2>
        <p className="text-creme-suave/70 text-sm mb-5">
          Escolha a fase em que você está hoje.
        </p>

        <FaixaSelector faixas={faixas} />
      </div>
    </main>
  );
}
