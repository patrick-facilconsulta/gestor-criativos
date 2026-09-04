import { createClient } from 'npm:@supabase/supabase-js@2'

const ADMIN_EMAIL = 'patrick@facilconsulta.com.br'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function responder(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (request.method !== 'POST') {
    return responder({ erro: 'Método não permitido.' }, 405)
  }

  const authorization = request.headers.get('Authorization')
  if (!authorization) {
    return responder({ erro: 'Usuário não autenticado.' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return responder({ erro: 'Função não configurada.' }, 500)
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: { user }, error: userError } = await authClient.auth.getUser()

  if (userError || user?.email?.toLowerCase() !== ADMIN_EMAIL) {
    return responder({ erro: 'Você não tem permissão para convidar usuários.' }, 403)
  }

  let body: { email?: string; redirectTo?: string }
  try {
    body = await request.json()
  } catch {
    return responder({ erro: 'Dados inválidos.' }, 400)
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return responder({ erro: 'Informe um e-mail válido.' }, 400)
  }

  try {
    const redirectUrl = new URL(body.redirectTo ?? '')
    if (!['http:', 'https:'].includes(redirectUrl.protocol) || redirectUrl.pathname !== '/redefinir-senha') {
      return responder({ erro: 'URL de redirecionamento inválida.' }, 400)
    }
  } catch {
    return responder({ erro: 'URL de redirecionamento inválida.' }, 400)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: body.redirectTo,
  })

  if (error) {
    return responder({ erro: 'Não foi possível enviar o convite. O e-mail pode já estar cadastrado.' }, 400)
  }

  return responder({ mensagem: 'Convite enviado.' }, 200)
})