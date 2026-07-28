#!/usr/bin/env node
// cli.ts — interface de linha de comando do luma-etiquetas.
//
// Comandos:
//   login                              faz login no Lu.ma (usa LUMA_EMAIL/LUMA_PASSWORD) e salva a sessão
//   ping                               verifica se a sessão salva ainda é válida
//   guests <eventId>                   lista os convidados do evento (id, status, nome, e-mail)
//   badge  <eventId> <rsvpId> [-o f]   gera o PDF da etiqueta de UM convidado
//   badges <eventId> [--status s] [-o f]  gera um PDF com as etiquetas de TODOS (default: aprovados)
//
// <eventId> = o "event_api_id" do Lu.ma (começa com "evt-"). Veja o README.

import { writeFileSync } from 'node:fs'
import { loadDotEnv, getCredentials } from './config.js'
import { loginToLuma } from './login.js'
import { saveSession, loadSession } from './session.js'
import { LumaClient, type LumaGuest } from './luma.js'
import { extractBadgeFields } from './fields.js'
import { generateBadgePdf, generateBadgesPdf } from './badge.js'

function parseFlags(args: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = []
  const flags: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '-o' || a === '--out') flags.out = args[++i]
    else if (a === '--status') flags.status = args[++i]
    else positional.push(a)
  }
  return { positional, flags }
}

function requireClient(): LumaClient {
  const session = loadSession()
  if (!session) {
    console.error('Nenhuma sessão encontrada. Rode primeiro:  luma-etiquetas login')
    process.exit(1)
  }
  return new LumaClient(session.cookieString)
}

async function cmdLogin(): Promise<void> {
  loadDotEnv()
  const { email, password } = getCredentials()
  process.stdout.write(`Fazendo login no Lu.ma como ${email}… `)
  const result = await loginToLuma(email, password)
  saveSession(result)
  console.log('OK. Sessão salva em .luma-session.json')
  console.log('(A sessão expira — rode "login" de novo quando "ping" falhar.)')
}

async function cmdPing(): Promise<void> {
  const luma = requireClient()
  const { ok, status } = await luma.ping()
  if (ok) console.log('Sessão VÁLIDA ✓')
  else {
    console.error(`Sessão INVÁLIDA (HTTP ${status}). Rode:  luma-etiquetas login`)
    process.exit(1)
  }
}

async function cmdGuests(eventId: string): Promise<void> {
  if (!eventId) return usageExit('guests <eventId>')
  const luma = requireClient()
  const guests = await luma.getAllGuests(eventId)
  console.log(`${guests.length} convidado(s):\n`)
  for (const g of guests) {
    const status = (g.approval_status || '—').padEnd(16)
    console.log(`${g.api_id}  ${status}  ${g.name ?? ''}  <${g.email ?? ''}>`)
  }
}

async function cmdBadge(eventId: string, rsvpId: string, out?: string): Promise<void> {
  if (!eventId || !rsvpId) return usageExit('badge <eventId> <rsvpId> [-o arquivo.pdf]')
  const luma = requireClient()
  const guests = await luma.getAllGuests(eventId)
  const guest = guests.find((g: LumaGuest) => g.api_id === rsvpId)
  if (!guest) {
    console.error(`Convidado ${rsvpId} não encontrado no evento ${eventId}.`)
    process.exit(1)
  }
  const pdf = await generateBadgePdf(extractBadgeFields(guest))
  const file = out || `cracha-${rsvpId}.pdf`
  writeFileSync(file, pdf)
  console.log(`Etiqueta gerada: ${file}`)
}

async function cmdBadges(eventId: string, status = 'approved', out?: string): Promise<void> {
  if (!eventId) return usageExit('badges <eventId> [--status approved|all] [-o arquivo.pdf]')
  const luma = requireClient()
  let guests = await luma.getAllGuests(eventId)
  if (status !== 'all') guests = guests.filter((g: LumaGuest) => (g.approval_status || 'approved') === status)
  if (guests.length === 0) {
    console.error(`Nenhum convidado com status "${status}" no evento ${eventId}.`)
    process.exit(1)
  }
  const pdf = await generateBadgesPdf(guests.map(extractBadgeFields))
  const file = out || `crachas-${eventId}.pdf`
  writeFileSync(file, pdf)
  console.log(`${guests.length} etiqueta(s) geradas: ${file}`)
}

function usageExit(cmd: string): never {
  console.error(`Uso: luma-etiquetas ${cmd}`)
  process.exit(1)
}

function help(): void {
  console.log(`luma-etiquetas — gestão de convidados Lu.ma + impressão de etiquetas de crachá

Comandos:
  login                                  login no Lu.ma (usa LUMA_EMAIL/LUMA_PASSWORD) e salva a sessão
  ping                                   verifica se a sessão salva ainda é válida
  guests <eventId>                       lista os convidados do evento
  badge  <eventId> <rsvpId> [-o f.pdf]   gera a etiqueta de UM convidado
  badges <eventId> [--status s] [-o f]   gera as etiquetas de TODOS (default: aprovados; use --status all)

eventId = o event_api_id do Lu.ma (começa com "evt-").`)
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2)
  const { positional, flags } = parseFlags(rest)
  switch (cmd) {
    case 'login':
      return cmdLogin()
    case 'ping':
      return cmdPing()
    case 'guests':
      return cmdGuests(positional[0])
    case 'badge':
      return cmdBadge(positional[0], positional[1], flags.out)
    case 'badges':
      return cmdBadges(positional[0], flags.status, flags.out)
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      return help()
    default:
      console.error(`Comando desconhecido: ${cmd}\n`)
      help()
      process.exit(1)
  }
}

main().catch((err) => {
  console.error('Erro:', err instanceof Error ? err.message : err)
  process.exit(1)
})
