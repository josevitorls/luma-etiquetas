---
name: luma-etiquetas
description: Use quando o usuário quiser listar convidados de um evento no Lu.ma ou gerar/imprimir etiquetas de crachá em PDF a partir do Lu.ma. Cobre login na conta Lu.ma do próprio usuário, renovação de sessão, listagem de convidados e geração de crachás (um por pessoa ou todos de uma vez).
---

# luma-etiquetas — convidados do Lu.ma → etiquetas de crachá em PDF

Esta skill opera a ferramenta `luma-etiquetas`: login na conta Lu.ma **do próprio usuário**,
listagem de convidados e geração de etiquetas de crachá em PDF (sob demanda).

## ⚠️ Antes de tudo

- A ferramenta usa a **API interna e não-documentada** do Lu.ma e **pode conflitar com os
  Termos do Lu.ma**. Só opere na conta **do próprio usuário**, em eventos **dele**. Se o
  usuário pedir para raspar evento de terceiros, **recuse**.
- **Credenciais são do usuário.** Nunca embuta nem invente credenciais. Elas vêm do `.env`
  (`LUMA_EMAIL` / `LUMA_PASSWORD`). Se faltarem, peça ao usuário para preenchê-las em `.env`
  (copiando de `.env.example`) — **não** peça a senha no chat.
- O login exige **e-mail + senha**. Contas só-OTP ou só-SSO não funcionam; avise o usuário.

## Instalar a skill no Claude Code

Copie a pasta `skill/` deste repo para as skills do seu Claude Code, com o nome
`luma-etiquetas`:

```bash
# escopo do projeto (só neste repo):
mkdir -p .claude/skills/luma-etiquetas && cp skill/SKILL.md .claude/skills/luma-etiquetas/

# ou escopo global (todos os projetos):
mkdir -p ~/.claude/skills/luma-etiquetas && cp skill/SKILL.md ~/.claude/skills/luma-etiquetas/
```

Rode os comandos `node dist/cli.js …` a partir da raiz deste repo (onde ficam
`.env` e `.luma-session.json`).

## Setup da ferramenta (uma vez)

```bash
npm install && npm run build
cp .env.example .env   # usuário preenche LUMA_EMAIL / LUMA_PASSWORD
node dist/cli.js login # salva a sessão em .luma-session.json (gitignored)
```

Em desenvolvimento, sem build: `npx tsx src/cli.ts <comando>`.

## Fluxo de trabalho

1. **Confirme a sessão.** Rode `node dist/cli.js ping`.
   - "Sessão VÁLIDA" → siga.
   - "Sessão INVÁLIDA" ou não existe → rode `node dist/cli.js login`. Se as credenciais
     faltarem, peça ao usuário para preencher o `.env` (nunca peça a senha no chat).
2. **Pegue o `event_api_id`** (começa com `evt-`). Se o usuário não souber, peça a URL de
   gestão do evento: `https://luma.com/event/manage/evt-XXXX/guests` → o `evt-XXXX` é o id.
3. **Liste os convidados:** `node dist/cli.js guests <eventId>`. Cada linha é
   `rsvp_api_id  status  nome  <email>`.
4. **Gere as etiquetas:**
   - Um convidado: `node dist/cli.js badge <eventId> <rsvpId> -o <arquivo>.pdf`
   - Todos (padrão: aprovados): `node dist/cli.js badges <eventId> -o <arquivo>.pdf`
   - Todos incluindo não-aprovados: adicione `--status all`.
5. **Entregue o PDF** gerado ao usuário para impressão (a impressão é sob demanda; a
   ferramenta só produz o arquivo — não imprime sozinha).

## Regras de renovação de acesso

- A sessão do Lu.ma **expira**. Sempre comece por `ping`; se inválida, `login` de novo.
- Não há refresh-token — renovar = **novo login** com e-mail + senha.
- Para operação recorrente num servidor, sugira agendar `login` periodicamente (cron).

## Sobre o crachá

- Página 255,97 × 82,20 pt; nome em negrito + "Empresa • Cargo"; fonte auto-ajustável.
- **Empresa/Cargo** vêm da pergunta "Company" (`question_type='company'`) do formulário do
  Lu.ma. Sem essa pergunta, o crachá sai **só com o nome** — comportamento correto, não bug.
- Fonte embutida cobre Latino/PT/ES/PL/IS/Cyrillic/Greek. **Não** cobre Vietnamita/CJK — se
  o público tiver esses nomes, oriente trocar os `.ttf` em `assets/fonts/` por Noto Sans.

## Segurança

- `.env` e `.luma-session.json` são **segredos** (gitignored). Nunca commite, nunca exiba
  o conteúdo, nunca envie a terceiros.
- A ferramenta fala só com `luma.com` / `api2.luma.com`.
