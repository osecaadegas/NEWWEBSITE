/**
 * Available Widgets Panel
 * Browse and add new widgets to overlay
 */

import { useState, useMemo } from 'react';
import './AvailableWidgetsPanel.css';

export default function AvailableWidgetsPanel({
  widgetTypes,
  userWidgets,
  hasActivePlan,
  onAddWidget
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ['all', ...new Set(widgetTypes.map((wt) => wt.category))];
    return cats;
  }, [widgetTypes]);

  // Filter widgets
  const filteredWidgets = useMemo(() => {
    let filtered = widgetTypes;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((wt) => wt.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (wt) =>
          wt.display_name.toLowerCase().includes(query) ||
          wt.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [widgetTypes, selectedCategory, searchQuery]);

  // Check if widget type is already added
  const isWidgetAdded = (widgetTypeId) => {
    return userWidgets.some((w) => w.widget_type_id === widgetTypeId);
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      all: 'All Widgets',
      stats: 'Statistics',
      counters: 'Counters',
      lists: 'Lists',
      alerts: 'Alerts',
      panels: 'Panels',
      info: 'Information',
      progress: 'Progress',
      history: 'History',
      goals: 'Goals',
      bhtrackers: 'BH Trackers'
    };
    return labels[cat] || cat;
  };

  const getCategoryIcon = (cat) => {
    const icons = {
      all: '🎯',
      stats: '📊',
      counters: '🔢',
      lists: '📋',
      alerts: '🚨',
      panels: '📱',
      info: 'ℹ️',
      progress: '📈',
      history: '📜',
      goals: '🎯',
      bhtrackers: '🎰'
    };
    return icons[cat] || '📦';
  };

  return (
    <div className="available-widgets-panel">
      <div className="panel-header">
        <h3>Available Widgets</h3>
        <p className="panel-subtitle">
          {filteredWidgets.length} widget{filteredWidgets.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Search */}
      <div className="widget-search">
        <input
          type="text"
          placeholder="Search widgets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Category Filter */}
      <div className="category-filter">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            <span className="category-icon">{getCategoryIcon(cat)}</span>
            <span className="category-label">{getCategoryLabel(cat)}</span>
          </button>
        ))}
      </div>

      {/* Widget Grid */}
      <div className="widgets-grid">
        {filteredWidgets.map((widgetType) => {
          const isLocked = widgetType.premium_only && !hasActivePlan;
          const isAdded = isWidgetAdded(widgetType.id);

          return (
            <div
              key={widgetType.id}
              className={`widget-type-card ${isLocked ? 'locked' : ''} ${isAdded ? 'added' : ''}`}
            >
              {/* Premium Badge */}
              {widgetType.premium_only && (
                <div className="premium-badge">
                  <span className="premium-icon">⭐</span>
                  Premium
                </div>
              )}

              {/* Added Badge */}
              {isAdded && (
                <div className="added-badge">
                  <span className="added-icon">✓</span>
                  Added
                </div>
              )}

              {/* Widget Info */}
              <div className="widget-type-header">
                <div className="widget-type-icon">
                  {getCategoryIcon(widgetType.category)}
                </div>
                <h4 className="widget-type-name">{widgetType.display_name}</h4>
              </div>

              <p className="widget-type-description">{widgetType.description}</p>

              <div className="widget-type-meta">
                <span className="widget-category">{getCategoryLabel(widgetType.category)}</span>
              </div>

              {/* Add Button */}
              <button
                className={`add-widget-btn ${isLocked ? 'locked' : ''} ${isAdded ? 'added' : ''}`}
                onClick={() => onAddWidget(widgetType.id)}
                disabled={isAdded}
              >
                {isLocked ? (
                  <>
                    <span className="btn-icon">🔒</span>
                    Upgrade to Unlock
                  </>
                ) : isAdded ? (
                  <>
                    <span className="btn-icon">✓</span>
                    Added
                  </>
                ) : (
                  <>
                    <span className="btn-icon">+</span>
                    Add Widget
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {filteredWidgets.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p>No widgets found</p>
          <p className="empty-hint">Try adjusting your search or category filter</p>
        </div>
      )}
    </div>
  );
}
