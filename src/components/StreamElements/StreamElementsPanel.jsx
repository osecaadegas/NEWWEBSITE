import { useState, useEffect } from 'react';
import { useStreamElements } from '../../context/StreamElementsContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';
import './StreamElementsPanel.css';

export default function StreamElementsPanel() {
  const {
    seAccount,
    points,
    loading,
    error,
    linkAccount,
    unlinkAccount,
    redeemPoints,
    refreshPoints,
    isConnected
  } = useStreamElements();

  const { user } = useAuth();

  const [showLinkForm, setShowLinkForm] = useState(false);
  const [channelId, setChannelId] = useState('');
  const [jwtToken, setJwtToken] = useState('');
  const [username, setUsername] = useState('');
  const [linkError, setLinkError] = useState('');
  const [redemptionItems, setRedemptionItems] = useState([]);
  const [redeeming, setRedeeming] = useState(null);
  const [allRedemptions, setAllRedemptions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [isTwitchUser, setIsTwitchUser] = useState(false);

  useEffect(() => {
    checkIfTwitchUser();
    loadRedemptionItems();
    loadAllRedemptions();
  }, []);

  const checkIfTwitchUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.app_metadata?.provider === 'twitch') {
        setIsTwitchUser(true);
      }
    } catch (err) {
      console.error('Error checking user provider:', err);
    }
  };

  const loadRedemptionItems = async () => {
    try {
      const { data, error } = await supabase
        .from('redemption_items')
        .select('*')
        .order('point_cost', { ascending: true });

      if (error) throw error;
      
      console.log('Loaded redemption items:', data);
      if (data && data.length > 0) {
        console.log('First item reward_details:', data[0].reward_details);
      }
      
      setRedemptionItems(data || []);
    } catch (err) {
      console.error('Error loading redemption items:', err);
    }
  };

  const loadAllRedemptions = async () => {
    try {
      const { data, error } = await supabase
        .from('point_redemptions')
        .select(`
          *,
          redemption_items (
            name,
            point_cost,
            image_url
          )
        `)
        .order('redeemed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Fetch usernames separately from streamelements_connections
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const { data: seConnections } = await supabase
          .from('streamelements_connections')
          .select('user_id, se_username')
          .in('user_id', userIds);
        
        // Map usernames to redemptions
        const usernameMap = {};
        seConnections?.forEach(conn => {
          usernameMap[conn.user_id] = conn.se_username;
        });
        
        const enrichedData = data.map(redemption => ({
          ...redemption,
          username: usernameMap[redemption.user_id] || 'User'
        }));
        
        setAllRedemptions(enrichedData);
      } else {
        setAllRedemptions(data || []);
      }
    } catch (err) {
      console.error('Error loading redemptions:', err);
    }
  };

  const handleLinkAccount = async (e) => {
    e.preventDefault();
    setLinkError('');

    if (!channelId || !jwtToken) {
      setLinkError('Please fill in all fields');
      return;
    }

    const result = await linkAccount(channelId, jwtToken, username);
    
    if (result.success) {
      setShowLinkForm(false);
      setChannelId('');
      setJwtToken('');
      setUsername('');
    } else {
      setLinkError(result.error);
    }
  };

  const handleUnlink = async () => {
    if (confirm('Are you sure you want to unlink your StreamElements account?')) {
      await unlinkAccount();
    }
  };

  const handleRedeem = async (item) => {
    if (points < item.point_cost) {
      alert('You don\'t have enough points for this redemption!');
      return;
    }

    // Check if item is out of stock
    if (item.available_units !== null && item.available_units <= 0) {
      alert('This item is out of stock!');
      return;
    }

    if (!confirm(`Redeem "${item.name}" for ${item.point_cost.toLocaleString()} points?`)) {
      return;
    }

    console.log('Full item object:', item);
    console.log('Item.id specifically:', item.id);
    console.log('All item keys:', Object.keys(item));
    setRedeeming(item.id);
    const result = await redeemPoints(item.id, item.point_cost);
    setRedeeming(null);

    if (result.success) {
      alert('Redemption successful! Your reward has been applied.');
      await refreshPoints();
      await loadRedemptionItems(); // Reload items to update stock count
      await loadAllRedemptions(); // Reload redemption history
    } else {
      console.error('Redemption failed:', result.error);
      alert(`Redemption failed: ${result.error}\n\nPlease contact an admin if this issue persists.`);
    }
  };

  return (
    <div className="se-panel">
      <div className="se-header">
        <h2>🎁 StreamElements Points</h2>
        <p>Link your StreamElements account to redeem loyalty points for rewards</p>
      </div>

      {showLinkForm && !isConnected ? (
        <div className="se-not-connected">
          <form onSubmit={handleLinkAccount} className="se-link-form">
              <h3>Link StreamElements Account</h3>
              
              <div className="form-group">
                <label>Channel ID</label>
                <input
                  type="text"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  placeholder="Your SE Channel ID"
                />
                <small>Find this in your SE dashboard URL</small>
              </div>

              <div className="form-group">
                <label>JWT Token</label>
                <input
                  type="password"
                  value={jwtToken}
                  onChange={(e) => setJwtToken(e.target.value)}
                  placeholder="Your SE JWT Token"
                />
                <small>
                  Get this from StreamElements → Account → Show secrets → JWT Token
                </small>
              </div>

              <div className="form-group">
                <label>Username (Optional)</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your SE username"
                />
              </div>

              {linkError && <div className="se-error">{linkError}</div>}

              <div className="form-actions">
                <button type="submit" disabled={loading} className="se-submit-btn">
                  {loading ? 'Connecting...' : 'Connect Account'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowLinkForm(false);
                    setLinkError('');
                  }}
                  className="se-cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
        </div>
      ) : null}

      {/* Show redemption items to everyone */}
      <div className="se-connected">
        {!isConnected && !isTwitchUser && (
          <div className="se-info-box" style={{ marginBottom: '20px' }}>
            <h3>🔒 Connect to Redeem</h3>
            <p>Link your StreamElements account to view your points balance and redeem rewards!</p>
            <button 
              onClick={() => setShowLinkForm(true)}
              className="se-connect-btn"
            >
              Connect StreamElements
            </button>
          </div>
        )}

        {!isConnected && isTwitchUser && (
          <div className="se-info-box" style={{ marginBottom: '20px', background: 'rgba(147, 51, 234, 0.1)', borderColor: 'rgba(147, 51, 234, 0.3)' }}>
            <h3>✨ Twitch User Detected</h3>
            <p>Your StreamElements loyalty points are automatically synced! You can redeem rewards below once connected.</p>
            <p style={{color: '#9333ea', fontSize: '0.9rem', marginTop: '10px'}}>💡 Points sync may take a moment after first login</p>
          </div>
        )}
        
        {error && <div className="se-error">{error}</div>}

        <div className="se-redemptions">
            <h3>Available Redemptions</h3>
            {redemptionItems.length === 0 ? (
              <p className="se-no-items">No redemption items available</p>
            ) : (
              <div className="se-content-wrapper">
                <div className="se-items-grid">
                {redemptionItems.map(item => {
                  const canAfford = isConnected && points >= item.point_cost;
                  const isRedeeming = redeeming === item.id;
                  const isOutOfStock = item.available_units !== null && item.available_units <= 0;
                  const isDisabled = !item.is_active;
                  
                  // Use a default premium image if no image URL is provided
                  const imageUrl = item.image_url || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=400&h=300&fit=crop';
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`se-item ${isDisabled || !canAfford || isOutOfStock || !isConnected ? 'disabled' : ''}`}
                    >
                      <div className="se-item-image">
                        <img src={imageUrl} alt={item.name} />
                        {isDisabled && (
                          <div className="se-coming-soon-ribbon">COMING SOON</div>
                        )}
                        {!isDisabled && isOutOfStock && (
                          <div className="se-out-of-stock-badge">OUT OF STOCK</div>
                        )}
                      </div>
                      <div className="se-item-content">
                        <div className="se-item-header">
                          <h4>{item.name}</h4>
                          <div className="se-item-cost">
                            {item.point_cost.toLocaleString()} pts
                          </div>
                        </div>
                        <p className="se-item-description">{item.description}</p>
                        {(item.reward_details || item.reward_value?.details) && (
                          <div className="se-item-details">
                            <span className="se-details-icon">🎁</span>
                            {item.reward_details || item.reward_value?.details}
                          </div>
                        )}
                        {item.available_units !== null && !isDisabled && (
                          <p className="se-item-stock">
                            Stock: <strong>{item.available_units}</strong> remaining
                          </p>
                        )}
                        <button
                          onClick={() => handleRedeem(item)}
                          disabled={!isConnected || isDisabled || !canAfford || isRedeeming || loading || isOutOfStock}
                          className="se-redeem-btn"
                        >
                          {!isConnected ? 'Connect to Redeem' : isDisabled ? 'Coming Soon' : isOutOfStock ? 'Out of Stock' : isRedeeming ? 'Redeeming...' : canAfford ? 'Redeem' : 'Not Enough Points'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {allRedemptions.length > 0 && (
                <div className="se-redemption-history-sidebar">
              <div className="se-history-card">
                <div className="se-history-header">
                  <h3>Recent Redemptions</h3>
                  <span className="se-history-count">{allRedemptions.length}</span>
                </div>
                <div className="se-history-list">
                  {allRedemptions
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((redemption) => {
                      return (
                        <div key={redemption.id} className="se-history-item">
                          <div className="se-history-content">
                            <div className="se-history-name">
                              {redemption.redemption_items?.name || 'Unknown Item'}
                            </div>
                            <div className="se-history-meta">
                              <span className="se-history-user">@{redemption.username}</span>
                              <span className="se-history-points">{redemption.points_spent.toLocaleString()} pts</span>
                            </div>
                          </div>
                          <div className="se-history-status">
                            {redemption.processed ? '✓' : '○'}
                          </div>
                        </div>
                      );
                    })}
                </div>
                {allRedemptions.length > itemsPerPage && (
                  <div className="se-history-pagination">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="se-page-btn"
                    >
                      ‹
                    </button>
                    <span className="se-page-info">
                      {currentPage} / {Math.ceil(allRedemptions.length / itemsPerPage)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(allRedemptions.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(allRedemptions.length / itemsPerPage)}
                      className="se-page-btn"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
            </div>
              )}
            </div>
            )}
          </div>
        </div>
    </div>
  );
}
