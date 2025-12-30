export default function NavbarWidget({ overlay, updateSettings }) {
  return (
    <div className="widget-card">
      <div className="widget-card-header">
        <h3>📊 Navbar</h3>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={overlay.settings.widgets?.navbar?.enabled ?? false}
            onChange={(e) => {
              const newSettings = {
                ...overlay.settings,
                widgets: {
                  ...overlay.settings.widgets,
                  navbar: {
                    ...overlay.settings.widgets.navbar,
                    enabled: e.target.checked
                  }
                }
              };
              updateSettings(newSettings);
            }}
          />
          <span className="slider"></span>
        </label>
      </div>
      <p className="widget-description">Navigation bar with stream information and links</p>
    </div>
  );
}
