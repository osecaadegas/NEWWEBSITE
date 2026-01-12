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

// Widget Components
import BHTrackerListVertical from './widgets/BHTrackerListVertical';

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
      data: widgetData, // Real-time data from database (don't merge with state)
      theme: overlayData?.theme || {}
    };
    
    console.log('📊 Widget data for', widgetName, ':', widgetData);

    // Render widget component directly (don't pre-create in object)
    let widgetComponent = null;
    if (widgetName === 'bh_tracker_list_vertical') {
      widgetComponent = <BHTrackerListVertical {...widgetProps} />;
    } else {
      widgetComponent = (
        <div className="widget-placeholder">
          {widget_type?.display_name || 'Unknown Widget'}
        </div>
      );
    }

    return (
      <div key={widget.id} style={style} className="overlay-widget">
        {widgetComponent}
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
