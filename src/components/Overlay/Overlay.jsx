import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Overlay.css';
import BonusHuntDisplay from '../OBSDisplays/BonusHunt/BonusHuntDisplay';
import TournamentDisplay from '../OBSDisplays/Tournament/TournamentDisplay';
import SessionStatsDisplay from '../OBSDisplays/SessionStats/SessionStatsDisplay';
import NavbarDisplay from '../OBSDisplays/Navbar/NavbarDisplay';
import ChatDisplay from '../OBSDisplays/Chat/ChatDisplay';

export default function Overlay() {
  const [searchParams] = useSearchParams();
  const publicId = searchParams.get('id');
  
  const [settings, setSettings] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!publicId) {
      setError('No overlay ID provided');
      setLoading(false);
      return;
    }

    loadOverlay();
    
    // Refresh every 5 seconds to get latest settings
    const interval = setInterval(loadOverlay, 5000);
    return () => clearInterval(interval);
  }, [publicId]);

  const loadOverlay = async () => {
    try {
      const response = await fetch(`/api/overlay/public?id=${publicId}`);
      
      if (!response.ok) {
        throw new Error('Overlay not found');
      }

      const data = await response.json();
      setSettings(data.settings);
      setUser(data.user);
      setError(null);
    } catch (err) {
      console.error('Error loading overlay:', err);
      setError('Failed to load overlay');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="overlay-container">
        <div className="overlay-loading">Loading overlay...</div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="overlay-container">
        <div className="overlay-error">
          {error || 'Overlay not found'}
        </div>
      </div>
    );
  }

  const theme = settings.theme || {};
  const widgets = settings.widgets || {};
  const primaryColor = theme.primaryColor || '#d4af37';
  const backgroundColor = theme.backgroundColor || 'rgba(0, 0, 0, 0.8)';

  return (
    <div 
      className="overlay-container"
      style={{
        '--primary-color': primaryColor,
        '--bg-color': backgroundColor
      }}
    >
      {/* Bonus Hunt Tracker */}
      {widgets.bonusHunt?.enabled && (
        <BonusHuntDisplay 
          bonusHuntData={widgets.bonusHunt}
          position={widgets.bonusHunt.position}
        />
      )}

      {/* Session Stats */}
      {widgets.sessionStats?.enabled && (
        <SessionStatsDisplay 
          sessionStatsData={widgets.sessionStats}
          position={widgets.sessionStats.position}
        />
      )}

      {/* Recent Wins */}
      {widgets.recentWins?.enabled && (
        <div 
          className="overlay-widget recent-wins"
          style={{
            left: widgets.recentWins.position?.x || 50,
            top: widgets.recentWins.position?.y || 350
          }}
        >
          <div className="widget-header">
            <span className="widget-icon">🎁</span>
            <h3>Recent Wins</h3>
          </div>
          <div className="widget-content">
            <div className="wins-list">
              <div className="win-item">
                <span className="win-slot">No recent wins</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tournaments */}
      {widgets.tournaments?.enabled && (
        <TournamentDisplay 
          tournamentData={widgets.tournaments} 
          position={widgets.tournaments?.position}
        />
      )}

      {/* CoinFlip */}
      {widgets.coinflip?.enabled && (
        <div 
          className="overlay-widget coinflip"
          style={{
            left: widgets.coinflip.position?.x || 50,
            top: widgets.coinflip.position?.y || 350
          }}
        >
          <div className="widget-header">
            <span className="widget-icon">🪙</span>
            <h3>CoinFlip</h3>
          </div>
          <div className="widget-content">
            <div className="coinflip-display">Ready to flip!</div>
          </div>
        </div>
      )}

      {/* Slotmachine */}
      {widgets.slotmachine?.enabled && (
        <div 
          className="overlay-widget slotmachine"
          style={{
            left: widgets.slotmachine.position?.x || 50,
            top: widgets.slotmachine.position?.y || 500
          }}
        >
          <div className="widget-header">
            <span className="widget-icon">🎰</span>
            <h3>Slotmachine</h3>
          </div>
          <div className="widget-content">
            <div className="empty-state">Slot machine ready</div>
          </div>
        </div>
      )}

      {/* Random Slot Picker */}
      {widgets.randomSlotPicker?.enabled && (
        <div 
          className="overlay-widget random-slot"
          style={{
            left: widgets.randomSlotPicker.position?.x || 50,
            top: widgets.randomSlotPicker.position?.y || 650
          }}
        >
          <div className="widget-header">
            <span className="widget-icon">🎲</span>
            <h3>Random Slot Picker</h3>
          </div>
          <div className="widget-content">
            <div className="empty-state">Click to pick a random slot</div>
          </div>
        </div>
      )}

      {/* Wheel of Names */}
      {widgets.wheelOfNames?.enabled && (
        <div 
          className="overlay-widget wheel"
          style={{
            left: widgets.wheelOfNames.position?.x || 50,
            top: widgets.wheelOfNames.position?.y || 800
          }}
        >
          <div className="widget-header">
            <span className="widget-icon">🎡</span>
            <h3>Wheel of Names</h3>
          </div>
          <div className="widget-content">
            <div className="empty-state">Wheel ready to spin</div>
          </div>
        </div>
      )}

      {/* Navbar */}
      {widgets.navbar?.enabled && (
        <NavbarDisplay 
          navbarData={widgets.navbar}
          user={user}
        />
      )}

      {/* Twitch Chat */}
      {widgets.chat?.enabled && (
        <ChatDisplay 
          chatData={widgets.chat}
          position={widgets.chat.position}
        />
      )}

      {/* Customization */}
      {widgets.customization?.enabled && (
        <div 
          className="overlay-widget customization"
          style={{
            left: widgets.customization.position?.x || 50,
            top: widgets.customization.position?.y || 950
          }}
        >
          <div className="widget-header">
            <span className="widget-icon">🎨</span>
            <h3>Customization</h3>
          </div>
          <div className="widget-content">
            <div className="empty-state">Custom widget content</div>
          </div>
        </div>
      )}

      {/* Twitch Chat */}
      {widgets.chat?.enabled && (
        <ChatDisplay 
          chatData={widgets.chat}
          position={widgets.chat.position}
        />
      )}
    </div>
  );
}
