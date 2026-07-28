<div align="center">

# 🎟️ luma-etiquetas

**Baixe os convidados do seu evento no [Lu.ma](https://lu.ma) e imprima etiquetas de crachá em PDF — sob demanda, uma por pessoa.**

Cada adotante usa a **própria conta Lu.ma**. Nenhuma credencial vem embutida.

[![License: MIT](https://img.shields.io/badge/Código-MIT-blue.svg)](./LICENSE)
[![Fonte: OFL](https://img.shields.io/badge/Fonte-OFL%201.1-green.svg)](./assets/fonts/OFL.txt)
[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3c873a.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org)

</div>

---

## O que é

Uma ferramenta pequena de linha de comando (e biblioteca TypeScript) que:

1. **Faz login** na sua conta Lu.ma (e-mail + senha).
2. **Lista os convidados** de um evento seu (nome, e-mail, status de inscrição, check-in).
3. **Gera etiquetas de crachá em PDF** — uma página por convidado, no formato de etiqueta adesiva 255,97 × 82,20 pt, com **nome em negrito + "Empresa • Cargo"**, fonte que se auto-ajusta para caber.

Nasceu da operação real da [dzb.events](https://dzb.events) num evento com **871 convidados** (Happy Hour + Corrida). A mecânica de impressão é **sob demanda**: você gera o crachá de uma pessoa (ou de todas de uma vez) e o PDF é salvo para você imprimir. Simples e à prova de fila.

---

## ⚠️ Leia antes de usar — API interna e Termos do Lu.ma

Esta ferramenta conversa com a **API interna e não-documentada** do Lu.ma (`api2.luma.com`) — os mesmos endpoints que o painel web do Lu.ma usa. Isso tem implicações que você **precisa** entender:

- **Pode conflitar com os [Termos de Serviço do Lu.ma](https://lu.ma/terms).** Não há API pública oficial para isto. Use por sua conta e risco, **na sua própria conta**, para os **seus próprios eventos**.
- **Pode quebrar sem aviso.** O Lu.ma pode mudar endpoints, campos ou o fluxo de login a qualquer momento. Se algo parar de funcionar, provavelmente foi isso.
- **Não faça scraping de eventos de terceiros.** A ferramenta assume que você é **admin/host** do evento.
- **Sem afiliação.** Este projeto não é afiliado, endossado nem mantido pelo Lu.ma. "Lu.ma" é marca de seus respectivos donos.

Se você precisa de garantias contratuais/estabilidade, fale com o Lu.ma sobre acesso oficial.

---

## 🔐 Requisitos de login e renovação de acesso

Esta é a parte mais importante de entender. **É exatamente assim que fazemos login e renovamos o acesso:**

### Como o login funciona (3 passos, engenharia reversa do painel web)

1. `GET https://luma.com/signin` → coleta o cookie anti-bot `__cf_bm` da Cloudflare.
2. `POST api2.luma.com/auth/email/start-with-email` → informa o e-mail (o site faz isso **antes** de pedir a senha).
3. `POST api2.luma.com/auth/sign-in-with-password` → envia e-mail + senha. A resposta traz, no `Set-Cookie`, a chave de sessão **`luma.auth-session-key`**.

O resultado é uma **"cookie string" autenticada**, salva localmente em **`.luma-session.json`** (arquivo com segredo — está no `.gitignore`, **nunca** commite).

### Requisitos

| Requisito | Detalhe |
|---|---|
| **Conta Lu.ma** | E-mail + senha próprios. Você precisa ser **admin/host** do evento. |
| **Login por senha** | O fluxo usa **e-mail + senha**. Contas que só entram por **OTP/link mágico** ou **SSO (Google/etc.)** **não** funcionam com este método — cadastre uma senha na sua conta Lu.ma. |
| **`.env`** | Copie `.env.example` para `.env` e preencha `LUMA_EMAIL` / `LUMA_PASSWORD`. |

### Renovação de acesso (a sessão EXPIRA)

A `luma.auth-session-key` **expira** depois de um tempo. Quando expira, as chamadas passam a falhar (HTTP 401/403).

- **Como saber:** rode `luma-etiquetas ping`. Se disser *"Sessão INVÁLIDA"*, renove.
- **Como renovar:** rode `luma-etiquetas login` de novo — ele refaz os 3 passos e sobrescreve o `.luma-session.json`.
- **Automação (opcional):** num servidor, agende `luma-etiquetas login` periodicamente (ex.: cron diário) para manter a sessão fresca. Não há refresh-token; a renovação é sempre um **login novo** com e-mail + senha.

---

## 🚀 Início rápido

```bash
# 1. Instale
git clone https://github.com/josevitorls/luma-etiquetas.git
cd luma-etiquetas
npm install
npm run build

# 2. Configure suas credenciais
cp .env.example .env
#   edite .env → LUMA_EMAIL / LUMA_PASSWORD

# 3. Faça login (salva a sessão em .luma-session.json)
node dist/cli.js login

# 4. Descubra o event_api_id e liste os convidados
node dist/cli.js guests evt-XXXXXXXX

# 5. Gere UMA etiqueta (sob demanda) ...
node dist/cli.js badge evt-XXXXXXXX rsvp-YYYYYYYY -o joao.pdf

# 5b. ... ou TODAS de uma vez
node dist/cli.js badges evt-XXXXXXXX -o crachas.pdf
```

Durante o desenvolvimento, sem build: `npx tsx src/cli.ts <comando>`.

---

## 🧭 Onde acho o `event_api_id`?

É o identificador do evento no Lu.ma, começa com **`evt-`**. Abra o painel de gestão do seu evento:

```
https://luma.com/event/manage/evt-XXXXXXXX/guests
                              └──────┬──────┘
                              este é o event_api_id
```

O `rsvp-…` (id do convidado) aparece na primeira coluna do comando `guests`.

---

## 📋 Comandos

| Comando | O que faz |
|---|---|
| `login` | Faz login no Lu.ma (usa `LUMA_EMAIL`/`LUMA_PASSWORD`) e salva a sessão. |
| `ping` | Verifica se a sessão salva ainda é válida. |
| `guests <eventId>` | Lista os convidados: `rsvp_api_id  status  nome  <email>`. |
| `badge <eventId> <rsvpId> [-o arquivo.pdf]` | Gera a etiqueta de **um** convidado. |
| `badges <eventId> [--status approved\|all] [-o arquivo.pdf]` | Gera as etiquetas de **todos** (padrão: aprovados). |

---

## 🖨️ O crachá

- Página **255,97 × 82,20 pt** (etiqueta adesiva pequena — ajuste no seu software de impressão para "tamanho real / 100%").
- **Linha 1:** nome, **negrito**, MAIÚSCULAS, centralizado.
- **Linha 2:** `Empresa • Cargo`, regular, centralizada.
- **Auto-ajuste:** se o texto for longo, a fonte encolhe até caber.

### De onde vêm Empresa e Cargo

Do formulário de inscrição do Lu.ma: da pergunta padrão **"Company / Job title"** (`question_type = 'company'`). 

> **Requisito do evento:** se o seu formulário **não** tiver essa pergunta, o crachá sai **só com o nome** — e isso é o comportamento correto, não um erro. Para ter empresa/cargo, adicione a pergunta "Company" no formulário do evento no Lu.ma.

### Fonte e idiomas suportados

O crachá embute a **Liberation Sans** (clone métrico do Arial, licença [OFL 1.1](./assets/fonts/OFL.txt)) para manter aparência consistente sem depender de fontes do sistema.

| Cobertura | Suportado? |
|---|---|
| Português, Espanhol, Francês, Alemão, Italiano (acentos, ç, ñ, ü…) | ✅ |
| Polonês (Ł), Islandês (Þ), Latino estendido | ✅ |
| Cyrillic (Иван), Greek (α) | ✅ |
| **Vietnamita** (Nguyễn, ư, ơ, ị) | ❌ *sai com lacunas* |
| **CJK** — Chinês, Japonês, Coreano (中文) | ❌ *não renderiza* |

Para cobrir Vietnamita/CJK, troque os arquivos em `assets/fonts/` por uma fonte de cobertura maior (ex.: Noto Sans / Noto Sans CJK) — o gerador embute a fonte via `fontkit`, então basta substituir os dois `.ttf`.

---

## 📦 Uso como biblioteca

```ts
import {
  loginToLuma, saveSession, loadSession,
  LumaClient, extractBadgeFields, generateBadgesPdf,
} from 'luma-etiquetas'
import { writeFileSync } from 'node:fs'

// login (uma vez; salve a sessão)
const session = await loginToLuma(process.env.LUMA_EMAIL!, process.env.LUMA_PASSWORD!)
saveSession(session)

// depois: listar convidados e gerar crachás
const luma = new LumaClient(loadSession()!.cookieString)
const guests = await luma.getAllGuests('evt-XXXXXXXX')
const pdf = await generateBadgesPdf(guests.map(extractBadgeFields))
writeFileSync('crachas.pdf', pdf)
```

---

## 🔒 Segurança

- **`.env` e `.luma-session.json` contêm segredos** (sua senha e sua sessão Lu.ma). Ambos estão no `.gitignore`. **Nunca** commite nem compartilhe.
- A sessão salva **equivale a estar logado** na sua conta Lu.ma. Trate `.luma-session.json` como uma senha.
- Nada é enviado a terceiros: a ferramenta fala **só** com `luma.com` / `api2.luma.com`.

---

## 🗺️ Arquitetura

```
src/
  login.ts     # login por e-mail+senha → cookie string autenticada
  session.ts   # salva/carrega a sessão em .luma-session.json (gitignored)
  luma.ts      # LumaClient: get-guests (paginado), check-in, csv… (sem DB)
  fields.ts    # extrai nome/empresa/cargo do convidado cru
  badge.ts     # gera o PDF da etiqueta (pdf-lib + fontkit, fonte OFL embutida)
  config.ts    # lê LUMA_EMAIL/LUMA_PASSWORD do .env
  cli.ts       # a interface de linha de comando
assets/fonts/  # Liberation Sans (Regular/Bold) sob OFL 1.1
skill/         # skill de Claude Code (SKILL.md)
```

---

## 🤖 Skill de Claude Code

Este repo inclui uma **skill de Claude Code** em [`skill/SKILL.md`](./skill/SKILL.md). Se você usa o Claude Code, ela ensina o agente a operar esta ferramenta em linguagem natural ("liste os convidados do evento evt-…", "gera os crachás de todo mundo"). Veja as instruções de instalação lá.

---

## 📄 Licença

- **Código:** [MIT](./LICENSE).
- **Fontes** em `assets/fonts/`: [SIL Open Font License 1.1](./assets/fonts/OFL.txt) (não recobertas pela MIT — redistribuídas sob a OFL).

Feito a partir da operação real da [dzb.events](https://dzb.events). Sem afiliação com o Lu.ma.
