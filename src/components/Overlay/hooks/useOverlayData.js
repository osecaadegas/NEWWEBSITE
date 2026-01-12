/**
 * Overlay Data Provider
 * Fetches and manages real-time data for all overlay widgets
 * Subscribes to Supabase tables and provides data to widget components
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';

export function useOverlayData(userId) {
  const [data, setData] = useState({
    bonuses: [],
    bonusStats: null,
    activeHunt: null,
    activeHuntBonuses: [],
    tournaments: [],
    tournamentRounds: [],
    slotHistory: [],
    sessionStats: null,
    currentSlot: null
  });

  const [loading, setLoading] = useState(true);

  // ============================================================================
  // INITIAL DATA FETCH
  // ============================================================================

  useEffect(() => {
    if (!userId) return;

    const fetchAllData = async () => {
      try {
        console.log('🔄 Fetching overlay data for user:', userId);
        
        const [
          bonusesRes,
          statsRes,
          activeHuntRes,
          activeHuntBonusesRes,
          tournamentsRes,
          roundsRes,
          slotsRes,
          sessionRes
        ] = await Promise.all([
          // Fetch bonus hunt history (last 50 bonuses)
          supabase
            .from('bonus_hunt_history')
            .select('*')
            .eq('user_id', userId)
            .order('opened_at', { ascending: false })
            .limit(50),

          // Fetch aggregated bonus stats
          supabase
            .from('bonus_hunt_stats')
            .select('*')
            .eq('user_id', userId)
            .single(),

          // Fetch active bonus hunt session (is_active_for_display = true)
          supabase
            .from('bonus_hunt_sessions')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active_for_display', true)
            .limit(1)
            .single(),

          // Fetch bonuses from active hunt session
          supabase
            .from('bonus_hunt_history')
            .select('*')
            .eq('user_id', userId)
            .not('session_id', 'is', null)
            .order('created_at', { ascending: true }),

          // Fetch active tournaments
          supabase
            .from('tournament_history')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false }),

          // Fetch tournament rounds for active tournaments
          supabase
            .from('tournament_rounds')
            .select('*')
            .order('round_number'),

          // Fetch slot history (top 20 most played)
          supabase
            .from('slot_history')
            .select('*')
            .eq('user_id', userId)
            .order('total_plays', { ascending: false })
            .limit(20),

          // Fetch today's session stats
          supabase
            .from('daily_sessions')
            .select('*')
            .eq('user_id', userId)
            .eq('session_date', new Date().toISOString().split('T')[0])
            .single()
        ]);

        console.log('📊 Data fetched:');
        console.log('  Bonuses:', bonusesRes.data?.length || 0);
        console.log('  Stats:', statsRes.data ? 'Found' : 'None');
        console.log('  Active Hunt:', activeHuntRes.data ? activeHuntRes.data.hunt_name : 'None');
        console.log('  Active Hunt Bonuses:', activeHuntBonusesRes.data?.length || 0);
        console.log('  Tournaments:', tournamentsRes.data?.length || 0);
        console.log('  Rounds:', roundsRes.data?.length || 0);
        console.log('  Slots:', slotsRes.data?.length || 0);
        console.log('  Session:', sessionRes.data ? 'Found' : 'None');

        // Filter active hunt bonuses if we have an active hunt
        let activeHuntBonuses = [];
        if (activeHuntRes.data) {
          activeHuntBonuses = (activeHuntBonusesRes.data || []).filter(
            b => b.session_id === activeHuntRes.data.id
          );
        }

        setData({
          bonuses: bonusesRes.data || [],
          bonusStats: statsRes.data || null,
          activeHunt: activeHuntRes.data || null,
          activeHuntBonuses: activeHuntBonuses,
          tournaments: tournamentsRes.data || [],
          tournamentRounds: roundsRes.data || [],
          slotHistory: slotsRes.data || [],
          sessionStats: sessionRes.data || null,
          currentSlot: null // Set by user
        });

        setLoading(false);
      } catch (error) {
        console.error('❌ Error fetching overlay data:', error);
        setLoading(false);
      }
    };

    fetchAllData();
  }, [userId]);

  // ============================================================================
  // REALTIME SUBSCRIPTIONS
  // ============================================================================

  useEffect(() => {
    if (!userId) return;

    // Subscribe to bonus hunt changes
    const bonusChannel = supabase
      .channel('bonus_hunt_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bonus_hunt_history',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('Bonus hunt changed:', payload);
        
        if (payload.eventType === 'INSERT') {
          setData(prev => ({
            ...prev,
            bonuses: [payload.new, ...prev.bonuses].slice(0, 50)
          }));
        } else if (payload.eventType === 'UPDATE') {
          setData(prev => ({
            ...prev,
            bonuses: prev.bonuses.map(b => 
              b.id === payload.new.id ? payload.new : b
            )
          }));
        } else if (payload.eventType === 'DELETE') {
          setData(prev => ({
            ...prev,
            bonuses: prev.bonuses.filter(b => b.id !== payload.old.id)
          }));
        }
      })
      .subscribe();

    // Subscribe to bonus stats changes
    const statsChannel = supabase
      .channel('bonus_stats_realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bonus_hunt_stats',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('Bonus stats updated:', payload);
        setData(prev => ({
          ...prev,
          bonusStats: payload.new
        }));
      })
      .subscribe();

    // Subscribe to tournament changes
    const tournamentChannel = supabase
      .channel('tournament_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_history',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('Tournament changed:', payload);
        
        if (payload.eventType === 'INSERT') {
          setData(prev => ({
            ...prev,
            tournaments: [payload.new, ...prev.tournaments]
          }));
        } else if (payload.eventType === 'UPDATE') {
          setData(prev => ({
            ...prev,
            tournaments: prev.tournaments.map(t => 
              t.id === payload.new.id ? payload.new : t
            )
          }));
        }
      })
      .subscribe();

    // Subscribe to tournament round changes
    const roundsChannel = supabase
      .channel('tournament_rounds_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_rounds'
      }, (payload) => {
        console.log('Tournament round changed:', payload);
        
        if (payload.eventType === 'INSERT') {
          setData(prev => ({
            ...prev,
            tournamentRounds: [...prev.tournamentRounds, payload.new]
          }));
        } else if (payload.eventType === 'UPDATE') {
          setData(prev => ({
            ...prev,
            tournamentRounds: prev.tournamentRounds.map(r => 
              r.id === payload.new.id ? payload.new : r
            )
          }));
        }
      })
      .subscribe();

    // Subscribe to slot history changes
    const slotHistoryChannel = supabase
      .channel('slot_history_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'slot_history',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('Slot history changed:', payload);
        
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setData(prev => ({
            ...prev,
            slotHistory: [
              payload.new,
              ...prev.slotHistory.filter(s => s.id !== payload.new.id)
            ].slice(0, 20)
          }));
        }
      })
      .subscribe();

    // Subscribe to session stats changes
    const sessionChannel = supabase
      .channel('session_stats_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_sessions',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('Session stats changed:', payload);
        setData(prev => ({
          ...prev,
          sessionStats: payload.new
        }));
      })
      .subscribe();

    // Cleanup subscriptions
    return () => {
      bonusChannel.unsubscribe();
      statsChannel.unsubscribe();
      tournamentChannel.unsubscribe();
      roundsChannel.unsubscribe();
      slotHistoryChannel.unsubscribe();
      sessionChannel.unsubscribe();
    };
  }, [userId]);

  return { data, loading };
}
