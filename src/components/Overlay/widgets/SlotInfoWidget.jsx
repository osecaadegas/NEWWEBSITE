/**
 * Slot Info Widget - Shows current slot/game information
 */
import './SlotInfoWidget.css';

export default function SlotInfoWidget({ data, config, theme }) {
  const { slotName = 'Unknown Slot', provider = '', rtp = '', volatility = '' } = data || {};
  const { showIcon = true } = config || {};
  const { primaryColor = '#06b6d4' } = theme || {};

  return (
    <div className="slot-info-widget" style={{ '--primary-color': primaryColor }}>
      {showIcon && (
        <div className="widget-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
        </div>
      )}
      <div className="widget-content">
        <div className="widget-label">Current Slot</div>
        <div className="widget-value">{slotName}</div>
        {provider && <div className="widget-sublabel">{provider}</div>}
        {(rtp || volatility) && (
          <div className="slot-stats">
            {rtp && <span>RTP: {rtp}</span>}
            {volatility && <span>Vol: {volatility}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
