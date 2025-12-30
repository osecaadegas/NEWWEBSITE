import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No authorization token' });
  }

  // Create authenticated Supabase client with user's token
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Check if user has premium role
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'premium')
    .single();

  if (roleError || !roleData) {
    return res.status(403).json({ error: 'Premium access required' });
  }

  const { settings } = req.body;
  if (!settings) {
    return res.status(400).json({ error: 'Settings required' });
  }

  // Update user's overlay
  const { data, error } = await supabase
    .from('overlays')
    .update({ 
      settings, 
      updated_at: new Date().toISOString() 
    })
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(200).json(data);
}
