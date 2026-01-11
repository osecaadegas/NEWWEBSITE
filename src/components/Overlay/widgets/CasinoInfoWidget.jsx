/**
 * Casino Info Widget - Shows casino branding
 */
import './CasinoInfoWidget.css';

export default function CasinoInfoWidget({ data, config, theme }) {
  const { casinoName = 'Casino', casinoLogo = '', casinoUrl = '' } = data || {};
  const { showIcon = true } = config || {};
  const { primaryColor = '#eab308' } = theme || {};

  return (
    <div className="casino-info-widget" style={{ '--primary-color': primaryColor }}>
      {casinoLogo ? (
        <div className="casino-logo">
          <img src={casinoLogo} alt={casinoName} />
        </div>
      ) : showIcon && (
        <div className="widget-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
      )}
      <div className="widget-content">
        <div className="widget-value">{casinoName}</div>
        {casinoUrl && <div className="widget-sublabel">{casinoUrl}</div>}
      </div>
    </div>
  );
}
