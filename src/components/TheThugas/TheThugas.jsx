import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import './TheThugas.css';

export default function TheThugas() {
  const { isAdmin, adminLoading } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  if (adminLoading) {
    return (
      <div className="thugas-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="thugas-page">
      <div className="thugas-container">
        <div className="thugas-badge">🔒 Admin Only</div>
        
        <div className="thugas-hero">
          <div className="thugas-icon">🎮</div>
          <h1 className="thugas-title">
            The<span className="thugas-highlight">Thugas</span>
          </h1>
          
          <div className="thugas-status">
            <span className="status-badge">Coming Soon</span>
          </div>

          <p className="thugas-description">
            An exclusive, high-stakes gaming experience is being crafted just for you.
            <br />
            Prepare for something legendary.
          </p>

          <div className="thugas-features">
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <span className="feature-text">Lightning-fast gameplay</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <span className="feature-text">Precision mechanics</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🏆</span>
              <span className="feature-text">Competitive leaderboards</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💎</span>
              <span className="feature-text">Exclusive rewards</span>
            </div>
          </div>

          <div className="thugas-countdown">
            <div className="countdown-label">Development Progress</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '35%' }}>
                <span className="progress-text">35%</span>
              </div>
            </div>
          </div>

          <div className="thugas-notify">
            <p className="notify-text">Stay tuned for updates!</p>
            <div className="notify-icons">
              <span className="notify-icon">🔔</span>
              <span className="notify-icon">🎪</span>
              <span className="notify-icon">🎲</span>
            </div>
          </div>
        </div>

        <div className="thugas-footer">
          <p className="footer-note">
            Only administrators have access to this development preview.
          </p>
        </div>
      </div>
    </div>
  );
}
