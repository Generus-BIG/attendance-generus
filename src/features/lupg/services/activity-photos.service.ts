import { supabase } from '@/lib/supabase'
import { type ActivityPhotoRow } from '../types'

const BUCKET = 'lupg-activity-photos'
const SIGNED_URL_EXPIRY = 3600 // 1 hour

export async function listActivityPhotos(
  reportId: string
): Promise<ActivityPhotoRow[]> {
  const { data, error } = await supabase
    .from('lupg_activity_photos')
    .select('*')
    .eq('report_id', reportId)
    .order('sort_order')
    .order('created_at')
  if (error) throw error
  return (data ?? []) as ActivityPhotoRow[]
}

export async function uploadActivityPhoto(params: {
  reportId: string
  kelompokId: string
  monthKey: string
  file: File
  caption?: string
  sortOrder: number
}): Promise<ActivityPhotoRow> {
  const { reportId, kelompokId, monthKey, file, caption, sortOrder } = params
  const ext = file.type === 'image/webp' ? 'webp' : file.name.split('.').pop()
  const path = `${kelompokId}/${monthKey}/${crypto.randomUUID()}.${ext}`

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '31536000', // 1 year — immutable content-addressed
      upsert: false,
    })
  if (uploadError) throw uploadError

  // Insert metadata row
  const { data, error: dbError } = await supabase
    .from('lupg_activity_photos')
    .insert({
      report_id: reportId,
      storage_path: path,
      caption: caption ?? null,
      sort_order: sortOrder,
      file_size: file.size,
    })
    .select()
    .single()
  if (dbError) {
    // Cleanup storage on DB insert failure
    await supabase.storage.from(BUCKET).remove([path])
    throw dbError
  }
  return data as ActivityPhotoRow
}

export async function updatePhotoCaption(
  id: string,
  caption: string | null
): Promise<ActivityPhotoRow> {
  const { data, error } = await supabase
    .from('lupg_activity_photos')
    .update({ caption })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as ActivityPhotoRow
}

export async function deleteActivityPhoto(
  id: string,
  storagePath: string
): Promise<void> {
  // Delete DB row first (CASCADE won't help for storage)
  const { error: dbError } = await supabase
    .from('lupg_activity_photos')
    .delete()
    .eq('id', id)
  if (dbError) throw dbError

  // Delete from storage (best effort — orphaned files are acceptable)
  await supabase.storage.from(BUCKET).remove([storagePath])
}

export async function getSignedUrls(
  storagePaths: string[]
): Promise<Map<string, string>> {
  if (storagePaths.length === 0) return new Map()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(storagePaths, SIGNED_URL_EXPIRY)
  if (error) throw error
  const map = new Map<string, string>()
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) {
      map.set(item.path, item.signedUrl)
    }
  }
  return map
}

export async function deleteActivityPhotos(
  ids: string[],
  storagePaths: string[]
): Promise<void> {
  if (ids.length === 0) return

  // Delete DB rows first
  const { error: dbError } = await supabase
    .from('lupg_activity_photos')
    .delete()
    .in('id', ids)
  if (dbError) throw dbError

  // Delete files from storage
  if (storagePaths.length > 0) {
    await supabase.storage.from(BUCKET).remove(storagePaths)
  }
}

export async function reorderActivityPhotos(
  updates: { id: string; sort_order: number }[]
): Promise<void> {
  if (updates.length === 0) return

  // Update sorting orders in parallel
  const promises = updates.map((u) =>
    supabase
      .from('lupg_activity_photos')
      .update({ sort_order: u.sort_order })
      .eq('id', u.id)
  )
  const results = await Promise.all(promises)
  for (const r of results) {
    if (r.error) throw r.error
  }
}

