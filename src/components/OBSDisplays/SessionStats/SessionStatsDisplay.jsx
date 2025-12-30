import './styles/SessionStatsDisplay.css';

export default function SessionStatsDisplay({ sessionStatsData, position }) {
  if (!sessionStatsData || !sessionStatsData.enabled) {
    return null;
  }

  const xPos = position?.x ?? 50;
  const yPos = position?.y ?? 200;

  return (
    <div 
      className="overlay-widget session-stats"
      style={{
        position: 'fixed',
        left: xPos,
        top: yPos
      }}
    >
      <div className="widget-header">
        <span className="widget-icon">📊</span>
        <h3>Session Stats</h3>
      </div>
      <div className="widget-content">
        <div className="stat-row">
          <span className="stat-label">Spins:</span>
          <span className="stat-value">0</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Wagered:</span>
          <span className="stat-value">€0.00</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Won:</span>
          <span className="stat-value">€0.00</span>
        </div>
        <div className="stat-row highlight">
          <span className="stat-label">Profit:</span>
          <span className="stat-value">€0.00</span>
        </div>
      </div>
    </div>
  );
}
