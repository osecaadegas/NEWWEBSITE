import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

  // Check if user already has an overlay
  const { data: existingOverlay } = await supabase
    .from('overlays')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (existingOverlay) {
    return res.status(200).json(existingOverlay);
  }

  // Generate unique public_id
  const publicId = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);

  // Create new overlay
  const { data, error } = await supabase
    .from('overlays')
    .insert([
      {
        user_id: user.id,
        public_id: publicId,
        settings: {
          widgets: {
            bonusHunt: { enabled: true, position: { x: 50, y: 50 } },
            sessionStats: { enabled: false, position: { x: 50, y: 200 } },
            recentWins: { enabled: false, position: { x: 50, y: 350 } },
            tournaments: { enabled: false, position: { x: 50, y: 500 } },
            coinflip: { enabled: false, position: { x: 50, y: 650 } },
            slotmachine: { enabled: false, position: { x: 50, y: 800 } },
            randomSlotPicker: { enabled: false, position: { x: 50, y: 950 } },
            wheelOfNames: { enabled: false, position: { x: 50, y: 1100 } },
            navbar: { enabled: false, position: { x: 0, y: 0 } },
            customization: { enabled: false, position: { x: 50, y: 1250 } }
          },
          theme: {
            primaryColor: '#d4af37',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            fontFamily: 'Inter'
          }
        }
      }
    ])
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
}
