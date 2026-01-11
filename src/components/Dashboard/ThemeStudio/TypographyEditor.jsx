export default function TypographyEditor({ theme, onChange }) {
  const fontOptions = [
    { value: "'Inter', sans-serif", label: 'Inter (Default)' },
    { value: "'Roboto', sans-serif", label: 'Roboto' },
    { value: "'Poppins', sans-serif", label: 'Poppins' },
    { value: "'Montserrat', sans-serif", label: 'Montserrat' },
    { value: "system-ui, sans-serif", label: 'System' }
  ];

  return (
    <div className="typography-section">
      <h3 className="section-title">Typography</h3>
      
      <div className="typo-field">
        <label>
          <span>Font Family</span>
          <select
            value={theme?.font_family || fontOptions[0].value}
            onChange={(e) => onChange({ font_family: e.target.value })}
          >
            {fontOptions.map(font => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="typo-field">
        <label>
          <span>Normal Weight</span>
          <input
            type="range"
            min="100"
            max="900"
            step="100"
            value={theme?.font_weight_normal || 400}
            onChange={(e) => onChange({ font_weight_normal: parseInt(e.target.value) })}
          />
          <span className="value">{theme?.font_weight_normal || 400}</span>
        </label>
      </div>

      <div className="typo-field">
        <label>
          <span>Bold Weight</span>
          <input
            type="range"
            min="100"
            max="900"
            step="100"
            value={theme?.font_weight_bold || 600}
            onChange={(e) => onChange({ font_weight_bold: parseInt(e.target.value) })}
          />
          <span className="value">{theme?.font_weight_bold || 600}</span>
        </label>
      </div>
    </div>
  );
}
