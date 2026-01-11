/**
 * Active Widgets List
 * Manage user's added widgets
 */

import { useState } from 'react';
import './ActiveWidgetsList.css';

export default function ActiveWidgetsList({
  widgets,
  selectedWidget,
  onSelectWidget,
  onToggleWidget,
  onRemoveWidget,
  onReorderWidgets
}) {
  const [draggedWidget, setDraggedWidget] = useState(null);

  const handleDragStart = (e, widget) => {
    setDraggedWidget(widget);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetWidget) => {
    e.preventDefault();

    if (!draggedWidget || draggedWidget.id === targetWidget.id) {
      setDraggedWidget(null);
      return;
    }

    // Reorder widgets
    const reordered = [...widgets];
    const draggedIndex = reordered.findIndex((w) => w.id === draggedWidget.id);
    const targetIndex = reordered.findIndex((w) => w.id === targetWidget.id);

    reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, draggedWidget);

    onReorderWidgets(reordered);
    setDraggedWidget(null);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      stats: '📊',
      counters: '🔢',
      lists: '📋',
      alerts: '🚨',
      panels: '📱',
      info: 'ℹ️',
      progress: '📈',
      history: '📜',
      goals: '🎯'
    };
    return icons[category] || '📦';
  };

  return (
    <div className="active-widgets-list">
      <div className="panel-header">
        <h3>Active Widgets</h3>
        <p className="panel-subtitle">
          {widgets.length} widget{widgets.length !== 1 ? 's' : ''} on overlay
        </p>
      </div>

      {widgets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <p>No widgets added yet</p>
          <p className="empty-hint">Add widgets from the available widgets panel</p>
        </div>
      ) : (
        <div className="widgets-list">
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className={`active-widget-card ${selectedWidget?.id === widget.id ? 'selected' : ''} ${
                !widget.enabled ? 'disabled' : ''
              } ${draggedWidget?.id === widget.id ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, widget)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, widget)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectWidget(widget)}
            >
              {/* Drag Handle */}
              <div className="widget-drag-handle">
                <span className="drag-icon">⋮⋮</span>
              </div>

              {/* Widget Content */}
              <div className="widget-card-content">
                <div className="widget-card-header">
                  <div className="widget-icon">
                    {widget.widget_type?.category && getCategoryIcon(widget.widget_type.category)}
                  </div>
                  <div className="widget-info">
                    <h4 className="widget-name">
                      {widget.widget_type?.display_name || 'Unknown Widget'}
                    </h4>
                    <p className="widget-meta">
                      {widget.widget_type?.category || 'Unknown'} • z-index: {widget.z_index}
                    </p>
                  </div>
                </div>

                {/* Status Indicators */}
                <div className="widget-status">
                  {widget.widget_type?.premium_only && (
                    <span className="status-badge premium">⭐ Premium</span>
                  )}
                  {!widget.enabled && <span className="status-badge disabled">Hidden</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="widget-actions">
                {/* Toggle Enable/Disable */}
                <button
                  className={`action-btn toggle-btn ${widget.enabled ? 'enabled' : 'disabled'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleWidget(widget.id, !widget.enabled);
                  }}
                  title={widget.enabled ? 'Hide widget' : 'Show widget'}
                >
                  {widget.enabled ? '👁️' : '🙈'}
                </button>

                {/* Delete */}
                <button
                  className="action-btn delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveWidget(widget.id);
                  }}
                  title="Remove widget"
                >
                  🗑️
                </button>
              </div>

              {/* Selected Indicator */}
              {selectedWidget?.id === widget.id && (
                <div className="selected-indicator">
                  <span className="selected-dot"></span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {widgets.length > 0 && (
        <div className="list-footer">
          <p className="list-hint">💡 Drag widgets to reorder their z-index</p>
        </div>
      )}
    </div>
  );
}
