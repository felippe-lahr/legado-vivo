import Anthropic from "@anthropic-ai/sdk";
import { systemPrompt, getFaixa, flattenPerguntas, getPerguntaOrigem } from "./questions";
import type { Answer, Faixa, PerguntaComBloco, Profile } from "./types";

// Modelo solicitado para as Server Actions do Legado Vivo.
const MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/** Extrai o texto concatenado de uma resposta da Messages API. */
function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/** Monta um histórico legível das respostas já dadas. */
function historico(answers: Answer[]): string {
  if (answers.length === 0) return "(nenhuma resposta ainda)";
  return answers
    .map((a) => `Pergunta ${a.numero}: ${a.texto}\nResposta: ${a.resposta}`)
    .join("\n\n");
}

/**
 * Gera, em tempo real, o texto de uma pergunta dinâmica (perguntas 4, 6 e 8)
 * a partir das respostas anteriores e da `dinamica_instrucao` da pergunta de
 * origem indicada por `gerada_por`.
 */
export async function gerarPerguntaDinamica(
  faixaId: string,
  perguntaDinamica: PerguntaComBloco,
  answers: Answer[],
): Promise<string> {
  const faixa = getFaixa(faixaId);
  if (!faixa) throw new Error(`Faixa inválida: ${faixaId}`);

  const origem = getPerguntaOrigem(faixa, perguntaDinamica);
  const instrucao =
    origem?.dinamica_instrucao ??
    "Gere uma pergunta de aprofundamento curta, calorosa e sem julgamento, a partir do que a pessoa compartilhou.";

  const numeroOrigem = origem?.numero;
  const respostaOrigem = answers.find((a) => a.numero === numeroOrigem);

  const system = `${systemPrompt.base}\n\nFaixa: ${faixaId} — ${faixa.label}. Tom: ${faixa.tom}\n\n${systemPrompt.instrucao_dinamica}`;

  const userContent = [
    `Bloco atual: ${perguntaDinamica.bloco.titulo} (${perguntaDinamica.bloco.descricao}).`,
    "",
    "Histórico da conversa até aqui:",
    historico(answers),
    "",
    respostaOrigem
      ? `A pergunta dinâmica deve nascer especialmente desta resposta:\n"${respostaOrigem.resposta}"\n(à pergunta: "${respostaOrigem.texto}")`
      : "",
    "",
    `Instrução para esta pergunta: ${instrucao}`,
    "",
    "Escreva agora a pergunta. Lembre-se: apenas a pergunta, no máximo 2 linhas.",
  ]
    .filter(Boolean)
    .join("\n");

  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 300,
    system,
    messages: [{ role: "user", content: userContent }],
  });

  const texto = textOf(message).replace(/^["']|["']$/g, "").trim();
  return texto || "O que essa reflexão desperta em você agora?";
}

/** Tenta extrair um objeto JSON de um texto que deveria conter apenas JSON. */
function parseJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Resposta da IA não contém JSON válido.");
  }
}

/**
 * Gera o perfil final (arquétipo + JSON completo) depois da pergunta 12,
 * seguindo o `perfil_schema` definido no JSON do produto.
 */
export async function gerarPerfil(
  faixaId: string,
  answers: Answer[],
): Promise<Profile> {
  const faixa: Faixa | undefined = getFaixa(faixaId);
  if (!faixa) throw new Error(`Faixa inválida: ${faixaId}`);

  const system = `${systemPrompt.base}\n\nFaixa: ${faixaId} — ${faixa.label}. Tom: ${faixa.tom}\n\n${systemPrompt.instrucao_perfil}`;

  const schema = JSON.stringify(systemPrompt.perfil_schema, null, 2);

  const userContent = [
    "As 12 respostas da pessoa estão abaixo. Leia tudo com atenção e revele o que ela carrega sem perceber.",
    "",
    historico(answers),
    "",
    "Gere o perfil seguindo EXATAMENTE este schema (mesmas chaves):",
    schema,
    "",
    "Regras dos campos:",
    "- `dimensoes`: cada valor é um número inteiro de 0 a 100.",
    "- `icone`: um único nome de ícone tabler sem o prefixo (ex.: compass, mountain, flame, leaf, anchor, star, heart, sun, moon, tree, wind, feather, telescope, infinity).",
    "- `acoes`: exatamente 3 ações concretas e simples para os próximos 30 dias.",
    "- Use as palavras e temas que a própria pessoa trouxe.",
    "",
    "Responda APENAS com o JSON válido.",
  ].join("\n");

  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: userContent }],
  });

  const data = parseJson(textOf(message)) as Profile;

  // Normalização defensiva.
  return {
    arquetipo: String(data.arquetipo ?? "O Caminhante"),
    icone: String(data.icone ?? "compass"),
    frase: String(data.frase ?? ""),
    dimensoes: data.dimensoes ?? {},
    ativos: String(data.ativos ?? ""),
    risco: String(data.risco ?? ""),
    acoes: Array.isArray(data.acoes) ? data.acoes.map(String) : [],
    pergunta_final_reflexao: String(data.pergunta_final_reflexao ?? ""),
  };
}
