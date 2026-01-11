/**
 * Theme Studio
 * Professional theme customization interface
 * Real-time preview, material selection, design tokens
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { useSubscription } from '../../../hooks/useSubscription';
import { applyTheme, hexToRgb, getContrastRatio, THEME_PRESETS } from '../../../utils/themeManager';
import MaterialSelector from './MaterialSelector';
import ColorTokenEditor from './ColorTokenEditor';
import VisualEffectsEditor from './VisualEffectsEditor';
import TypographyEditor from './TypographyEditor';
import './ThemeStudio.css';

export default function ThemeStudio({ overlayId }) {
  const { user } = useAuth();
  const { isActive: hasActivePlan } = useSubscription();
  
  const [currentTheme, setCurrentTheme] = useState(null);
  const [presets, setPresets] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (overlayId) {
      loadThemeData();
    }
  }, [overlayId]);

  const loadThemeData = async () => {
    try {
      setLoading(true);
      
      // Load user's current theme
      const { data: userTheme, error: themeError } = await supabase
        .from('user_themes')
        .select('*')
        .eq('overlay_id', overlayId)
        .eq('is_active', true)
        .single();

      if (themeError && themeError.code !== 'PGRST116') throw themeError;

      // Load theme presets
      const { data: themePresets, error: presetsError } = await supabase
        .from('theme_presets')
        .select('*')
        .order('is_default', { ascending: false });

      if (presetsError) throw presetsError;

      // Load material definitions
      const { data: materialDefs, error: materialsError } = await supabase
        .from('material_definitions')
        .select('*')
        .order('name');

      if (materialsError) throw materialsError;

      setPresets(themePresets || []);
      setMaterials(materialDefs || []);

      if (userTheme) {
        setCurrentTheme(userTheme);
        applyTheme(userTheme);
      } else {
        // Create default theme for user
        await createDefaultTheme();
      }
    } catch (err) {
      console.error('Error loading theme data:', err);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultTheme = async () => {
    try {
      const defaultPreset = presets.find(p => p.is_default) || presets[0];
      
      const newTheme = {
        user_id: user.id,
        overlay_id: overlayId,
        theme_preset_id: defaultPreset?.id,
        is_active: true,
        ...defaultPreset
      };

      const { data, error } = await supabase
        .from('user_themes')
        .insert([newTheme])
        .select()
        .single();

      if (error) throw error;

      setCurrentTheme(data);
      applyTheme(data);
    } catch (err) {
      console.error('Error creating default theme:', err);
    }
  };

  const handleThemeChange = (updates) => {
    const updated = { ...currentTheme, ...updates };
    setCurrentTheme(updated);
    applyTheme(updated);
  };

  const handleSaveTheme = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('user_themes')
        .update(currentTheme)
        .eq('id', currentTheme.id);

      if (error) throw error;

      alert('Theme saved successfully!');
    } catch (err) {
      console.error('Error saving theme:', err);
      alert(`Failed to save theme: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetTheme = async () => {
    if (!confirm('Reset to default theme? This will discard all customizations.')) {
      return;
    }

    try {
      const defaultPreset = presets.find(p => p.is_default);
      if (!defaultPreset) return;

      const reset = {
        ...defaultPreset,
        id: currentTheme.id,
        user_id: currentTheme.user_id,
        overlay_id: currentTheme.overlay_id,
        is_active: true,
        theme_preset_id: defaultPreset.id
      };

      const { error } = await supabase
        .from('user_themes')
        .update(reset)
        .eq('id', currentTheme.id);

      if (error) throw error;

      setCurrentTheme(reset);
      applyTheme(reset);
    } catch (err) {
      console.error('Error resetting theme:', err);
      alert(`Failed to reset theme: ${err.message}`);
    }
  };

  const handleLoadPreset = async (preset) => {
    if (preset.is_premium && !hasActivePlan) {
      alert('This is a premium theme. Please upgrade your subscription to use it.');
      return;
    }

    const updated = {
      ...currentTheme,
      theme_preset_id: preset.id,
      ...preset
    };

    setCurrentTheme(updated);
    applyTheme(updated);
  };

  if (loading) {
    return (
      <div className="theme-studio-loading">
        <div className="loading-spinner"></div>
        <p>Loading theme studio...</p>
      </div>
    );
  }

  return (
    <div className="theme-studio">
      {/* Header */}
      <div className="studio-header">
        <div className="header-content">
          <h2>🎨 Theme Studio</h2>
          <p className="header-subtitle">Customize your overlay's appearance</p>
        </div>
        
        <div className="header-actions">
          <button
            className="studio-btn preview-btn"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? '⚙️ Edit' : '👁️ Preview'}
          </button>
          <button
            className="studio-btn reset-btn"
            onClick={handleResetTheme}
          >
            🔄 Reset
          </button>
          <button
            className="studio-btn save-btn"
            onClick={handleSaveTheme}
            disabled={saving}
          >
            {saving ? '💾 Saving...' : '💾 Save Theme'}
          </button>
        </div>
      </div>

      {!previewMode ? (
        <div className="studio-layout">
          {/* Left: Theme Presets */}
          <div className="studio-panel presets-panel">
            <h3 className="panel-title">Theme Presets</h3>
            <div className="presets-grid">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className={`preset-card ${currentTheme?.theme_preset_id === preset.id ? 'active' : ''} ${preset.is_premium ? 'premium' : ''}`}
                  onClick={() => handleLoadPreset(preset)}
                >
                  {preset.is_premium && <span className="premium-badge">⭐ Premium</span>}
                  <div 
                    className="preset-preview"
                    style={{
                      background: `linear-gradient(135deg, ${preset.color_primary}, ${preset.color_secondary})`,
                    }}
                  >
                    <div className="preset-material-tag">{preset.material_type}</div>
                  </div>
                  <h4 className="preset-name">{preset.name}</h4>
                  <p className="preset-description">{preset.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Customization Panels */}
          <div className="studio-panel customization-panel">
            <div className="customization-sections">
              {/* Material Selector */}
              <MaterialSelector
                currentMaterial={currentTheme?.material_type}
                materialIntensity={currentTheme?.material_intensity}
                materials={materials}
                onChange={(material, intensity) => handleThemeChange({
                  material_type: material,
                  material_intensity: intensity
                })}
              />

              {/* Color Tokens */}
              <ColorTokenEditor
                theme={currentTheme}
                onChange={handleThemeChange}
              />

              {/* Visual Effects */}
              <VisualEffectsEditor
                theme={currentTheme}
                onChange={handleThemeChange}
              />

              {/* Typography */}
              <TypographyEditor
                theme={currentTheme}
                onChange={handleThemeChange}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="preview-panel">
          <div className="preview-content">
            <h3>Live Preview</h3>
            <p>Preview mode shows how your theme looks in the overlay. Changes are applied in real-time.</p>
            <div className="preview-widgets">
              {/* Sample widget previews would go here */}
              <div className="widget-base sample-widget">
                <h4>Sample Widget</h4>
                <p>This is how your widgets will look with the current theme.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="studio-footer">
        <p className="footer-info">💡 All changes sync to your overlay in real-time. Don't forget to save!</p>
      </div>
    </div>
  );
}
