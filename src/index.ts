// Ponto de entrada da biblioteca. Importe daqui se for usar em código:
//
//   import { loginToLuma, LumaClient, extractBadgeFields, generateBadgesPdf } from 'luma-etiquetas'

export { LumaClient } from './luma.js'
export type { LumaGuest } from './luma.js'
export { loginToLuma } from './login.js'
export type { LoginResult } from './login.js'
export { saveSession, loadSession, SESSION_FILE } from './session.js'
export { extractBadgeFields } from './fields.js'
export type { BadgeFields } from './fields.js'
export { generateBadgePdf, generateBadgesPdf, fit, MARGIN } from './badge.js'
