import { createClient } from '@supabase/supabase-js'

interface EdgeRuntime {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const edgeRuntime = (
  globalThis as typeof globalThis & { Deno: EdgeRuntime }
).Deno

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const assignableRoles = ['admin', 'team_manager', 'mt', 'member'] as const
type AssignableRole = (typeof assignableRoles)[number]

function isAssignableRole(role: unknown): role is AssignableRole {
  return typeof role === 'string' && assignableRoles.includes(role as AssignableRole)
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
  role?: AssignableRole
  kelompok?: string | null
  user_id?: string
  new_password?: string
  update_fields?: {
    role?: AssignableRole
    kelompok?: string | null
    full_name?: string
    password?: string
  }
}

edgeRuntime.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = edgeRuntime.env.get('SUPABASE_URL')
    const serviceRoleKey = edgeRuntime.env.get('SUPABASE_SERVICE_ROLE_KEY')
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
        if (!isAssignableRole(body.role)) {
          return jsonResponse({ error: 'Invalid role' }, 400)
        }
        if ((body.role === 'team_manager' || body.role === 'mt') && !body.kelompok) {
          return jsonResponse(
            { error: 'kelompok is required for team_manager or mt' },
            400
          )
        }
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: true,
          app_metadata: {
            role: body.role,
            kelompok:
              body.role === 'team_manager' || body.role === 'mt'
                ? body.kelompok
                : null,
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
        if (
          body.update_fields.role !== undefined ||
          body.update_fields.kelompok !== undefined
        ) {
          const { data: targetUser, error: targetUserError } =
            await supabaseAdmin.auth.admin.getUserById(body.user_id)
          if (targetUserError || !targetUser.user) throw targetUserError

          const role = body.update_fields.role ?? targetUser.user.app_metadata.role
          if (!isAssignableRole(role)) {
            return jsonResponse({ error: 'Invalid role' }, 400)
          }
          const kelompok = body.update_fields.kelompok ?? targetUser.user.app_metadata.kelompok
          if ((role === 'team_manager' || role === 'mt') && !kelompok) {
            return jsonResponse(
              { error: 'kelompok is required for team_manager or mt' },
              400
            )
          }
          appMetadata.role = role
          appMetadata.kelompok =
            role === 'team_manager' || role === 'mt' ? kelompok : null
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
