// config.ts — lê as credenciais do adotante a partir do ambiente.
//
// As credenciais são SEMPRE do próprio adotante. Nada é embutido no código.
// Defina-as num arquivo .env (copie de .env.example) OU exporte no shell:
//   LUMA_EMAIL=voce@exemplo.com
//   LUMA_PASSWORD=suaSenha

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/** Carrega um .env simples (KEY=VALUE por linha) para process.env, sem dependências. */
export function loadDotEnv(file = resolve(process.cwd(), '.env')): void {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    if (!(key in process.env)) process.env[key] = val
  }
}

export function getCredentials(): { email: string; password: string } {
  const email = process.env.LUMA_EMAIL
  const password = process.env.LUMA_PASSWORD
  if (!email || !password) {
    throw new Error(
      'Faltam credenciais. Defina LUMA_EMAIL e LUMA_PASSWORD (copie .env.example para .env).',
    )
  }
  return { email, password }
}
