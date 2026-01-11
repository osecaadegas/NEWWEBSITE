import './MaterialSelector.css';

export default function MaterialSelector({ currentMaterial, materialIntensity, materials, onChange }) {
  const builtInMaterials = [
    { name: 'matte', display: 'Matte', icon: '◼️', description: 'Flat, soft shadows' },
    { name: 'glass', display: 'Glass', icon: '💎', description: 'Frosted blur effect' },
    { name: 'metallic', display: 'Metallic', icon: '⚡', description: 'Brushed metal' },
    { name: 'anodized', display: 'Anodized', icon: '🔷', description: 'Colored aluminum' },
    { name: 'carbon', display: 'Carbon', icon: '⬛', description: 'Technical fiber' },
    { name: 'neon', display: 'Neon', icon: '✨', description: 'High-glow emissive' }
  ];

  return (
    <div className="material-selector-section">
      <h3 className="section-title">Material</h3>
      <div className="materials-grid">
        {builtInMaterials.map((mat) => (
          <div
            key={mat.name}
            className={`material-card ${currentMaterial === mat.name ? 'active' : ''}`}
            onClick={() => onChange(mat.name, materialIntensity)}
            data-material={mat.name}
          >
            <span className="material-icon">{mat.icon}</span>
            <h4>{mat.display}</h4>
            <p>{mat.description}</p>
          </div>
        ))}
      </div>
      <div className="material-intensity">
        <label>
          <span>Intensity</span>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={materialIntensity || 1}
            onChange={(e) => onChange(currentMaterial, parseFloat(e.target.value))}
          />
          <span className="intensity-value">{(materialIntensity || 1).toFixed(1)}x</span>
        </label>
      </div>
    </div>
  );
}
