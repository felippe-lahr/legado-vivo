// Mapeia os nomes de ícone (estilo tabler, sem prefixo) usados no produto
// para emojis. Evita uma dependência extra de pacote de ícones e renderiza
// de forma confiável em qualquer ambiente.

const MAPA: Record<string, string> = {
  // ícones de bloco
  user: "🧑",
  heart: "❤️",
  flame: "🔥",
  tree: "🌳",
  // ícones de arquétipo sugeridos no schema
  compass: "🧭",
  mountain: "⛰️",
  leaf: "🍃",
  anchor: "⚓",
  star: "⭐",
  sun: "☀️",
  moon: "🌙",
  wind: "🌬️",
  feather: "🪶",
  telescope: "🔭",
  infinity: "♾️",
  // extras comuns
  sparkles: "✨",
  book: "📖",
  road: "🛣️",
  key: "🗝️",
  bridge: "🌉",
  seed: "🌱",
  bird: "🕊️",
  lighthouse: "🗼",
  hourglass: "⏳",
};

export function emojiDoIcone(nome: string | undefined | null): string {
  if (!nome) return "✨";
  const limpo = nome.toLowerCase().replace(/^ti-/, "").trim();
  return MAPA[limpo] ?? "✨";
}
