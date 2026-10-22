const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MAX_PAYLOAD_BYTES = 16 * 1024 // 16 KB
const RATE_LIMIT_MAX_REQUESTS = 5
const RATE_LIMIT_WINDOW_SECONDS = 3600 // 1 hora

function resolveCorsOrigin(requestOrigin, allowedOriginEnv) {
  if (!requestOrigin) return allowedOriginEnv || ''
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestOrigin)) {
    return requestOrigin
  }
  const allowedList = String(allowedOriginEnv || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (allowedList.includes(requestOrigin)) {
    return requestOrigin
  }
  return allowedList[0] || ''
}

function buildCorsHeaders(request, env) {
  const originHeader = request.headers.get('Origin') || ''
  const allowedOrigin = resolveCorsOrigin(originHeader, env.ALLOWED_ORIGIN)

  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }

  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin
  }

  return headers
}

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
    },
  })
}

function stripHeaderBreaks(str) {
  return String(str || '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function checkRateLimit(env, clientIp) {
  if (!env.RATE_LIMIT || typeof env.RATE_LIMIT.get !== 'function') {
    return { allowed: true }
  }

  try {
    const key = `rl:contact:${clientIp}`
    const currentRaw = await env.RATE_LIMIT.get(key)
    const count = currentRaw ? parseInt(currentRaw, 10) || 0 : 0

    if (count >= RATE_LIMIT_MAX_REQUESTS) {
      return { allowed: false }
    }

    await env.RATE_LIMIT.put(key, String(count + 1), {
      expirationTtl: RATE_LIMIT_WINDOW_SECONDS,
    })

    return { allowed: true }
  } catch (err) {
    console.error('Aviso: falha ao consultar KV RATE_LIMIT (fallback gracioso ativado):', err)
    return { allowed: true }
  }
}

async function verifyTurnstileIfConfigured(env, token, clientIp) {
  if (!env.TURNSTILE_SECRET) {
    return true
  }
  if (!token) {
    return false
  }

  try {
    const formData = new URLSearchParams()
    formData.set('secret', env.TURNSTILE_SECRET)
    formData.set('response', token)
    if (clientIp) formData.set('remoteip', clientIp)

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    })
    const outcome = await res.json()
    return Boolean(outcome?.success)
  } catch (err) {
    console.error('Erro ao validar Cloudflare Turnstile:', err)
    return false
  }
}

export default {
  async fetch(request, env) {
    const corsHeaders = buildCorsHeaders(request, env)
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (url.pathname !== '/contact') {
      return jsonResponse({ ok: false, error: 'Rota não encontrada.' }, 404, corsHeaders)
    }

    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'Método não permitido.' }, 405, corsHeaders)
    }

    const contentType = request.headers.get('Content-Type') || ''
    if (!contentType.toLowerCase().includes('application/json')) {
      return jsonResponse(
        { ok: false, error: 'Content-Type deve ser application/json.' },
        400,
        corsHeaders,
      )
    }

    const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10)
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return jsonResponse({ ok: false, error: 'Payload muito grande.' }, 413, corsHeaders)
    }

    let rawBody
    try {
      rawBody = await request.text()
    } catch {
      return jsonResponse({ ok: false, error: 'Corpo da requisição inválido.' }, 400, corsHeaders)
    }

    if (rawBody.length > MAX_PAYLOAD_BYTES) {
      return jsonResponse({ ok: false, error: 'Payload muito grande.' }, 413, corsHeaders)
    }

    let payload
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return jsonResponse({ ok: false, error: 'JSON malformado.' }, 400, corsHeaders)
    }

    // Honeypot preenchido: responde 200 silenciosamente sem enviar e-mail
    if (payload?.honeypot && String(payload.honeypot).trim().length > 0) {
      return jsonResponse(
        { ok: true, message: 'Mensagem recebida com sucesso.' },
        200,
        corsHeaders,
      )
    }

    const name = stripHeaderBreaks(payload?.name)
    const email = stripHeaderBreaks(payload?.email)
    const subject = stripHeaderBreaks(payload?.subject)
    const message = String(payload?.message || '').trim()

    if (!name || name.length < 2 || name.length > 100) {
      return jsonResponse(
        { ok: false, error: 'O nome deve ter entre 2 e 100 caracteres.' },
        400,
        corsHeaders,
      )
    }

    if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
      return jsonResponse({ ok: false, error: 'Informe um e-mail válido.' }, 400, corsHeaders)
    }

    if (subject.length > 150) {
      return jsonResponse(
        { ok: false, error: 'O assunto deve ter no máximo 150 caracteres.' },
        400,
        corsHeaders,
      )
    }

    if (!message || message.length < 10 || message.length > 2000) {
      return jsonResponse(
        { ok: false, error: 'A mensagem deve ter entre 10 e 2000 caracteres.' },
        400,
        corsHeaders,
      )
    }

    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown'

    // Verificação opcional do Cloudflare Turnstile (ativa somente se TURNSTILE_SECRET estiver configurado)
    const turnstileOk = await verifyTurnstileIfConfigured(
      env,
      payload?.turnstileToken,
      clientIp,
    )
    if (!turnstileOk) {
      return jsonResponse(
        { ok: false, error: 'Falha na verificação de segurança.' },
        400,
        corsHeaders,
      )
    }

    // Rate limiting por IP no KV (5 envios por hora)
    const rateStatus = await checkRateLimit(env, clientIp)
    if (!rateStatus.allowed) {
      return jsonResponse(
        {
          ok: false,
          error: 'Limite de envios atingido. Tente novamente mais tarde.',
        },
        429,
        corsHeaders,
      )
    }

    if (!env.RESEND_API_KEY || !env.TO_EMAIL || !env.FROM_EMAIL) {
      console.error('Configuração ausente: RESEND_API_KEY, TO_EMAIL ou FROM_EMAIL não definidos.')
      return jsonResponse(
        { ok: false, error: 'Erro interno ao processar o envio.' },
        500,
        corsHeaders,
      )
    }

    const timestampIso = new Date().toISOString()
    const cleanSubject = subject || 'Novo contato'
    const emailSubject = `[Portfólio] ${cleanSubject} - ${name}`

    const safeName = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safeSubject = escapeHtml(cleanSubject)
    const safeMessageHtml = escapeHtml(message).replace(/\r?\n/g, '<br />')
    const safeIp = escapeHtml(clientIp)

    const textContent = [
      `Novo contato recebido pelo portfólio de Henrique Silveira`,
      `---------------------------------------------------------`,
      `Nome: ${name}`,
      `E-mail: ${email}`,
      `Assunto: ${cleanSubject}`,
      `Data/Hora (UTC): ${timestampIso}`,
      `IP: ${clientIp}`,
      ``,
      `Mensagem:`,
      message,
    ].join('\n')

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(emailSubject)}</title>
  </head>
  <body style="margin:0;padding:24px;background-color:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e1e4e8;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#161b22;border:1px solid #30363d;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:20px 24px;border-bottom:1px solid #30363d;">
          <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#f97583;font-weight:700;">// Portfólio Henrique Silveira</p>
          <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;">${safeSubject}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 8px;font-size:14px;"><strong>Nome:</strong> ${safeName}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>E-mail:</strong> <a href="mailto:${safeEmail}" style="color:#79b8ff;text-decoration:none;">${safeEmail}</a></p>
          <p style="margin:0 0 16px;font-size:12px;color:#8b949e;"><strong>Data/Hora:</strong> ${timestampIso} &bull; <strong>IP:</strong> ${safeIp}</p>
          <div style="padding:16px;background-color:#0d1117;border-left:3px solid #79b8ff;border-radius:6px;font-size:14px;line-height:1.6;color:#e1e4e8;">
            ${safeMessageHtml}
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`

    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.FROM_EMAIL,
          to: [env.TO_EMAIL],
          reply_to: email,
          subject: emailSubject,
          text: textContent,
          html: htmlContent,
        }),
      })

      if (!resendRes.ok) {
        const errText = await resendRes.text()
        console.error('Falha na Resend API:', resendRes.status, errText)
        return jsonResponse(
          { ok: false, error: 'Erro interno ao enviar a mensagem.' },
          500,
          corsHeaders,
        )
      }

      return jsonResponse(
        { ok: true, message: 'Mensagem enviada com sucesso! Retornarei em breve.' },
        200,
        corsHeaders,
      )
    } catch (err) {
      console.error('Exceção ao chamar a Resend API:', err)
      return jsonResponse(
        { ok: false, error: 'Erro interno ao processar o envio.' },
        500,
        corsHeaders,
      )
    }
  },
}
