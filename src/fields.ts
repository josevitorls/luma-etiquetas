// fields.ts — extrai os 3 campos do crachá a partir do convidado CRU do Lu.ma.
//
// De onde vem cada campo (verificado contra payload real do /event/admin/get-guests):
//   guest.name                                            → nome
//   guest.registration_answers[] com question_type==='company':
//       .answer_company                                   → empresa
//       .answer_job_title                                 → cargo
//
// ⚠️ REQUISITO DO EVENTO: empresa e cargo só aparecem se o formulário de inscrição
//    do seu evento no Lu.ma tiver a pergunta padrão de "Company / Job title"
//    (question_type = 'company'). Sem ela, o crachá sai só com o nome — e isso é
//    o comportamento correto, não um erro. Veja o README.

import type { LumaGuest } from './luma.js'

export interface BadgeFields {
  name: string
  company: string | null
  jobTitle: string | null
}

const clean = (v: unknown): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t : null
}

export function extractBadgeFields(guest: LumaGuest): BadgeFields {
  const answers = Array.isArray(guest?.registration_answers) ? guest.registration_answers : []
  const company = answers.find((a) => (a as Record<string, unknown>)?.question_type === 'company') as
    | Record<string, unknown>
    | undefined
  return {
    name: clean(guest?.name) ?? '',
    company: clean(company?.answer_company),
    jobTitle: clean(company?.answer_job_title),
  }
}
