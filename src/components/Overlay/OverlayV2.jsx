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
import './OverlayV2.css';

// Widget Components
import BalanceWidget from './widgets/BalanceWidget';
import WagerCounterWidget from './widgets/WagerCounterWidget';
import ProfitTrackerWidget from './widgets/ProfitTrackerWidget';
// TODO: Implement remaining widgets
// import BetHistoryWidget from './widgets/BetHistoryWidget';
// import GoalBarWidget from './widgets/GoalBarWidget';
// import BigWinAlert from './widgets/BigWinAlert';
// import SessionStatsWidget from './widgets/SessionStatsWidget';
// import RecentWinsWidget from './widgets/RecentWinsWidget';

export default function OverlayV2() {
  const [searchParams] = useSearchParams();
  const publicId = searchParams.get('id');
  
  const [overlayData, setOverlayData] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);

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
      setOverlayData(data);
      setWidgets(data.widgets || []);
      setError(null);
    } catch (err) {
      console.error('Error loading overlay:', err);
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
    const { widget_type, config, position, size, state } = widget;
    const widgetName = widget_type?.name;

    const style = {
      position: 'absolute',
      left: `${position?.x || 0}px`,
      top: `${position?.y || 0}px`,
      width: `${size?.width || 300}px`,
      height: `${size?.height || 'auto'}`,
      zIndex: widget.z_index || 0
    };

    const widgetProps = {
      config: config || {},
      data: state?.data || {},
      theme: overlayData?.settings?.theme || {}
    };

    // Map widget types to components
    const widgetComponents = {
      'balance_display': <BalanceWidget {...widgetProps} />,
      'wager_counter': <WagerCounterWidget {...widgetProps} />,
      'profit_tracker': <ProfitTrackerWidget {...widgetProps} />,
      'bet_history': <BetHistoryWidget {...widgetProps} />,
      'goal_bar': <GoalBarWidget {...widgetProps} />,
      'big_win_alert': <BigWinAlert {...widgetProps} />,
      'session_stats': <SessionStatsWidget {...widgetProps} />,
      'recent_wins': <RecentWinsWidget {...widgetProps} />
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
        <div className="overlay-empty-state">
          <p>No widgets enabled</p>
          <p className="hint">Add widgets in your dashboard</p>
        </div>
      )}
    </div>
  );
}
