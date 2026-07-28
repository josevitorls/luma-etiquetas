// Verificação offline do gerador de etiquetas (não precisa de conta Lu.ma).
//
// Duas partes:
//   1) COBERTURA da fonte embutida (Liberation Sans / Arimo, OFL) — reporta, por
//      código-ponto, o que a fonte cobre. Latino completo, acentos do PT/ES/FR,
//      Ł (polonês), Þ (islandês), Cyrillic e Greek são cobertos. Vietnamita
//      (ư ơ ị ễ) e CJK (中文) NÃO são — documentado como limitação no README.
//   2) RENDER dos nomes dentro do alcance suportado — precisam gerar PDF sem erro.
import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import fontkit from '@pdf-lib/fontkit'
import { generateBadgePdf, generateBadgesPdf } from '../src/badge.js'
import type { BadgeFields } from '../src/fields.js'

const here = dirname(fileURLToPath(import.meta.url))
const reg = fontkit.create(readFileSync(resolve(here, '..', 'assets', 'fonts', 'LiberationSans-Regular.ttf')))

// --- Parte 1: relatório de cobertura (transparência, não é gate) ---
const coverage: [string, number][] = [
  ['á/ã/ç (PT)', 0x00e3], ['ñ (ES)', 0x00f1], ['ü (DE)', 0x00fc], ['Ł (PL)', 0x0141],
  ['Þ (IS)', 0x00de], ['Ж (Cyrillic)', 0x0416], ['α (Greek)', 0x03b1],
  ['ễ (Vietnamita)', 0x1ec5], ['中 (CJK)', 0x4e2d],
]
console.log('Cobertura da fonte embutida (Liberation Sans):')
for (const [label, cp] of coverage) {
  console.log(`  ${reg.hasGlyphForCodePoint(cp) ? '✓ cobre ' : '✗ NÃO   '} ${label}`)
}
console.log()

// --- Parte 2: render dentro do alcance suportado (gate) ---
const cases: BadgeFields[] = [
  { name: 'José Vitor', company: 'DZB Invest', jobTitle: 'Sócio' },
  { name: 'María Fernández', company: 'Buenos Aires Capital', jobTitle: 'Directora' },
  { name: 'Łukasz Kowalski', company: 'Warszawa Ventures', jobTitle: 'CTO' },
  { name: 'Þórunn Ragnarsdóttir', company: 'Reykjavík Labs', jobTitle: 'Head of Ops' },
  { name: 'Иван Петров', company: 'Moscow Tech', jobTitle: 'Инженер' },
  { name: 'Só Nome' },
]

let failures = 0
for (const c of cases) {
  try {
    const pdf = await generateBadgePdf(c)
    if (pdf.length < 500) throw new Error(`PDF suspeito de vazio (${pdf.length} bytes)`)
    console.log(`OK  "${c.name}" → ${pdf.length} bytes`)
  } catch (e) {
    failures++
    console.error(`FALHOU  "${c.name}": ${e instanceof Error ? e.message : e}`)
  }
}

const all = await generateBadgesPdf(cases)
writeFileSync(resolve(here, 'crachas-teste.pdf'), all)
console.log(`\ncrachas-teste.pdf escrito (${all.length} bytes, ${cases.length} páginas)`)

if (failures > 0) {
  console.error(`\n${failures} caso(s) falharam.`)
  process.exit(1)
}
console.log('\nTODOS OS CASOS PASSARAM ✓  (Latino/PT/ES/PL/IS + Cyrillic)')
