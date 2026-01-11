/**
 * Widget Configuration Panel
 * Edit widget settings and appearance
 */

import { useState, useEffect } from 'react';
import './WidgetConfigPanel.css';

export default function WidgetConfigPanel({ widget, onUpdateWidget, onClose }) {
  const [config, setConfig] = useState(widget.config || {});
  const [position, setPosition] = useState({
    x: widget.position_x || 0,
    y: widget.position_y || 0
  });
  const [size, setSize] = useState({
    width: widget.width || 300,
    height: widget.height || 100
  });

  // Update local state when widget changes
  useEffect(() => {
    setConfig(widget.config || {});
    setPosition({ x: widget.position_x || 0, y: widget.position_y || 0 });
    setSize({ width: widget.width || 300, height: widget.height || 100 });
  }, [widget]);

  const handleConfigChange = (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    
    // Debounced update
    onUpdateWidget(widget.id, { config: newConfig });
  };

  const handlePositionChange = (axis, value) => {
    const newPosition = { ...position, [axis]: value };
    setPosition(newPosition);
    
    onUpdateWidget(widget.id, {
      position_x: newPosition.x,
      position_y: newPosition.y
    });
  };

  const handleSizeChange = (dimension, value) => {
    const newSize = { ...size, [dimension]: value };
    setSize(newSize);
    
    onUpdateWidget(widget.id, {
      width: newSize.width,
      height: newSize.height
    });
  };

  // Render config fields based on widget's default_config schema
  const renderConfigField = (key, value) => {
    const type = typeof value;

    if (type === 'boolean') {
      return (
        <div key={key} className="config-field">
          <label className="config-label">
            <input
              type="checkbox"
              checked={config[key] ?? value}
              onChange={(e) => handleConfigChange(key, e.target.checked)}
              className="config-checkbox"
            />
            <span className="label-text">{formatLabel(key)}</span>
          </label>
        </div>
      );
    }

    if (type === 'number') {
      return (
        <div key={key} className="config-field">
          <label className="config-label">
            <span className="label-text">{formatLabel(key)}</span>
            <input
              type="number"
              value={config[key] ?? value}
              onChange={(e) => handleConfigChange(key, parseFloat(e.target.value))}
              className="config-input"
              step={key.includes('decimal') ? 0.1 : 1}
            />
          </label>
        </div>
      );
    }

    if (type === 'string') {
      // Check if it's a color
      if (key.toLowerCase().includes('color')) {
        return (
          <div key={key} className="config-field">
            <label className="config-label">
              <span className="label-text">{formatLabel(key)}</span>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  value={config[key] ?? value}
                  onChange={(e) => handleConfigChange(key, e.target.value)}
                  className="config-color"
                />
                <input
                  type="text"
                  value={config[key] ?? value}
                  onChange={(e) => handleConfigChange(key, e.target.value)}
                  className="config-input color-text"
                  placeholder="#000000"
                />
              </div>
            </label>
          </div>
        );
      }

      // Check if it's a select (currency, goalType, etc.)
      if (key === 'currency') {
        return (
          <div key={key} className="config-field">
            <label className="config-label">
              <span className="label-text">{formatLabel(key)}</span>
              <select
                value={config[key] ?? value}
                onChange={(e) => handleConfigChange(key, e.target.value)}
                className="config-select"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="BRL">BRL (R$)</option>
              </select>
            </label>
          </div>
        );
      }

      if (key === 'goalType') {
        return (
          <div key={key} className="config-field">
            <label className="config-label">
              <span className="label-text">{formatLabel(key)}</span>
              <select
                value={config[key] ?? value}
                onChange={(e) => handleConfigChange(key, e.target.value)}
                className="config-select"
              >
                <option value="balance">Balance</option>
                <option value="profit">Profit</option>
                <option value="wager">Wager</option>
              </select>
            </label>
          </div>
        );
      }

      // Default: text input
      return (
        <div key={key} className="config-field">
          <label className="config-label">
            <span className="label-text">{formatLabel(key)}</span>
            <input
              type="text"
              value={config[key] ?? value}
              onChange={(e) => handleConfigChange(key, e.target.value)}
              className="config-input"
            />
          </label>
        </div>
      );
    }

    return null;
  };

  const formatLabel = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const defaultConfig = widget.widget_type?.default_config || {};

  return (
    <div className="widget-config-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="header-content">
          <h3>{widget.widget_type?.display_name || 'Widget Settings'}</h3>
          <p className="panel-subtitle">{widget.widget_type?.description}</p>
        </div>
        <button className="close-btn" onClick={onClose} title="Close">
          ✕
        </button>
      </div>

      {/* Config Sections */}
      <div className="config-sections">
        {/* Position & Size */}
        <div className="config-section">
          <h4 className="section-title">Position & Size</h4>
          
          <div className="config-field">
            <label className="config-label">
              <span className="label-text">X Position</span>
              <input
                type="number"
                value={position.x}
                onChange={(e) => handlePositionChange('x', parseFloat(e.target.value))}
                className="config-input"
                step="10"
              />
            </label>
          </div>

          <div className="config-field">
            <label className="config-label">
              <span className="label-text">Y Position</span>
              <input
                type="number"
                value={position.y}
                onChange={(e) => handlePositionChange('y', parseFloat(e.target.value))}
                className="config-input"
                step="10"
              />
            </label>
          </div>

          <div className="config-field">
            <label className="config-label">
              <span className="label-text">Width</span>
              <input
                type="number"
                value={size.width}
                onChange={(e) => handleSizeChange('width', parseFloat(e.target.value))}
                className="config-input"
                step="10"
                min="100"
              />
            </label>
          </div>

          <div className="config-field">
            <label className="config-label">
              <span className="label-text">Height</span>
              <input
                type="number"
                value={size.height}
                onChange={(e) => handleSizeChange('height', parseFloat(e.target.value))}
                className="config-input"
                step="10"
                min="50"
              />
            </label>
          </div>
        </div>

        {/* Widget-Specific Settings */}
        {Object.keys(defaultConfig).length > 0 && (
          <div className="config-section">
            <h4 className="section-title">Widget Settings</h4>
            {Object.entries(defaultConfig).map(([key, value]) =>
              renderConfigField(key, value)
            )}
          </div>
        )}

        {/* Z-Index */}
        <div className="config-section">
          <h4 className="section-title">Layer Order</h4>
          <div className="config-field">
            <label className="config-label">
              <span className="label-text">Z-Index</span>
              <input
                type="number"
                value={widget.z_index || 0}
                onChange={(e) =>
                  onUpdateWidget(widget.id, { z_index: parseInt(e.target.value) })
                }
                className="config-input"
                min="0"
              />
            </label>
            <p className="field-hint">Higher values appear on top</p>
          </div>
        </div>

        {/* Enable/Disable */}
        <div className="config-section">
          <h4 className="section-title">Visibility</h4>
          <div className="config-field">
            <label className="config-label">
              <input
                type="checkbox"
                checked={widget.enabled}
                onChange={(e) => onUpdateWidget(widget.id, { enabled: e.target.checked })}
                className="config-checkbox"
              />
              <span className="label-text">Show widget on overlay</span>
            </label>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="config-footer">
        <p className="footer-hint">💡 Changes sync to your overlay in real-time</p>
      </div>
    </div>
  );
}
