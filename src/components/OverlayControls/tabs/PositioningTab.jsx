import React from 'react';

export default function PositioningTab({ overlay, updateSettings }) {
  return (
    <div className="tab-content">
      <div className="positioning-grid">
        {/* Bonus Hunt Positioning */}
        <div className="position-widget-card">
          <h3>🎯 Bonus Hunt Tracker</h3>
          <div className="position-inputs">
            <div className="position-grid-and-vertical">
              <div className="position-control-area"
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const handleDrag = (moveEvent) => {
                    const x = Math.max(0, Math.min(2100, (moveEvent.clientX - rect.left) * (2100 / rect.width)));
                    const y = Math.max(0, Math.min(800, (moveEvent.clientY - rect.top) * (800 / rect.height)));
                    const newSettings = {
                      ...overlay.settings,
                      widgets: {
                        ...overlay.settings.widgets,
                        bonusHunt: {
                          ...overlay.settings.widgets.bonusHunt,
                          position: { x: Math.round(x), y: Math.round(y) }
                        }
                      }
                    };
                    updateSettings(newSettings);
                  };
                  const handleMouseUp = () => {
                    window.removeEventListener('mousemove', handleDrag);
                    window.removeEventListener('mouseup', handleMouseUp);
                  };
                  window.addEventListener('mousemove', handleDrag);
                  window.addEventListener('mouseup', handleMouseUp);
                  handleDrag(e);
                }}
              >
                <div className="position-dot"
                  style={{
                    left: `${(Math.min(overlay.settings.widgets?.bonusHunt?.position?.x || 50, 2100) / 2100) * 100}%`,
                    top: `${(Math.min(overlay.settings.widgets?.bonusHunt?.position?.y || 50, 800) / 800) * 100}%`
                  }}
                />
              </div>
              <div className="position-input-group vertical">
                <label>↕ Vertical</label>
                <input type="range" value={overlay.settings.widgets?.bonusHunt?.position?.y || 50}
                  onChange={(e) => {
                    const newSettings = {
                      ...overlay.settings,
                      widgets: {
                        ...overlay.settings.widgets,
                        bonusHunt: {
                          ...overlay.settings.widgets.bonusHunt,
                          position: { ...overlay.settings.widgets?.bonusHunt?.position, y: Number(e.target.value) }
                        }
                      }
                    };
                    updateSettings(newSettings);
                  }}
                  min="0" max="800" />
                <input type="number" className="slider-value-input" key={overlay.settings.widgets?.bonusHunt?.position?.y || 50} defaultValue={overlay.settings.widgets?.bonusHunt?.position?.y || 50}
                  onBlur={(e) => {
                    const newSettings = {
                      ...overlay.settings,
                      widgets: {
                        ...overlay.settings.widgets,
                        bonusHunt: {
                          ...overlay.settings.widgets.bonusHunt,
                          position: { ...overlay.settings.widgets?.bonusHunt?.position, y: Math.max(0, Math.min(800, Number(e.target.value))) }
                        }
                      }
                    };
                    updateSettings(newSettings);
                  }}
                  min="0" max="800" />
              </div>
            </div>
            <div className="position-input-group horizontal">
              <label>↔ Horizontal</label>
              <input type="range" value={overlay.settings.widgets?.bonusHunt?.position?.x || 50}
                onChange={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      bonusHunt: {
                        ...overlay.settings.widgets.bonusHunt,
                        position: { ...overlay.settings.widgets?.bonusHunt?.position, x: Number(e.target.value) }
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
                min="0" max="2100" />
              <input type="number" className="slider-value-input" key={overlay.settings.widgets?.bonusHunt?.position?.x || 50} defaultValue={overlay.settings.widgets?.bonusHunt?.position?.x || 50}
                onBlur={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      bonusHunt: {
                        ...overlay.settings.widgets.bonusHunt,
                        position: { ...overlay.settings.widgets?.bonusHunt?.position, x: Math.max(0, Math.min(2100, Number(e.target.value))) }
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
                min="0" max="2100" />
            </div>
          </div>
        </div>

        {/* Session Stats Positioning */}
        <div className="position-widget-card">
          <h3>📊 Session Stats</h3>
          <div className="position-inputs">
            <div className="position-grid-and-vertical">
              <div className="position-control-area"
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const handleDrag = (moveEvent) => {
                    const x = Math.max(0, Math.min(2100, (moveEvent.clientX - rect.left) * (2100 / rect.width)));
                    const y = Math.max(0, Math.min(800, (moveEvent.clientY - rect.top) * (800 / rect.height)));
                    const newSettings = {
                      ...overlay.settings,
                      widgets: {
                        ...overlay.settings.widgets,
                        sessionStats: {
                          ...overlay.settings.widgets.sessionStats,
                          position: { x: Math.round(x), y: Math.round(y) }
                        }
                      }
                    };
                    updateSettings(newSettings);
                  };
                  const handleMouseUp = () => {
                    window.removeEventListener('mousemove', handleDrag);
                    window.removeEventListener('mouseup', handleMouseUp);
                  };
                  window.addEventListener('mousemove', handleDrag);
                  window.addEventListener('mouseup', handleMouseUp);
                  handleDrag(e);
                }}
              >
                <div className="position-dot"
                  style={{
                    left: `${(Math.min(overlay.settings.widgets?.sessionStats?.position?.x || 50, 2100) / 2100) * 100}%`,
                    top: `${(Math.min(overlay.settings.widgets?.sessionStats?.position?.y || 200, 800) / 800) * 100}%`
                  }}
                />
              </div>
              <div className="position-input-group vertical">
                <label>↕ Vertical</label>
                <input type="range" value={overlay.settings.widgets?.sessionStats?.position?.y || 200}
                  onChange={(e) => {
                    const newSettings = {
                      ...overlay.settings,
                      widgets: {
                        ...overlay.settings.widgets,
                        sessionStats: {
                          ...overlay.settings.widgets.sessionStats,
                          position: { ...overlay.settings.widgets?.sessionStats?.position, y: Number(e.target.value) }
                        }
                      }
                    };
                    updateSettings(newSettings);
                  }}
                  min="0" max="800" />
                <input type="number" className="slider-value-input" key={overlay.settings.widgets?.sessionStats?.position?.y || 200} defaultValue={overlay.settings.widgets?.sessionStats?.position?.y || 200}
                  onBlur={(e) => {
                    const newSettings = {
                      ...overlay.settings,
                      widgets: {
                        ...overlay.settings.widgets,
                        sessionStats: {
                          ...overlay.settings.widgets.sessionStats,
                          position: { ...overlay.settings.widgets?.sessionStats?.position, y: Math.max(0, Math.min(800, Number(e.target.value))) }
                        }
                      }
                    };
                    updateSettings(newSettings);
                  }}
                  min="0" max="800" />
              </div>
            </div>
            <div className="position-input-group horizontal">
              <label>↔ Horizontal</label>
              <input type="range" value={overlay.settings.widgets?.sessionStats?.position?.x || 50}
                onChange={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      sessionStats: {
                        ...overlay.settings.widgets.sessionStats,
                        position: { ...overlay.settings.widgets?.sessionStats?.position, x: Number(e.target.value) }
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
                min="0" max="2100" />
              <input type="number" className="slider-value-input" key={overlay.settings.widgets?.sessionStats?.position?.x || 50} defaultValue={overlay.settings.widgets?.sessionStats?.position?.x || 50}
                onBlur={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      sessionStats: {
                        ...overlay.settings.widgets.sessionStats,
                        position: { ...overlay.settings.widgets?.sessionStats?.position, x: Math.max(0, Math.min(2100, Number(e.target.value))) }
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
                min="0" max="2100" />
            </div>
          </div>
        </div>

        {/* Tournaments Positioning */}
        <div className="position-widget-card">
          <h3>🏆 Tournaments Bracket</h3>
          <div className="position-inputs">
            <div className="position-grid-and-vertical">
              <div className="position-control-area"
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const handleDrag = (moveEvent) => {
                    const x = Math.max(0, Math.min(2100, (moveEvent.clientX - rect.left) * (2100 / rect.width)));
                    const y = Math.max(0, Math.min(800, (moveEvent.clientY - rect.top) * (800 / rect.height)));
                    const newSettings = {
                      ...overlay.settings,
                      widgets: {
                        ...overlay.settings.widgets,
                        tournaments: {
                          ...overlay.settings.widgets.tournaments,
                          position: { x: Math.round(x), y: Math.round(y) }
                        }
                      }
                    };
                    updateSettings(newSettings);
                  };
                  const handleMouseUp = () => {
                    window.removeEventListener('mousemove', handleDrag);
                    window.removeEventListener('mouseup', handleMouseUp);
                  };
                  window.addEventListener('mousemove', handleDrag);
                  window.addEventListener('mouseup', handleMouseUp);
                  handleDrag(e);
                }}
              >
                <div className="position-dot"
                  style={{
                    left: `${(Math.min(overlay.settings.widgets?.tournaments?.position?.x || 10, 2100) / 2100) * 100}%`,
                    top: `${(Math.min(overlay.settings.widgets?.tournaments?.position?.y || 700, 800) / 800) * 100}%`
                  }}
                />
              </div>
              <div className="position-input-group vertical">
                <label>↕ Vertical</label>
                <input type="range" value={overlay.settings.widgets?.tournaments?.position?.y || 700}
                  onChange={(e) => {
                    const newSettings = {
                      ...overlay.settings,
                      widgets: {
                        ...overlay.settings.widgets,
                        tournaments: {
                          ...overlay.settings.widgets.tournaments,
                          position: { ...overlay.settings.widgets?.tournaments?.position, y: Number(e.target.value) }
                        }
                      }
                    };
                    updateSettings(newSettings);
                  }}
                  min="0" max="800" />
                <input type="number" className="slider-value-input" key={overlay.settings.widgets?.tournaments?.position?.y || 700} defaultValue={overlay.settings.widgets?.tournaments?.position?.y || 700}
                  onBlur={(e) => {
                    const newSettings = {
                      ...overlay.settings,
                      widgets: {
                        ...overlay.settings.widgets,
                        tournaments: {
                          ...overlay.settings.widgets.tournaments,
                          position: { ...overlay.settings.widgets?.tournaments?.position, y: Math.max(0, Math.min(800, Number(e.target.value))) }
                        }
                      }
                    };
                    updateSettings(newSettings);
                  }}
                  min="0" max="800" />
              </div>
            </div>
            <div className="position-input-group horizontal">
              <label>↔ Horizontal</label>
              <input type="range" value={overlay.settings.widgets?.tournaments?.position?.x || 10}
                onChange={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      tournaments: {
                        ...overlay.settings.widgets.tournaments,
                        position: { ...overlay.settings.widgets?.tournaments?.position, x: Number(e.target.value) }
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
                min="0" max="2100" />
              <input type="number" className="slider-value-input" key={overlay.settings.widgets?.tournaments?.position?.x || 10} defaultValue={overlay.settings.widgets?.tournaments?.position?.x || 10}
                onBlur={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      tournaments: {
                        ...overlay.settings.widgets.tournaments,
                        position: { ...overlay.settings.widgets?.tournaments?.position, x: Math.max(0, Math.min(2100, Number(e.target.value))) }
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
                min="0" max="2100" />
            </div>
          </div>
        </div>

        {/* Twitch Chat Positioning */}
        <div className="position-widget-card">
          <h3>💬 Twitch Chat</h3>
          <div className="position-inputs">
            <div className="position-grid-and-vertical">
              <div className="position-control-area"
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const handleDrag = (moveEvent) => {
                    const x = Math.max(0, Math.min(2100, (moveEvent.clientX - rect.left) * (2100 / rect.width)));
                    const y = Math.max(0, Math.min(1200, (moveEvent.clientY - rect.top) * (1200 / rect.height)));
                    const newSettings = {
                      ...overlay.settings,
                      widgets: {
                        ...overlay.settings.widgets,
                        chat: {
                          ...overlay.settings.widgets.chat,
                          position: { x: Math.round(x), y: Math.round(y) }
                        }
                      }
                    };
                    updateSettings(newSettings);
                  };
                  const handleMouseUp = () => {
                    window.removeEventListener('mousemove', handleDrag);
                    window.removeEventListener('mouseup', handleMouseUp);
                  };
                  window.addEventListener('mousemove', handleDrag);
                  window.addEventListener('mouseup', handleMouseUp);
                  handleDrag(e);
                }}
              >
                <div className="position-dot"
                  style={{
                    left: `${(Math.min(overlay.settings.widgets?.chat?.position?.x || 50, 2100) / 2100) * 100}%`,
                    top: `${(Math.min(overlay.settings.widgets?.chat?.position?.y || 100, 1200) / 1200) * 100}%`
                  }}
                />
              </div>
              <div className="position-input-group vertical">
                <label>↕ Vertical</label>
                <input type="range" value={overlay.settings.widgets?.chat?.position?.y || 100}
                  onChange={(e) => {
                    const newSettings = {
                      ...overlay.settings,
                      widgets: {
                        ...overlay.settings.widgets,
                        chat: {
                          ...overlay.settings.widgets.chat,
                          position: { ...overlay.settings.widgets?.chat?.position, y: Number(e.target.value) }
                        }
                      }
                    };
                    updateSettings(newSettings);
                  }}
                  min="0" max="1200" />
                <input type="number" className="slider-value-input" key={overlay.settings.widgets?.chat?.position?.y || 100} defaultValue={overlay.settings.widgets?.chat?.position?.y || 100}
                  onBlur={(e) => {
                    const newSettings = {
                      ...overlay.settings,
                      widgets: {
                        ...overlay.settings.widgets,
                        chat: {
                          ...overlay.settings.widgets.chat,
                          position: { ...overlay.settings.widgets?.chat?.position, y: Math.max(0, Math.min(1200, Number(e.target.value))) }
                        }
                      }
                    };
                    updateSettings(newSettings);
                  }}
                  min="0" max="1200" />
              </div>
            </div>
            <div className="position-input-group horizontal">
              <label>↔ Horizontal</label>
              <input type="range" value={overlay.settings.widgets?.chat?.position?.x || 50}
                onChange={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      chat: {
                        ...overlay.settings.widgets.chat,
                        position: { ...overlay.settings.widgets?.chat?.position, x: Number(e.target.value) }
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
                min="0" max="2100" />
              <input type="number" className="slider-value-input" key={overlay.settings.widgets?.chat?.position?.x || 50} defaultValue={overlay.settings.widgets?.chat?.position?.x || 50}
                onBlur={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgets: {
                      ...overlay.settings.widgets,
                      chat: {
                        ...overlay.settings.widgets.chat,
                        position: { ...overlay.settings.widgets?.chat?.position, x: Math.max(0, Math.min(2100, Number(e.target.value))) }
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
                min="0" max="2100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
