import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import AuthModal from '../Auth/AuthModal';
import './LandingPage.css';

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: '🎰',
      title: 'Exclusive Casino Offers',
      description: 'Access the best casino bonuses and promotions curated for streamers',
      link: '/offers'
    },
    {
      icon: '🎁',
      title: 'Giveaways',
      description: 'Run engaging giveaways with multiple winner selection modes for your viewers',
      link: '/giveaways'
    },
    {
      icon: '🎮',
      title: 'Interactive Games',
      description: 'Random slot picker, coin flip, and more interactive games for your stream',
      link: '/games'
    },
    {
      icon: '⭐',
      title: 'Points Store',
      description: 'Reward your loyal viewers with an integrated loyalty points redemption system',
      link: '/points'
    },
    {
      icon: '📺',
      title: 'Live Stream Hub',
      description: 'Tournaments, balance predictions, and real-time stream interactions',
      link: '/stream'
    },
    {
      icon: '✨',
      title: 'Professional Overlay',
      description: 'Bonus hunt tracker, customizable themes, and Twitch integration for premium streams',
      link: user ? '/overlay' : null
    }
  ];

  const handleFeatureClick = (link) => {
    if (link) {
      if (!user && link !== '/offers') {
        setShowAuthModal(true);
      } else {
        navigate(link);
      }
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">🎰 Premium Streaming Tools</div>
          <h1 className="hero-title">
            Elevate Your Casino
            <span className="hero-title-highlight"> Streaming Experience</span>
          </h1>
          <p className="hero-subtitle">
            Professional overlay system with exclusive casino offers, interactive games, 
            loyalty rewards, and powerful streaming tools designed for content creators
          </p>
          {!user && (
            <div className="hero-cta">
              <button onClick={() => setShowAuthModal(true)} className="cta-button-primary">
                Get Started Free
              </button>
              <button onClick={() => navigate('/offers')} className="cta-button-secondary">
                View Offers
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="features-container">
          <div className="features-header">
            <h2 className="section-title">Everything You Need</h2>
            <p className="section-subtitle">Comprehensive tools to engage your audience and grow your stream</p>
          </div>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="feature-card"
                onClick={() => handleFeatureClick(feature.link)}
              >
                <div className="feature-icon-wrapper">
                  <div className="feature-icon">{feature.icon}</div>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <div className="feature-arrow">→</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="final-cta-section">
          <div className="final-cta-content">
            <h2 className="final-cta-title">Ready to Transform Your Stream?</h2>
            <p className="final-cta-subtitle">Join hundreds of streamers already using our platform</p>
            <button onClick={() => setShowAuthModal(true)} className="cta-button-large">
              Start Streaming Better
            </button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>🎰 Stream Overlay</h3>
            <p>Professional streaming tools for casino content creators</p>
          </div>
          <div className="footer-links">
            <a href="/about" onClick={(e) => { e.preventDefault(); navigate('/about'); }}>About</a>
            <a href="/offers" onClick={(e) => { e.preventDefault(); navigate('/offers'); }}>Offers</a>
            <a href="/stream" onClick={(e) => { e.preventDefault(); navigate('/stream'); }}>Streams</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 Stream Overlay. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}
