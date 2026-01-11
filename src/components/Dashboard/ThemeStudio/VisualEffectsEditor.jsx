export default function VisualEffectsEditor({ theme, onChange }) {
  return (
    <div className="visual-effects-section">
      <h3 className="section-title">Visual Effects</h3>
      
      <div className="effect-field">
        <label>
          <span>Border Radius</span>
          <input
            type="range"
            min="0"
            max="32"
            value={theme?.border_radius || 12}
            onChange={(e) => onChange({ border_radius: parseInt(e.target.value) })}
          />
          <span className="value">{theme?.border_radius || 12}px</span>
        </label>
      </div>

      <div className="effect-field">
        <label>
          <span>Glow Intensity</span>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={theme?.glow_intensity || 0.5}
            onChange={(e) => onChange({ glow_intensity: parseFloat(e.target.value) })}
          />
          <span className="value">{(theme?.glow_intensity || 0.5).toFixed(1)}x</span>
        </label>
      </div>

      <div className="effect-field">
        <label>
          <span>Shadow Depth</span>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={theme?.shadow_depth || 1}
            onChange={(e) => onChange({ shadow_depth: parseFloat(e.target.value) })}
          />
          <span className="value">{(theme?.shadow_depth || 1).toFixed(1)}x</span>
        </label>
      </div>

      <div className="effect-field">
        <label>
          <span>Animation</span>
          <select
            value={theme?.animation_intensity || 'standard'}
            onChange={(e) => onChange({ animation_intensity: e.target.value })}
          >
            <option value="off">Off</option>
            <option value="subtle">Subtle</option>
            <option value="standard">Standard</option>
            <option value="impactful">Impactful</option>
          </select>
        </label>
      </div>

      <div className="effect-field">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={theme?.high_contrast || false}
            onChange={(e) => onChange({ high_contrast: e.target.checked })}
          />
          <span>High Contrast Mode</span>
        </label>
      </div>
    </div>
  );
}
