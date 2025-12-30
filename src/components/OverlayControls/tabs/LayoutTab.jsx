import React from 'react';

export default function LayoutTab({ overlay, updateSettings }) {
  return (
    <div className="tab-content">
      <div className="layout-content">
        <h3 className="layout-main-title">📐 Widget Layouts</h3>
        <p className="section-description">Choose display style for each widget</p>

        {/* Bonus Hunt Layouts */}
        <div className="layout-widget-section">
          <div className="layout-widget-header">
            <h4>🎯 Bonus Hunt Tracker</h4>
          </div>
          <div className="layout-options">
            <div className="layout-switch-item">
              <span className="layout-switch-label">
                <span className="layout-icon">�</span>
                Scrolling List
              </span>
              <input 
                id="bonusHunt-list"
                type="radio" 
                name="bonusHunt-layout" 
                value="list"
                checked={(overlay.settings.widgets?.bonusHunt?.layout ?? 'list') === 'list'}
                onChange={() => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      bonusHunt: {
                        ...overlay.settings.widgets.bonusHunt,
                        layout: 'list'
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
              <label className="toggle-switch" htmlFor="bonusHunt-list">
                <div className="toggle-slider" />
                <div className="toggle-switch-handle" />
              </label>
            </div>
            <div className="layout-switch-item">
              <span className="layout-switch-label">
                <span className="layout-icon">🎴</span>
                Spinning Card
              </span>
              <input 
                id="bonusHunt-carousel"
                type="radio" 
                name="bonusHunt-layout" 
                value="carousel"
                checked={overlay.settings.widgets?.bonusHunt?.layout === 'carousel'}
                onChange={() => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      bonusHunt: {
                        ...overlay.settings.widgets.bonusHunt,
                        layout: 'carousel'
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
              <label className="toggle-switch" htmlFor="bonusHunt-carousel">
                <div className="toggle-slider" />
                <div className="toggle-switch-handle" />
              </label>
            </div>
            <div className="layout-switch-item">
              <span className="layout-switch-label">
                <span className="layout-icon">🎯</span>
                Grid Cards
              </span>
              <input 
                id="bonusHunt-grid"
                type="radio" 
                name="bonusHunt-layout" 
                value="grid"
                checked={overlay.settings.widgets?.bonusHunt?.layout === 'grid'}
                onChange={() => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      bonusHunt: {
                        ...overlay.settings.widgets.bonusHunt,
                        layout: 'grid'
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
              <label className="toggle-switch" htmlFor="bonusHunt-grid">
                <div className="toggle-slider" />
                <div className="toggle-switch-handle" />
              </label>
            </div>
            <div className="layout-switch-item">
              <span className="layout-switch-label">
                <span className="layout-icon">📊</span>
                Sidebar
              </span>
              <input 
                id="bonusHunt-sidebar"
                type="radio" 
                name="bonusHunt-layout" 
                value="sidebar"
                checked={overlay.settings.widgets?.bonusHunt?.layout === 'sidebar'}
                onChange={() => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      bonusHunt: {
                        ...overlay.settings.widgets.bonusHunt,
                        layout: 'sidebar'
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
              <label className="toggle-switch" htmlFor="bonusHunt-sidebar">
                <div className="toggle-slider" />
                <div className="toggle-switch-handle" />
              </label>
            </div>
          </div>
        </div>

        {/* Tournament Bracket Layouts */}
        <div className="layout-widget-section">
          <div className="layout-widget-header">
            <h4>🏆 Tournament Bracket</h4>
          </div>
          <div className="layout-options">
            <div className="layout-switch-item">
              <span className="layout-switch-label">
                <span className="layout-icon">↔️</span>
                Horizontal
              </span>
              <input 
                id="tournaments-horizontal"
                type="radio" 
                name="tournaments-layout" 
                value="horizontal"
                checked={(overlay.settings.widgets?.tournaments?.layout ?? 'horizontal') === 'horizontal'}
                onChange={() => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      tournaments: {
                        ...overlay.settings.widgets.tournaments,
                        layout: 'horizontal'
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
              <label className="toggle-switch" htmlFor="tournaments-horizontal">
                <div className="toggle-slider" />
                <div className="toggle-switch-handle" />
              </label>
            </div>
            <div className="layout-switch-item">
              <span className="layout-switch-label">
                <span className="layout-icon">↕️</span>
                Vertical
              </span>
              <input 
                id="tournaments-vertical"
                type="radio" 
                name="tournaments-layout" 
                value="vertical"
                checked={overlay.settings.widgets?.tournaments?.layout === 'vertical'}
                onChange={() => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      tournaments: {
                        ...overlay.settings.widgets.tournaments,
                        layout: 'vertical'
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
              <label className="toggle-switch" htmlFor="tournaments-vertical">
                <div className="toggle-slider" />
                <div className="toggle-switch-handle" />
              </label>
            </div>
            <div className="layout-switch-item">
              <span className="layout-switch-label">
                <span className="layout-icon">📐</span>
                Minimal
              </span>
              <input 
                id="tournaments-minimal"
                type="radio" 
                name="tournaments-layout" 
                value="minimal"
                checked={overlay.settings.widgets?.tournaments?.layout === 'minimal'}
                onChange={() => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      tournaments: {
                        ...overlay.settings.widgets.tournaments,
                        layout: 'minimal'
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
              <label className="toggle-switch" htmlFor="tournaments-minimal">
                <div className="toggle-slider" />
                <div className="toggle-switch-handle" />
              </label>
            </div>
          </div>
        </div>

        {/* Session Stats Layouts */}
        <div className="layout-widget-section">
          <div className="layout-widget-header">
            <h4>📊 Session Stats</h4>
          </div>
          <div className="layout-options">
            <div className="layout-switch-item">
              <span className="layout-switch-label">
                <span className="layout-icon">🃏</span>
                Card
              </span>
              <input 
                id="sessionStats-card"
                type="radio" 
                name="sessionStats-layout" 
                value="card"
                checked={(overlay.settings.widgets?.sessionStats?.layout ?? 'card') === 'card'}
                onChange={() => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      sessionStats: {
                        ...overlay.settings.widgets.sessionStats,
                        layout: 'card'
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
              <label className="toggle-switch" htmlFor="sessionStats-card">
                <div className="toggle-slider" />
                <div className="toggle-switch-handle" />
              </label>
            </div>
            <div className="layout-switch-item">
              <span className="layout-switch-label">
                <span className="layout-icon">📄</span>
                Compact
              </span>
              <input 
                id="sessionStats-compact"
                type="radio" 
                name="sessionStats-layout" 
                value="compact"
                checked={overlay.settings.widgets?.sessionStats?.layout === 'compact'}
                onChange={() => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      sessionStats: {
                        ...overlay.settings.widgets.sessionStats,
                        layout: 'compact'
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
              <label className="toggle-switch" htmlFor="sessionStats-compact">
                <div className="toggle-slider" />
                <div className="toggle-switch-handle" />
              </label>
            </div>
            <div className="layout-switch-item">
              <span className="layout-switch-label">
                <span className="layout-icon">▪️</span>
                Minimal
              </span>
              <input 
                id="sessionStats-minimal"
                type="radio" 
                name="sessionStats-layout" 
                value="minimal"
                checked={overlay.settings.widgets?.sessionStats?.layout === 'minimal'}
                onChange={() => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      sessionStats: {
                        ...overlay.settings.widgets.sessionStats,
                        layout: 'minimal'
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
              <label className="toggle-switch" htmlFor="sessionStats-minimal">
                <div className="toggle-slider" />
                <div className="toggle-switch-handle" />
              </label>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
