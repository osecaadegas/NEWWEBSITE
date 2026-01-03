import { useState, useEffect } from 'react';
import './NavbarDisplay.css';

export default function NavbarDisplay({ navbarData, user }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cryptoPrices, setCryptoPrices] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch crypto prices
    const fetchCryptoPrices = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,cardano,solana,ripple,polkadot,dogecoin&vs_currencies=usd&include_24hr_change=true'
        );
        const data = await response.json();
        
        const prices = Object.entries(data).map(([coin, info]) => ({
          name: coin.charAt(0).toUpperCase() + coin.slice(1),
          symbol: getCryptoSymbol(coin),
          price: info.usd,
          change: info.usd_24h_change
        }));
        
        setCryptoPrices(prices);
      } catch (error) {
        console.error('Error fetching crypto prices:', error);
      }
    };

    fetchCryptoPrices();
    const interval = setInterval(fetchCryptoPrices, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const getCryptoSymbol = (coin) => {
    const symbols = {
      bitcoin: 'BTC',
      ethereum: 'ETH',
      binancecoin: 'BNB',
      cardano: 'ADA',
      solana: 'SOL',
      ripple: 'XRP',
      polkadot: 'DOT',
      dogecoin: 'DOGE'
    };
    return symbols[coin] || coin.toUpperCase().slice(0, 3);
  };

  if (!navbarData || !navbarData.enabled) {
    return null;
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };

  const streamerName = navbarData.streamerName || user?.user_metadata?.twitch_username || user?.email?.split('@')[0] || 'Streamer';
  const selectedMode = navbarData.mode || 'Raw';
  const motto = navbarData.motto || '';

  return (
    <div className="navbar-display">
      <div className="navbar-container">
        {/* Left Section - Twitch Username + Mode + Motto */}
        <div className="navbar-left">
          <div className="twitch-badge">
            <svg viewBox="0 0 24 24" fill="currentColor" className="twitch-icon">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
            </svg>
            <span className="twitch-username">{streamerName}</span>
          </div>
          <div className="mode-display">
            {selectedMode}
          </div>
          {motto && (
            <div className="motto-display">
              <span className="motto-icon">✨</span>
              <span className="motto-text">{motto}</span>
            </div>
          )}
        </div>

        {/* Center Section - Time */}
        <div className="navbar-center">
          <div className="time-display">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="clock-icon">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="time-text">{formatTime(currentTime)}</span>
          </div>
        </div>

        {/* Right Section - Crypto Prices Carousel */}
        <div className="navbar-right">
          <div className="crypto-carousel">
            <div className="crypto-track">
              {[...cryptoPrices, ...cryptoPrices].map((crypto, index) => (
                <div key={`${crypto.symbol}-${index}`} className="crypto-item">
                  <span className="crypto-symbol">{crypto.symbol}</span>
                  <span className="crypto-price">${crypto.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                  <span className={`crypto-change ${crypto.change >= 0 ? 'positive' : 'negative'}`}>
                    {crypto.change >= 0 ? '▲' : '▼'} {Math.abs(crypto.change).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
