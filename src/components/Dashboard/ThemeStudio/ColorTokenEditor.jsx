import { useState } from 'react';
import './ColorTokenEditor.css';

export default function ColorTokenEditor({ theme, onChange }) {
  const colorTokens = [
    { key: 'color_primary', label: 'Primary', default: '#667eea' },
    { key: 'color_secondary', label: 'Secondary', default: '#764ba2' },
    { key: 'color_accent', label: 'Accent', default: '#00d4ff' },
    { key: 'color_glow', label: 'Glow', default: '#667eea' },
    { key: 'color_success', label: 'Success', default: '#4caf50' },
    { key: 'color_danger', label: 'Danger', default: '#ff6b6b' },
    { key: 'color_warning', label: 'Warning', default: '#ffc107' }
  ];

  return (
    <div className="color-token-editor-section">
      <h3 className="section-title">Colors</h3>
      <div className="color-grid">
        {colorTokens.map((token) => (
          <div key={token.key} className="color-field">
            <label>
              <span>{token.label}</span>
              <div className="color-input-group">
                <input
                  type="color"
                  value={theme?.[token.key] || token.default}
                  onChange={(e) => onChange({ [token.key]: e.target.value })}
                />
                <input
                  type="text"
                  value={theme?.[token.key] || token.default}
                  onChange={(e) => onChange({ [token.key]: e.target.value })}
                  className="color-hex"
                />
              </div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
