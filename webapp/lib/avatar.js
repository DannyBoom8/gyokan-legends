import { supabase } from './supabase'

// profile pictures are the 50 most popular characters
export const AVATAR_COUNT = 50
export const fetchAvatars = async () => {
  const { data } = await supabase.from('characters').select('character_id, name, image_url')
    .order('favourites', { ascending: false }).limit(AVATAR_COUNT)
  return data || []
}

// the chosen picture, or a stable default taken from the name until one is chosen
export const avatarFor = (list, username = '', id) =>
  list.find(c => c.character_id === id) ||
  list[[...username].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % (list.length || 1)]
