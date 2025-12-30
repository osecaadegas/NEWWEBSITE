import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use SERVICE KEY for public access (bypasses RLS)
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY // This needs to be added to Vercel env vars
  );

  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Public ID required' });
  }

  // Get overlay by public_id
  const { data, error } = await supabase
    .from('overlays')
    .select('settings, updated_at')
    .eq('public_id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Overlay not found' });
    }
    return res.status(400).json({ error: error.message });
  }

  // Only return settings (not user_id or other sensitive data)
  res.status(200).json({
    settings: data.settings,
    updated_at: data.updated_at
  });
}
