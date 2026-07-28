// badge.ts — gera o PDF da etiqueta de crachá (uma página por convidado).
//
// Layout (idêntico ao usado em produção pela dzb.events):
//   • Página 255,97 × 82,20 pt (etiqueta adesiva pequena)
//   • Nome em NEGRITO, MAIÚSCULAS, centralizado
//   • 2ª linha: "Empresa • Cargo", regular, centralizada
//   • Fonte auto-ajustável: encolhe até caber na largura útil
//
// FONTE: Liberation Sans (Regular/Bold) — clone métrico do Arial sob a licença
// SIL Open Font License 1.1 (ver assets/fonts/OFL.txt). Escolhida por: (a) ser
// livre para redistribuir num repositório público; (b) manter cobertura Unicode
// completa (acentos, Ł, Þ, ç, ã, Cyrillic, Greek…) — crucial num evento
// internacional, onde a fonte embutida "Helvetica" do pdf-lib QUEBRARIA em
// qualquer caractere fora do CP1252.

import { PDFDocument, rgb, type PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import type { BadgeFields } from './fields.js'

const PAGE_W = 255.97
const PAGE_H = 82.2
export const MARGIN = 7.09 // ~2,5 mm em pt
const BULLET = '•'
const NAME_SIZE = 13
const LINE2_SIZE = 9
const BLACK = rgb(0, 0, 0)

const FONT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'fonts')
const REG_BYTES = readFileSync(resolve(FONT_DIR, 'LiberationSans-Regular.ttf'))
const BOLD_BYTES = readFileSync(resolve(FONT_DIR, 'LiberationSans-Bold.ttf'))

/** Encolhe a fonte de 0,5 em 0,5 pt até o texto caber em maxW. */
export function fit(font: PDFFont, text: string, size: number, maxW: number): number {
  let s = size
  while (s > 5 && font.widthOfTextAtSize(text, s) > maxW) s -= 0.5
  return s
}

export async function generateBadgePdf(fields: BadgeFields): Promise<Uint8Array> {
  return renderBadges([fields])
}

export async function generateBadgesPdf(list: BadgeFields[]): Promise<Uint8Array> {
  return renderBadges(list)
}

async function renderBadges(list: BadgeFields[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const bold = await doc.embedFont(BOLD_BYTES, { subset: true })
  const reg = await doc.embedFont(REG_BYTES, { subset: true })
  for (const f of list) addBadgePage(doc, bold, reg, f)
  return doc.save()
}

function addBadgePage(doc: PDFDocument, bold: PDFFont, reg: PDFFont, fields: BadgeFields): void {
  const page = doc.addPage([PAGE_W, PAGE_H])
  const maxW = PAGE_W - 2 * MARGIN
  const name = (fields.name || '').toUpperCase()
  const parts = [fields.company, fields.jobTitle].filter(Boolean) as string[]
  const line2 = parts.join(` ${BULLET} `)
  const hasLine2 = line2.length > 0

  const nameSize = fit(bold, name, NAME_SIZE, maxW)
  const line2Size = hasLine2 ? fit(reg, line2, LINE2_SIZE, maxW) : 0
  const gap = hasLine2 ? 3 : 0
  const totalH = nameSize + gap + line2Size
  let y = (PAGE_H + totalH) / 2 - nameSize // baseline da 1ª linha (bloco centralizado na vertical)

  const nameW = bold.widthOfTextAtSize(name, nameSize)
  page.drawText(name, { x: (PAGE_W - nameW) / 2, y, size: nameSize, font: bold, color: BLACK })

  if (hasLine2) {
    y -= gap + line2Size
    const w2 = reg.widthOfTextAtSize(line2, line2Size)
    page.drawText(line2, { x: (PAGE_W - w2) / 2, y, size: line2Size, font: reg, color: BLACK })
  }
}
