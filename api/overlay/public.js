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
    .select('settings, updated_at, user_id')
    .eq('public_id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Overlay not found' });
    }
    return res.status(400).json({ error: error.message });
  }

  // Fetch user data to get twitch username
  let userData = null;
  if (data.user_id) {
    const { data: user } = await supabase.auth.admin.getUserById(data.user_id);
    userData = user?.user;
  }

  // Convert widgets object to array format expected by OverlayV2
  const widgetsObject = data.settings?.widgets || {};
  const widgetsArray = Object.entries(widgetsObject).map(([name, config]) => ({
    name,
    ...config
  }));

  // Return settings and relevant user info (twitch username only)
  res.status(200).json({
    widgets: widgetsArray,
    theme: data.settings?.theme || {},
    layout: data.settings?.layout || {},
    updated_at: data.updated_at,
    user: {
      id: data.user_id, // Include user_id for data fetching
      ...userData
    }
  });
}
