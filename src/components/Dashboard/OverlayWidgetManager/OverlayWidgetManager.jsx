/**
 * Overlay Widget Manager
 * Production SaaS widget management system
 * 
 * Features:
 * - Browse available widget types
 * - Add/remove widgets from overlay
 * - Configure widget settings
 * - Real-time sync to overlay
 * - Premium enforcement
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { useSubscription } from '../../../hooks/useSubscription';
import AvailableWidgetsPanel from './AvailableWidgetsPanel';
import ActiveWidgetsList from './ActiveWidgetsList';
import WidgetConfigPanel from './WidgetConfigPanel';
import './OverlayWidgetManager.css';

export default function OverlayWidgetManager({ overlayId }) {
  const { user } = useAuth();
  const { isActive: hasActivePlan } = useSubscription();
  
  const [widgetTypes, setWidgetTypes] = useState([]);
  const [userWidgets, setUserWidgets] = useState([]);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (overlayId) {
      loadData();
      setupRealtimeSubscription();
    }
  }, [overlayId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadWidgetTypes(),
        loadUserWidgets()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWidgetTypes = async () => {
    const { data, error: fetchError } = await supabase
      .from('widget_types')
      .select('*')
      .eq('active', true)
      .order('category', { ascending: true })
      .order('display_name', { ascending: true });

    if (fetchError) throw fetchError;
    setWidgetTypes(data || []);
  };

  const loadUserWidgets = async () => {
    const { data, error: fetchError } = await supabase
      .from('widgets')
      .select(`
        *,
        widget_type:widget_types(*)
      `)
      .eq('overlay_id', overlayId)
      .order('z_index', { ascending: true });

    if (fetchError) throw fetchError;
    setUserWidgets(data || []);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`widgets_${overlayId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'widgets',
          filter: `overlay_id=eq.${overlayId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            loadUserWidgets();
          } else if (payload.eventType === 'UPDATE') {
            setUserWidgets((prev) =>
              prev.map((w) => (w.id === payload.new.id ? { ...w, ...payload.new } : w))
            );
          } else if (payload.eventType === 'DELETE') {
            setUserWidgets((prev) => prev.filter((w) => w.id !== payload.old.id));
            if (selectedWidget?.id === payload.old.id) {
              setSelectedWidget(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAddWidget = async (widgetTypeId) => {
    try {
      const widgetType = widgetTypes.find((wt) => wt.id === widgetTypeId);
      
      // Check premium access
      if (widgetType.premium_only && !hasActivePlan) {
        alert('This widget requires an active subscription. Please upgrade to access premium widgets.');
        return;
      }

      // Calculate next z-index
      const maxZIndex = userWidgets.length > 0
        ? Math.max(...userWidgets.map((w) => w.z_index || 0))
        : 0;

      // Auto-position: stack widgets vertically
      const yOffset = userWidgets.length * 120;

      const newWidget = {
        overlay_id: overlayId,
        widget_type_id: widgetTypeId,
        name: widgetType.display_name || 'New Widget',
        config: widgetType.default_config || {},
        position_x: 50,
        position_y: 50 + yOffset,
        width: 300,
        height: 100,
        scale: 1.0,
        opacity: 1.0,
        z_index: maxZIndex + 1,
        enabled: true
      };

      const { data, error: insertError } = await supabase
        .from('widgets')
        .insert([newWidget])
        .select(`
          *,
          widget_type:widget_types(*)
        `)
        .single();

      if (insertError) throw insertError;

      // Widget will be added via realtime subscription
      // Select it immediately
      setSelectedWidget(data);
    } catch (err) {
      console.error('Error adding widget:', err);
      alert(`Failed to add widget: ${err.message}`);
    }
  };

  const handleRemoveWidget = async (widgetId) => {
    if (!confirm('Are you sure you want to remove this widget?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('widgets')
        .delete()
        .eq('id', widgetId);

      if (deleteError) throw deleteError;

      // Widget will be removed via realtime subscription
    } catch (err) {
      console.error('Error removing widget:', err);
      alert(`Failed to remove widget: ${err.message}`);
    }
  };

  const handleToggleWidget = async (widgetId, enabled) => {
    try {
      const { error: updateError } = await supabase
        .from('widgets')
        .update({ enabled })
        .eq('id', widgetId);

      if (updateError) throw updateError;

      // Widget will be updated via realtime subscription
    } catch (err) {
      console.error('Error toggling widget:', err);
      alert(`Failed to toggle widget: ${err.message}`);
    }
  };

  const handleUpdateWidget = async (widgetId, updates) => {
    try {
      const { error: updateError } = await supabase
        .from('widgets')
        .update(updates)
        .eq('id', widgetId);

      if (updateError) throw updateError;

      // Update local state immediately for responsive UI
      setUserWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, ...updates } : w))
      );

      if (selectedWidget?.id === widgetId) {
        setSelectedWidget((prev) => ({ ...prev, ...updates }));
      }

      // Widget will sync to overlay via realtime
    } catch (err) {
      console.error('Error updating widget:', err);
      alert(`Failed to update widget: ${err.message}`);
    }
  };

  const handleReorderWidgets = async (reorderedWidgets) => {
    try {
      // Update z-index for all widgets
      const updates = reorderedWidgets.map((widget, index) => ({
        id: widget.id,
        z_index: index
      }));

      for (const update of updates) {
        await supabase
          .from('widgets')
          .update({ z_index: update.z_index })
          .eq('id', update.id);
      }

      // Reload to get fresh data
      await loadUserWidgets();
    } catch (err) {
      console.error('Error reordering widgets:', err);
      alert(`Failed to reorder widgets: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="widget-manager-loading">
        <div className="loading-spinner"></div>
        <p>Loading widgets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="widget-manager-error">
        <p>Error loading widgets: {error}</p>
        <button onClick={loadData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="overlay-widget-manager">
      <div className="widget-manager-layout">
        {/* Left: Available Widgets */}
        <div className="widget-panel widget-panel-available">
          <AvailableWidgetsPanel
            widgetTypes={widgetTypes}
            userWidgets={userWidgets}
            hasActivePlan={hasActivePlan}
            onAddWidget={handleAddWidget}
          />
        </div>

        {/* Middle: Active Widgets */}
        <div className="widget-panel widget-panel-active">
          <ActiveWidgetsList
            widgets={userWidgets}
            selectedWidget={selectedWidget}
            onSelectWidget={setSelectedWidget}
            onToggleWidget={handleToggleWidget}
            onRemoveWidget={handleRemoveWidget}
            onReorderWidgets={handleReorderWidgets}
          />
        </div>

        {/* Right: Configuration */}
        <div className="widget-panel widget-panel-config">
          {selectedWidget ? (
            <WidgetConfigPanel
              widget={selectedWidget}
              onUpdateWidget={handleUpdateWidget}
              onClose={() => setSelectedWidget(null)}
            />
          ) : (
            <div className="widget-config-empty">
              <div className="empty-state-icon">⚙️</div>
              <h4>No Widget Selected</h4>
              <p>Select a widget from your active widgets to configure its settings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
