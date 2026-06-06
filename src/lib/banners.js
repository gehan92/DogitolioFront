import { supabase } from './supabase'

// ── Public: fetch active banners for a given placement ──────────────────────
// placement: 'home' | 'listing' | 'all'
// Returns banners where placement matches OR placement is 'all'.
// Falls back to [] gracefully if the table doesn't exist yet.
export async function getBanners(placement) {
  try {
    let query = supabase
      .from('banners')
      .select('id, title, subtitle, image_url, cta_text, cta_link, placement, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (placement && placement !== 'all') {
      query = query.or(`placement.eq.${placement},placement.eq.all`)
    }

    const { data, error } = await query
    if (error) return []
    return data || []
  } catch {
    return []
  }
}

// ── Admin: list all banners (active + inactive) ──────────────────────────────
export async function adminListBanners() {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

// ── Admin: create or update a banner ─────────────────────────────────────────
// Pass { id, ...fields } to update; omit id to create.
export async function adminSaveBanner(banner) {
  const { id, ...fields } = banner
  if (id) {
    const { data, error } = await supabase
      .from('banners')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  }
  const { data, error } = await supabase
    .from('banners')
    .insert([fields])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// ── Admin: toggle active state ───────────────────────────────────────────────
export async function adminToggleBanner(id, is_active) {
  const { error } = await supabase
    .from('banners')
    .update({ is_active })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Admin: delete a banner ───────────────────────────────────────────────────
export async function adminDeleteBanner(id) {
  const { error } = await supabase
    .from('banners')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}
