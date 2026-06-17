import questionsJson from "./legado_vivo_questions.json";
import type {
  QuestionsData,
  Faixa,
  Pergunta,
  PerguntaComBloco,
} from "./types";

// Importa o JSON com tipagem TypeScript completa.
export const questions: QuestionsData = questionsJson as QuestionsData;

export const meta = questions.meta;
export const systemPrompt = questions.system_prompt;

/** Lista os identificadores das faixas etárias disponíveis (ex.: "50-60"). */
export function listFaixaIds(): string[] {
  return Object.keys(questions.faixas);
}

/** Lista as faixas com seus ids, para renderizar a home. */
export function listFaixas(): Array<{ id: string; faixa: Faixa }> {
  return listFaixaIds().map((id) => ({ id, faixa: questions.faixas[id] }));
}

/** Retorna a faixa pelo id, ou `undefined` se não existir. */
export function getFaixa(id: string): Faixa | undefined {
  return questions.faixas[id];
}

/** Achata todas as perguntas de uma faixa em ordem crescente de `numero`. */
export function flattenPerguntas(faixa: Faixa): PerguntaComBloco[] {
  const todas: PerguntaComBloco[] = [];
  for (const bloco of faixa.blocos) {
    for (const pergunta of bloco.perguntas) {
      todas.push({
        ...pergunta,
        bloco: {
          id: bloco.id,
          titulo: bloco.titulo,
          descricao: bloco.descricao,
          icone: bloco.icone,
          numero: bloco.numero,
        },
      });
    }
  }
  return todas.sort((a, b) => a.numero - b.numero);
}

/** Encontra uma pergunta específica pelo número dentro de uma faixa. */
export function getPerguntaByNumero(
  faixa: Faixa,
  numero: number,
): PerguntaComBloco | undefined {
  return flattenPerguntas(faixa).find((p) => p.numero === numero);
}

/**
 * Dada uma pergunta dinâmica (com `gerada_por: "resposta_N"`), retorna a
 * pergunta fixa de origem (numero N) que carrega a `dinamica_instrucao`.
 */
export function getPerguntaOrigem(
  faixa: Faixa,
  perguntaDinamica: Pergunta,
): PerguntaComBloco | undefined {
  if (!perguntaDinamica.gerada_por) return undefined;
  const numeroOrigem = Number(perguntaDinamica.gerada_por.replace(/\D/g, ""));
  if (Number.isNaN(numeroOrigem)) return undefined;
  return getPerguntaByNumero(faixa, numeroOrigem);
}

/** Total de perguntas por faixa (igual em todas, mas calculado da faixa). */
export function totalPerguntas(faixa: Faixa): number {
  return flattenPerguntas(faixa).length;
}
