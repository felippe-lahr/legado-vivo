// ──────────────────────────────────────────────────────────────
// Tipagem completa do JSON `legado_vivo_questions.json`
// e dos objetos derivados (respostas e perfil gerado pela IA).
// ──────────────────────────────────────────────────────────────

export type TipoPergunta = "fixa" | "dinamica";

export interface Pergunta {
  id: string;
  numero: number;
  tipo: TipoPergunta;
  /** `null` para perguntas dinâmicas (texto gerado em tempo real pela IA). */
  texto: string | null;
  subtexto: string;
  intencao: string;
  /** Presente em perguntas fixas que alimentam uma pergunta dinâmica. */
  alimenta_dinamica?: boolean;
  /** Instrução para a IA usar ao gerar a pergunta dinâmica correspondente. */
  dinamica_instrucao?: string;
  /** Presente em perguntas dinâmicas. Ex.: "resposta_3". */
  gerada_por?: string;
}

export interface Bloco {
  id: string;
  numero: number;
  titulo: string;
  descricao: string;
  icone: string;
  perguntas: Pergunta[];
}

export interface Faixa {
  label: string;
  tom: string;
  blocos: Bloco[];
}

export interface PerfilSchema {
  arquetipo: string;
  icone: string;
  frase: string;
  dimensoes: Record<string, number>;
  ativos: string;
  risco: string;
  acoes: string[];
  pergunta_final_reflexao: string;
}

export interface SystemPrompt {
  base: string;
  instrucao_dinamica: string;
  instrucao_perfil: string;
  perfil_schema: PerfilSchema;
}

export interface Meta {
  produto: string;
  versao: string;
  total_perguntas_por_faixa: number;
  perguntas_fixas: number;
  perguntas_dinamicas_ia: number;
  blocos: string[];
}

export interface QuestionsData {
  meta: Meta;
  system_prompt: SystemPrompt;
  faixas: Record<string, Faixa>;
}

// ─── Objetos de runtime ───────────────────────────────────────

/** Uma resposta dada pelo usuário, persistida em `sessions.answers` (JSONB). */
export interface Answer {
  numero: number;
  perguntaId: string;
  /** Texto da pergunta no momento em que foi respondida (inclui dinâmicas geradas). */
  texto: string;
  resposta: string;
}

/** Perfil final gerado pela IA, persistido em `sessions.profile` (JSONB). */
export interface Profile {
  arquetipo: string;
  icone: string;
  frase: string;
  dimensoes: Record<string, number>;
  ativos: string;
  risco: string;
  acoes: string[];
  pergunta_final_reflexao: string;
}

/** Pergunta achatada com referência ao bloco a que pertence. */
export interface PerguntaComBloco extends Pergunta {
  bloco: Pick<Bloco, "id" | "titulo" | "descricao" | "icone" | "numero">;
}
