// session.ts — persistência LOCAL da sessão do Lu.ma.
//
// A sessão (cookie autenticado) é guardada num arquivo JSON no diretório de
// trabalho: `.luma-session.json`. Esse arquivo contém um SEGREDO (equivale a
// estar logado na sua conta Lu.ma) — ele está no .gitignore e NUNCA deve ser
// commitado nem compartilhado.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { LoginResult } from './login.js'

export const SESSION_FILE = resolve(process.cwd(), '.luma-session.json')

export function saveSession(session: LoginResult, file = SESSION_FILE): void {
  writeFileSync(file, JSON.stringify(session, null, 2), { encoding: 'utf8', mode: 0o600 })
}

export function loadSession(file = SESSION_FILE): LoginResult | null {
  if (!existsSync(file)) return null
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    if (typeof raw?.cookieString === 'string' && raw.cookieString.length > 0) return raw as LoginResult
    return null
  } catch {
    return null
  }
}
