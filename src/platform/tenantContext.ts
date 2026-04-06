import { createClient } from '@supabase/supabase-js'

export type TenantContext = {
  organizationId: string
  userId: string
}

export async function resolveTenantContext(supabase:any):Promise<TenantContext | null>{

  const { data: userData } = await supabase.auth.getUser()

  if(!userData?.user) return null

  const userId = userData.user.id

  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .single()

  if(!membership) return null

  return {
    organizationId: membership.organization_id,
    userId
  }
}
