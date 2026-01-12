/**
 * Enhanced Overlay Component
 * Production-ready SaaS overlay for OBS
 * - Real-time updates via Supabase Realtime
 * - Subscription validation
 * - Multi-widget support
 * - Theme customization
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import { useOverlayData } from './hooks/useOverlayData';
import './OverlayV2.css';

// Widget Components - All 25 Production-Ready Widgets
import BalanceWidget from './widgets/BalanceWidget';
import WagerCounterWidget from './widgets/WagerCounterWidget';
import ProfitTrackerWidget from './widgets/ProfitTrackerWidget';

// Import all new widgets
import AverageHuntBetsizeWidget from './widgets/AverageHuntBetsizeWidget';
import AverageBonusCostWidget from './widgets/AverageBonusCostWidget';
import CurrentMultiplierWidget from './widgets/CurrentMultiplierWidget';
import RequiredMultiplierWidget from './widgets/RequiredMultiplierWidget';
import BestMultiplierWidget from './widgets/BestMultiplierWidget';
import BestBonusPayoutWidget from './widgets/BestBonusPayoutWidget';
import CumulativeMultisWidget from './widgets/CumulativeMultisWidget';
import CurrentAverageWidget from './widgets/CurrentAverageWidget';
import RequiredAverageWidget from './widgets/RequiredAverageWidget';
import RequiredRollAverageWidget from './widgets/RequiredRollAverageWidget';
import BonusesCountWidget from './widgets/BonusesCountWidget';
import RemainingBonusesWidget from './widgets/RemainingBonusesWidget';
import CurrentStartCostWidget from './widgets/CurrentStartCostWidget';
import SimpleBonusListWidget from './widgets/SimpleBonusListWidget';
import RecentWinsFeedWidget from './widgets/RecentWinsFeedWidget';
import BonusHistoryTimelineWidget from './widgets/BonusHistoryTimelineWidget';
import GoalProgressWidget from './widgets/GoalProgressWidget';
import SlotInfoWidget from './widgets/SlotInfoWidget';
import CasinoInfoWidget from './widgets/CasinoInfoWidget';
import BigWinAlertWidget from './widgets/BigWinAlertWidget';
import SessionStatsPanelWidget from './widgets/SessionStatsPanelWidget';

export default function OverlayV2() {
  const [searchParams] = useSearchParams();
  const publicId = searchParams.get('id');
  
  const [overlayData, setOverlayData] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState(null);

  // Fetch real-time data for widgets
  const { data: widgetData, loading: dataLoading } = useOverlayData(userId);

  useEffect(() => {
    if (!publicId) {
      setError('No overlay ID provided');
      setLoading(false);
      return;
    }

    loadOverlay();
    setupRealtimeSubscription();

    // Refresh overlay data every 30 seconds as fallback
    const refreshInterval = setInterval(loadOverlay, 30000);

    return () => {
      clearInterval(refreshInterval);
      supabase.removeAllChannels();
    };
  }, [publicId]);

  const loadOverlay = async () => {
    try {
      const response = await fetch(`/api/overlay/public?id=${publicId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load overlay');
      }

      const data = await response.json();
      console.log('🔍 Overlay API Response:', data);
      console.log('📦 Widgets received:', data.widgets);
      console.log('👤 User ID:', data.user?.id);
      
      setOverlayData(data);
      setWidgets(data.widgets || []);
      setUserId(data.user?.id || null); // Set user ID for data fetching
      setError(null);
    } catch (err) {
      console.error('❌ Error loading overlay:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    // Get overlay by public_id first (we need the internal ID)
    supabase
      .from('overlays')
      .select('id, user_id')
      .eq('public_id', publicId)
      .single()
      .then(({ data: overlay }) => {
        if (!overlay) return;

        // Subscribe to overlay changes
        const overlayChannel = supabase
          .channel(`overlay_${overlay.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'overlays',
              filter: `id=eq.${overlay.id}`
            },
            (payload) => {
              console.log('Overlay updated:', payload);
              setOverlayData(prev => ({
                ...prev,
                settings: payload.new.settings
              }));
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setConnected(true);
              console.log('Connected to overlay updates');
            }
          });

        // Subscribe to widget changes
        const widgetChannel = supabase
          .channel(`widgets_${overlay.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'widgets',
              filter: `overlay_id=eq.${overlay.id}`
            },
            (payload) => {
              console.log('Widget changed:', payload);
              loadOverlay(); // Reload full data when widgets change
            }
          )
          .subscribe();

        // Subscribe to widget state changes
        const stateChannel = supabase
          .channel(`widget_state_${overlay.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'widget_state'
            },
            (payload) => {
              console.log('Widget state updated:', payload);
              setWidgets(prev => prev.map(widget => 
                widget.state?.id === payload.new.id
                  ? { ...widget, state: { data: payload.new.data } }
                  : widget
              ));
            }
          )
          .subscribe();
      });
  };

  const renderWidget = (widget) => {
    const { widget_type, config, position_x, position_y, width, height, scale, opacity, state } = widget;
    const widgetName = widget_type?.name;
    
    console.log('🎨 Rendering widget:', widgetName, 'at', position_x, position_y);

    const style = {
      position: 'absolute',
      left: `${position_x || 0}px`,
      top: `${position_y || 0}px`,
      width: `${width || 300}px`,
      height: `${height || 'auto'}`,
      transform: `scale(${scale || 1})`,
      opacity: opacity || 1,
      zIndex: widget.z_index || 0
    };

    // Prepare widget props with real-time data
    const widgetProps = {
      config: config || {},
      data: {
        ...widgetData, // Real-time data from database
        ...(state?.data || {}) // Legacy state data (if any)
      },
      theme: overlayData?.theme || {}
    };
    
    console.log('📊 Widget data for', widgetName, ':', widgetData);

    // Map widget types to components - All 25+ widgets supported
    const widgetComponents = {
      // Legacy widgets
      'balance_display': <BalanceWidget {...widgetProps} />,
      'wager_counter': <WagerCounterWidget {...widgetProps} />,
      'profit_tracker': <ProfitTrackerWidget {...widgetProps} />,
      
      // Core stats widgets
      'average_hunt_betsize': <AverageHuntBetsizeWidget {...widgetProps} />,
      'average_bonus_cost': <AverageBonusCostWidget {...widgetProps} />,
      'current_multiplier': <CurrentMultiplierWidget {...widgetProps} />,
      'required_multiplier': <RequiredMultiplierWidget {...widgetProps} />,
      'best_multiplier': <BestMultiplierWidget {...widgetProps} />,
      'best_bonus_payout': <BestBonusPayoutWidget {...widgetProps} />,
      'cumulative_multis': <CumulativeMultisWidget {...widgetProps} />,
      
      // Average & goal widgets
      'current_average': <CurrentAverageWidget {...widgetProps} />,
      'required_average': <RequiredAverageWidget {...widgetProps} />,
      'required_roll_average': <RequiredRollAverageWidget {...widgetProps} />,
      'goal_progress': <GoalProgressWidget {...widgetProps} />,
      
      // Counter widgets
      'bonuses_count': <BonusesCountWidget {...widgetProps} />,
      'remaining_bonuses': <RemainingBonusesWidget {...widgetProps} />,
      'current_start_cost': <CurrentStartCostWidget {...widgetProps} />,
      
      // List & timeline widgets
      'simple_bonus_list': <SimpleBonusListWidget {...widgetProps} />,
      'recent_wins_feed': <RecentWinsFeedWidget {...widgetProps} />,
      'bonus_history_timeline': <BonusHistoryTimelineWidget {...widgetProps} />,
      
      // Alert & panel widgets
      'big_win_alert': <BigWinAlertWidget {...widgetProps} />,
      'session_stats_panel': <SessionStatsPanelWidget {...widgetProps} />,
      
      // Info widgets
      'slot_info': <SlotInfoWidget {...widgetProps} />,
      'casino_info': <CasinoInfoWidget {...widgetProps} />
    };

    return (
      <div key={widget.id} style={style} className="overlay-widget">
        {widgetComponents[widgetName] || (
          <div className="widget-placeholder">
            {widget_type?.display_name || 'Unknown Widget'}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="overlay-container overlay-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overlay-container overlay-error">
        <div className="error-message">
          <h2>⚠️ Overlay Error</h2>
          <p>{error}</p>
          {error.includes('subscription') && (
            <p className="error-hint">
              Please check your subscription status at your dashboard.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!overlayData) {
    return (
      <div className="overlay-container overlay-error">
        <div className="error-message">
          <h2>Overlay Not Found</h2>
          <p>This overlay does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const theme = overlayData.settings?.theme || {};

  return (
    <div 
      className="overlay-container"
      style={{
        '--primary-color': theme.primaryColor || '#d4af37',
        '--secondary-color': theme.secondaryColor || '#ffffff',
        '--background-color': theme.backgroundColor || 'rgba(0, 0, 0, 0.8)',
        '--font-family': theme.fontFamily || 'Inter, sans-serif',
        fontFamily: 'var(--font-family)'
      }}
    >
      {/* Connection indicator (only visible in dev) */}
      {process.env.NODE_ENV === 'development' && (
        <div className={`connection-indicator ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢' : '🔴'}
        </div>
      )}

      {/* Render all enabled widgets */}
      {widgets.map(widget => renderWidget(widget))}

      {/* Show message if no widgets */}
      {widgets.length === 0 && (
        <div className="overlay-empty-state" style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#fff',
          background: 'rgba(0,0,0,0.8)',
          padding: '40px',
          borderRadius: '12px'
        }}>
          <p style={{ fontSize: '24px', margin: '0 0 10px 0' }}>No widgets enabled</p>
          <p className="hint" style={{ fontSize: '14px', color: '#888', margin: 0 }}>
            Go to Dashboard → Widgets tab → Enable widgets
          </p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
            Debug: User ID = {userId || 'null'} | Public ID = {publicId}
          </p>
        </div>
      )}
    </div>
  );
}
