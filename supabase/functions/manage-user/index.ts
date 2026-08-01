import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface ManageUserRequest {
  action: 'list' | 'create' | 'update' | 'delete' | 'change_password'
  email?: string
  password?: string
  full_name?: string
  role?: 'admin' | 'team_manager' | 'member'
  kelompok?: string | null
  user_id?: string
  new_password?: string
  update_fields?: {
    role?: 'admin' | 'team_manager' | 'member'
    kelompok?: string | null
    full_name?: string
    password?: string
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Server misconfigured: missing env vars' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing or malformed authorization header' }, 401)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const token = authHeader.slice('Bearer '.length)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.getUser(token)
    if (authError || !authData.user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const callerId = authData.user.id
    const callerRole = authData.user.app_metadata?.role as string | undefined
    const body: ManageUserRequest = await req.json()
    const canRead = callerRole === 'super_admin' || callerRole === 'admin'
    const canManage = callerRole === 'super_admin'
    if (body.action === 'list' ? !canRead : !canManage) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    switch (body.action) {
      case 'list': {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers()
        if (error) throw error
        return jsonResponse({ users: data.users.map(serializeUser) })
      }
      case 'create': {
        if (!body.email || !body.password || !body.role) {
          return jsonResponse(
            { error: 'email, password, and role are required' },
            400
          )
        }
        if (body.role === 'team_manager' && !body.kelompok) {
          return jsonResponse(
            { error: 'kelompok is required for team_manager' },
            400
          )
        }
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: true,
          app_metadata: {
            role: body.role,
            kelompok: body.role === 'team_manager' ? body.kelompok : null,
          },
          user_metadata: { full_name: body.full_name ?? '' },
        })
        if (error) throw error
        return jsonResponse({ user: serializeUser(data.user) }, 201)
      }
      case 'update': {
        if (!body.user_id || !body.update_fields) {
          return jsonResponse(
            { error: 'user_id and update_fields are required' },
            400
          )
        }
        const updatePayload: Record<string, unknown> = {}
        const appMetadata: Record<string, unknown> = {}
        if (body.update_fields.role) {
          appMetadata.role = body.update_fields.role
          appMetadata.kelompok =
            body.update_fields.role === 'team_manager'
              ? body.update_fields.kelompok
              : null
        } else if (body.update_fields.kelompok !== undefined) {
          appMetadata.kelompok = body.update_fields.kelompok
        }
        if (body.update_fields.password) {
          updatePayload.password = body.update_fields.password
        }
        if (Object.keys(appMetadata).length) {
          updatePayload.app_metadata = appMetadata
        }
        if (body.update_fields.full_name) {
          updatePayload.user_metadata = {
            full_name: body.update_fields.full_name,
          }
        }
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
          body.user_id,
          updatePayload
        )
        if (error) throw error
        return jsonResponse({ user: serializeUser(data.user) })
      }
      case 'delete': {
        if (!body.user_id) {
          return jsonResponse({ error: 'user_id is required' }, 400)
        }
        if (body.user_id === callerId) {
          return jsonResponse({ error: 'Cannot delete your own account' }, 400)
        }
        const { error } = await supabaseAdmin.auth.admin.deleteUser(body.user_id)
        if (error) throw error
        return jsonResponse({ success: true })
      }
      case 'change_password': {
        if (!body.user_id || !body.new_password) {
          return jsonResponse(
            { error: 'user_id and new_password are required' },
            400
          )
        }
        if (body.new_password.length < 7) {
          return jsonResponse({ error: 'Password minimal 7 karakter' }, 400)
        }
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
          body.user_id,
          { password: body.new_password }
        )
        if (error) throw error
        return jsonResponse({ success: true })
      }
    }
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      500
    )
  }
})

function serializeUser(user: {
  id: string
  email?: string
  created_at: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
}) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name ?? null,
    role: user.app_metadata?.role,
    kelompok: user.app_metadata?.kelompok ?? null,
    created_at: user.created_at,
  }
}
