# Legado Vivo

Uma conversa profunda, em 12 perguntas, sobre quem você é, o que te move e o
legado que você está construindo. Ao final, a Claude API revela o seu
**arquétipo**, suas **dimensões** e **insights** acionáveis.

Pensado para pessoas acima de 50 anos, com três faixas de jornada:

- **50–60** — Reinvenção e propósito
- **60–70** — Liberdade e legado
- **70+** — Autonomia e essência

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** (configuração CSS-first via `@theme`)
- Fontes **Lora** (títulos) + **Inter** (corpo) via `next/font`
- **Prisma** + **PostgreSQL** (Railway)
- **Claude API** (`claude-sonnet-4-6`) via Server Actions
- **Mercado Pago** (checkout R$ 9,90)

Paleta: fundo `#1C1728`, roxo `#BAA2FF`, creme `#FAF8F4`. Mobile-first,
largura máxima de 430px.

## Como funciona

1. **`/`** — a pessoa escolhe a faixa etária. Cria-se uma `session`.
2. **`/quiz`** — 12 perguntas, uma por vez, com barra de progresso por blocos
   (Identidade · Relações · Propósito · Legado). As perguntas **4, 6 e 8** são
   **dinâmicas**: geradas em tempo real pela Claude API a partir das respostas
   anteriores (Server Action `obterPergunta`).
3. Após a pergunta 12, a Server Action `finalizarQuiz` chama a Claude API para
   gerar o **perfil completo** (arquétipo + JSON estruturado seguindo o
   `perfil_schema`).
4. **`/resultado`** — mostra arquétipo, frase, dimensões e forças. O padrão
   limitante, as 3 ações e a pergunta de reflexão ficam bloqueados até o
   pagamento.
5. **`/checkout`** — e-mail + pagamento de **R$ 9,90** via Mercado Pago. O
   webhook (`/api/mercadopago/webhook`) confirma e libera o conteúdo.

### Estrutura

```
src/
  app/
    page.tsx                      # home (escolha de faixa)
    FaixaSelector.tsx            # client component da home
    quiz/page.tsx                # quiz (12 perguntas, uma por vez)
    resultado/page.tsx           # arquétipo + dimensões + insights
    checkout/page.tsx            # e-mail + Mercado Pago
    actions.ts                   # Server Actions
    api/mercadopago/webhook/route.ts
    layout.tsx, globals.css
  lib/
    legado_vivo_questions.json   # estrutura completa do produto
    questions.ts                 # importa o JSON com tipagem completa
    types.ts                     # tipos TypeScript
    anthropic.ts                 # Claude API (perguntas dinâmicas + perfil)
    mercadopago.ts               # preferência de pagamento + consulta
    prisma.ts                    # client Prisma (singleton)
    icones.ts                    # nomes tabler -> emoji
prisma/schema.prisma             # tabela `sessions`
```

### Tabela `sessions`

| coluna       | tipo        |
| ------------ | ----------- |
| `id`         | UUID (PK)   |
| `age_group`  | text        |
| `answers`    | JSONB       |
| `profile`    | JSONB       |
| `email`      | text        |
| `paid_at`    | timestamp   |
| `created_at` | timestamp   |

## Rodando localmente

```bash
# 1. Instale as dependências (gera o Prisma Client no postinstall)
npm install

# 2. Configure o ambiente
cp .env.example .env
# preencha DATABASE_URL, ANTHROPIC_API_KEY, MERCADO_PAGO_ACCESS_TOKEN, etc.

# 3. Crie a tabela no banco
npx prisma migrate dev --name init

# 4. Suba o app
npm run dev
```

Acesse http://localhost:3000.

## Variáveis de ambiente

Veja `.env.example`:

- `DATABASE_URL` — Postgres (fornecido pela Railway).
- `ANTHROPIC_API_KEY` — chave da Claude API.
- `MERCADO_PAGO_ACCESS_TOKEN` — access token do Mercado Pago.
- `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` — public key (uso no front, se preciso).
- `NEXT_PUBLIC_BASE_URL` — URL pública (back_urls e webhook do Mercado Pago).

## Deploy na Railway

O `railway.json` já está configurado:

- **build:** `npm run build`
- **start:** `npx prisma migrate deploy && npm run start`

Passos:

1. Crie um projeto na Railway e adicione um banco **PostgreSQL** (a variável
   `DATABASE_URL` é injetada automaticamente).
2. Configure as demais variáveis de ambiente do `.env.example`.
3. Faça o deploy. O `prisma migrate deploy` aplica as migrations na subida.

> Gere as migrations localmente (`npx prisma migrate dev`) e versione a pasta
> `prisma/migrations/` para que `migrate deploy` tenha o que aplicar em produção.

## Personalizando o conteúdo

Todo o conteúdo (faixas, perguntas, system prompts e `perfil_schema`) vive em
`src/lib/legado_vivo_questions.json`, tipado por `src/lib/types.ts`. Editar o
JSON é suficiente para alterar perguntas, tom e o formato do perfil — o código
é orientado a dados.
