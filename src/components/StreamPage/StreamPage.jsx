import './StreamPage.css';
import StreamHighlights from '../StreamHighlights/StreamHighlights';
import DailyWheel from '../DailyWheel/DailyWheel';

export default function StreamPage() {
  const twitchChannel = 'osecaadegas95';
  
  return (
    <div className="stream-page">
      <div className="stream-container">
        <h1>📺 Live Stream</h1>
        <p className="stream-subtitle">Watch our live casino streaming sessions</p>
        
        <div className="stream-info">
          <div className="info-item">
            <span className="info-label">STATUS:</span>
            <div className="status-dot offline" title="Offline"></div>
          </div>
          <div className="info-item">
            <span className="info-label">VIEWERS:</span>
            <span className="info-value">0</span>
          </div>
          <div className="info-item">
            <span className="info-label">SCHEDULE:</span>
            <span className="info-value">Daily at 8PM EST</span>
          </div>
        </div>
        
        <div className="stream-content">
          <div className="stream-embed">
            <iframe
              src={`https://player.twitch.tv/?channel=${twitchChannel}&parent=${window.location.hostname}`}
              height="280"
              width="100%"
              allowFullScreen
              title="Twitch Stream"
              style={{ border: 'none', borderRadius: '12px' }}
            />
          </div>

          <div className="chat-embed">
            <iframe
              src={`https://www.twitch.tv/embed/${twitchChannel}/chat?parent=${window.location.hostname}&darkpopout`}
              height="280"
              width="100%"
              title="Twitch Chat"
              style={{ border: 'none', borderRadius: '12px' }}
            />
          </div>
        </div>

        {/* Stream Highlights Section */}
        <StreamHighlights />

        {/* Daily Wheel Section */}
        <DailyWheel />
      </div>
    </div>
  );
}
