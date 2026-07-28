// login.ts — autenticação no Lu.ma por e-mail + senha.
//
// COMO FUNCIONA (engenharia reversa do fluxo de login do painel web do Lu.ma):
//   1. GET https://luma.com/signin        → pega o cookie anti-bot __cf_bm da Cloudflare
//   2. POST /auth/email/start-with-email   → informa o e-mail (passo que o site faz antes da senha)
//   3. POST /auth/sign-in-with-password    → envia e-mail + senha; a resposta traz, no Set-Cookie,
//      a chave de sessão `luma.auth-session-key`.
//
// O resultado é uma "cookie string" completa que autentica as chamadas seguintes
// (LumaClient). Essa sessão EXPIRA — reautentique periodicamente (veja README:
// "Requisitos de login e renovação de acesso").
//
// ⚠️ Isto usa endpoints internos e não-documentados do Lu.ma e pode conflitar com
//    os Termos de Serviço do Lu.ma. Cada adotante usa a PRÓPRIA conta. Veja o README.

const LUMA_BASE = 'https://api2.luma.com'
const LUMA_WEB = 'https://luma.com'

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: LUMA_WEB,
  Referer: `${LUMA_WEB}/`,
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
}

const cookieStr = (jar: Record<string, string>) =>
  Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')

export interface LoginResult {
  cookieString: string
  savedAt: string
}

/**
 * Faz login no Lu.ma e devolve a cookie string autenticada.
 * Lança erro com mensagem clara se as credenciais forem inválidas.
 */
export async function loginToLuma(email: string, password: string): Promise<LoginResult> {
  if (!email || !password) {
    throw new Error('E-mail e senha são obrigatórios (defina LUMA_EMAIL e LUMA_PASSWORD).')
  }

  // Passo 1: cookies iniciais (Cloudflare __cf_bm) + device id sintético.
  const initRes = await fetch(`${LUMA_WEB}/signin`, {
    headers: { 'User-Agent': BASE_HEADERS['User-Agent'] },
    redirect: 'follow',
  })
  const cfBm = initRes.headers.get('set-cookie')?.match(/__cf_bm=([^;]+)/)?.[1] || ''

  const jar: Record<string, string> = {
    'luma.did': `did-${Date.now()}`, // device id sintético
    'luma.first-page': encodeURIComponent('/signin'),
  }
  if (cfBm) jar['__cf_bm'] = cfBm

  // Passo 2: informa o e-mail (o site faz isso antes de pedir a senha).
  await fetch(`${LUMA_BASE}/auth/email/start-with-email`, {
    method: 'POST',
    headers: { ...BASE_HEADERS, 'Content-Type': 'application/json', Cookie: cookieStr(jar) },
    body: JSON.stringify({ email }),
  })

  // Passo 3: login com senha.
  const loginRes = await fetch(`${LUMA_BASE}/auth/sign-in-with-password`, {
    method: 'POST',
    headers: { ...BASE_HEADERS, 'Content-Type': 'application/json', Cookie: cookieStr(jar) },
    body: JSON.stringify({ email, password }),
  })

  if (!loginRes.ok) {
    const errText = await loginRes.text().catch(() => '')
    throw new Error(`Login no Lu.ma falhou: HTTP ${loginRes.status}. ${errText.slice(0, 200)}`)
  }

  const setCookies = loginRes.headers.get('set-cookie') || ''
  const sessionKey = setCookies.match(/luma\.auth-session-key=([^;]+)/)?.[1]
  if (!sessionKey) {
    throw new Error('Sessão não retornada pelo Lu.ma. Verifique e-mail/senha (e se a conta usa OTP).')
  }
  jar['luma.auth-session-key'] = sessionKey

  const newCfBm = setCookies.match(/__cf_bm=([^;]+)/)?.[1]
  if (newCfBm) jar['__cf_bm'] = newCfBm

  return { cookieString: cookieStr(jar), savedAt: new Date().toISOString() }
}
