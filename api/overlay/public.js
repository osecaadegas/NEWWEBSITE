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
  const { data: overlayData, error: overlayError } = await supabase
    .from('overlays')
    .select('id, settings, updated_at, user_id')
    .eq('public_id', id)
    .single();

  if (overlayError) {
    if (overlayError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Overlay not found' });
    }
    return res.status(400).json({ error: overlayError.message });
  }

  // Fetch widgets from widgets table (NEW system)
  const { data: widgets, error: widgetsError } = await supabase
    .from('widgets')
    .select(`
      id,
      widget_type_id,
      name,
      enabled,
      position_x,
      position_y,
      width,
      height,
      scale,
      opacity,
      z_index,
      config,
      widget_type:widget_types(
        id,
        name,
        display_name,
        category
      )
    `)
    .eq('overlay_id', overlayData.id)
    .eq('enabled', true)
    .order('z_index', { ascending: true });

  if (widgetsError) {
    console.error('Error fetching widgets:', widgetsError);
  }

  // Fetch user data to get twitch username
  let userData = null;
  if (overlayData.user_id) {
    const { data: user } = await supabase.auth.admin.getUserById(overlayData.user_id);
    userData = user?.user;
  }

  // Return settings and relevant user info (twitch username only)
  res.status(200).json({
    widgets: widgets || [],
    theme: overlayData.settings?.theme || {},
    layout: overlayData.settings?.layout || {},
    updated_at: overlayData.updated_at,
    user: {
      id: overlayData.user_id, // Include user_id for data fetching
      ...userData
    }
  });
}
