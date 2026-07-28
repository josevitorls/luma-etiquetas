// LumaClient — cliente da API interna do Lu.ma (api2.luma.com).
//
// Este cliente NÃO depende de nenhum banco de dados. Você o constrói passando
// uma "cookie string" já autenticada (veja login.ts / session.ts). A partir daí,
// os métodos abaixo espelham as chamadas que o painel web do Lu.ma faz.
//
// ⚠️ Esta é uma API INTERNA e não-documentada do Lu.ma. Ela pode mudar sem aviso
//    e o uso pode conflitar com os Termos de Serviço do Lu.ma. Leia o README.

const LUMA_BASE = 'https://api2.luma.com'

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://luma.com',
  Referer: 'https://luma.com/',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
}

/** Um convidado (entry) como o Lu.ma retorna em /event/admin/get-guests. */
export interface LumaGuest {
  api_id: string
  name: string | null
  email: string | null
  approval_status?: string
  last_checked_in_at?: string | null
  registration_answers?: Array<Record<string, unknown>>
  [key: string]: unknown
}

export class LumaClient {
  constructor(private cookieString: string) {}

  private headers(webUrl: string, hasBody = false): Record<string, string> {
    return {
      ...BASE_HEADERS,
      'x-luma-web-url': webUrl,
      Cookie: this.cookieString,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    }
  }

  /** Testa se a sessão (cookie) ainda é válida. */
  async ping(): Promise<{ ok: boolean; status: number }> {
    const res = await fetch(`${LUMA_BASE}/ping`, {
      method: 'POST',
      headers: this.headers('https://luma.com/home', true),
      body: '{}',
    })
    return { ok: res.ok, status: res.status }
  }

  /** Uma página de convidados de um evento. */
  async getGuests(
    eventApiId: string,
    cursor?: string,
  ): Promise<{ entries: LumaGuest[]; has_more: boolean; next_cursor?: string }> {
    const params = new URLSearchParams({
      event_api_id: eventApiId,
      pagination_limit: '100',
      query: '',
      sort_column: 'registered_or_created_at',
      sort_direction: 'desc',
    })
    if (cursor) params.set('pagination_cursor', cursor)
    const res = await fetch(`${LUMA_BASE}/event/admin/get-guests?${params}`, {
      headers: this.headers(`https://luma.com/event/manage/${eventApiId}/guests`),
    })
    if (!res.ok) throw new Error(`get-guests ${res.status} — sessão expirada? rode "login" de novo.`)
    return res.json() as Promise<{ entries: LumaGuest[]; has_more: boolean; next_cursor?: string }>
  }

  /** Todos os convidados do evento (segue a paginação até o fim). */
  async getAllGuests(eventApiId: string): Promise<LumaGuest[]> {
    const all: LumaGuest[] = []
    let cursor: string | undefined
    do {
      const r = await this.getGuests(eventApiId, cursor)
      all.push(...r.entries)
      cursor = r.has_more ? r.next_cursor : undefined
    } while (cursor)
    return all
  }

  // ───────────────────────────────────────────────────────────────────────
  // MÉTODOS DE GESTÃO (avançado — opcional).
  // Não são usados pelo fluxo de etiquetas. Ampliam a superfície de uso da API
  // interna do Lu.ma; use por sua conta e risco. Mantidos aqui para quem quiser
  // construir gestão de evento em cima da biblioteca.
  // ───────────────────────────────────────────────────────────────────────

  async updateGuestStatus(eventApiId: string, rsvpApiId: string, approvalStatus: string): Promise<unknown> {
    const res = await fetch(`${LUMA_BASE}/event/admin/update-guest-status`, {
      method: 'POST',
      headers: this.headers(`https://luma.com/event/manage/${eventApiId}/guests`, true),
      body: JSON.stringify({
        event_api_id: eventApiId,
        rsvp_api_id: rsvpApiId,
        approval_status: approvalStatus,
        should_refund: false,
        event_ticket_type_api_id: null,
      }),
    })
    if (!res.ok) throw new Error(`update-guest-status ${res.status}`)
    return (await res.json()).guest
  }

  async checkIn(eventApiId: string, rsvpApiId: string): Promise<unknown> {
    return this.updateCheckIn(eventApiId, rsvpApiId, 'checked-in')
  }

  async cancelCheckIn(eventApiId: string, rsvpApiId: string): Promise<unknown> {
    return this.updateCheckIn(eventApiId, rsvpApiId, 'not-checked-in')
  }

  private async updateCheckIn(eventApiId: string, rsvpApiId: string, status: string): Promise<unknown> {
    const res = await fetch(`${LUMA_BASE}/event/admin/update-check-in`, {
      method: 'POST',
      headers: {
        ...BASE_HEADERS,
        'x-luma-web-url': `https://luma.com/check-in/${eventApiId}`,
        'x-luma-document-referrer': `https://luma.com/event/manage/${eventApiId}/guests`,
        'x-luma-client-type': 'luma-web',
        'Content-Type': 'application/json',
        Cookie: this.cookieString,
      },
      body: JSON.stringify({
        event_api_id: eventApiId,
        check_in_method: 'guest-list',
        check_in_status: status,
        type: 'guest',
        rsvp_api_id: rsvpApiId,
      }),
    })
    if (!res.ok) throw new Error(`update-check-in ${res.status}`)
    return (await res.json()).guest
  }

  async downloadGuestsCsv(eventApiId: string): Promise<{ download_url: string; filename: string }> {
    const res = await fetch(
      `${LUMA_BASE}/event/admin/download-guests-csv?event_api_id=${eventApiId}&sort_column=registered_or_created_at&sort_direction=desc`,
      { headers: this.headers(`https://luma.com/event/manage/${eventApiId}/guests`) },
    )
    if (!res.ok) throw new Error(`download-guests-csv ${res.status}`)
    return res.json()
  }
}
