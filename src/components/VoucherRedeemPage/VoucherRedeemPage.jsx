import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import './VoucherRedeemPage.css';

function VoucherRedeemPage() {
  const { user } = useAuth();
  const [voucherCode, setVoucherCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redemptionHistory, setRedemptionHistory] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      fetchRedemptionHistory();
    }
  }, [user]);

  const fetchRedemptionHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('voucher_redemptions')
        .select(`
          *,
          voucher_codes(code, points)
        `)
        .eq('user_id', user.id)
        .order('redeemed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRedemptionHistory(data || []);
    } catch (error) {
      console.error('Error fetching redemption history:', error);
    }
  };

  const redeemVoucher = async (e) => {
    e.preventDefault();
    
    if (!voucherCode.trim()) {
      setMessage({ type: 'error', text: 'Please enter a voucher code' });
      return;
    }

    setRedeeming(true);
    setMessage({ type: '', text: '' });

    try {
      // Fetch voucher details
      const { data: voucher, error: fetchError } = await supabase
        .from('voucher_codes')
        .select('*')
        .eq('code', voucherCode.toUpperCase())
        .single();

      if (fetchError || !voucher) {
        setMessage({ type: 'error', text: 'Invalid voucher code' });
        setRedeeming(false);
        return;
      }

      // Check if voucher is active
      if (!voucher.is_active) {
        setMessage({ type: 'error', text: 'This voucher is no longer active' });
        setRedeeming(false);
        return;
      }

      // Check if expired
      if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
        setMessage({ type: 'error', text: 'This voucher has expired' });
        setRedeeming(false);
        return;
      }

      // Check if max uses reached
      if (voucher.max_uses > 0 && voucher.current_uses >= voucher.max_uses) {
        setMessage({ type: 'error', text: 'This voucher has reached its maximum uses' });
        setRedeeming(false);
        return;
      }

      // Check if user already redeemed this voucher
      const { data: existingRedemption } = await supabase
        .from('voucher_redemptions')
        .select('id')
        .eq('voucher_id', voucher.id)
        .eq('user_id', user.id)
        .single();

      if (existingRedemption) {
        setMessage({ type: 'error', text: 'You have already redeemed this voucher' });
        setRedeeming(false);
        return;
      }

      // Get user's StreamElements connection
      const { data: seConnection } = await supabase
        .from('streamelements_connections')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!seConnection) {
        setMessage({ type: 'error', text: 'Please connect your StreamElements account first in Points Store' });
        setRedeeming(false);
        return;
      }

      // Award points via StreamElements API
      const response = await fetch(
        `https://api.streamelements.com/kappa/v2/points/${seConnection.se_channel_id}/${seConnection.se_username}/${voucher.points}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${seConnection.se_jwt_token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to award points via StreamElements');
      }

      // Record redemption
      const { error: redemptionError } = await supabase
        .from('voucher_redemptions')
        .insert([{
          voucher_id: voucher.id,
          user_id: user.id,
          points_awarded: voucher.points
        }]);

      if (redemptionError) throw redemptionError;

      // Update voucher uses count
      const { error: voucherUpdateError } = await supabase
        .from('voucher_codes')
        .update({ current_uses: voucher.current_uses + 1 })
        .eq('id', voucher.id);

      if (voucherUpdateError) throw voucherUpdateError;

      setMessage({ 
        type: 'success', 
        text: `Success! You received ${voucher.points.toLocaleString()} points!` 
      });
      setVoucherCode('');
      fetchRedemptionHistory();

    } catch (error) {
      console.error('Error redeeming voucher:', error);
      setMessage({ type: 'error', text: 'Failed to redeem voucher. Please try again.' });
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="voucher-redeem-page">
      <div className="voucher-redeem-container">
        <div className="redeem-header">
          <h1>🎟️ Redeem Voucher</h1>
          <p>Enter your voucher code to claim your points</p>
        </div>

        <form onSubmit={redeemVoucher} className="redeem-form">
          <div className="voucher-input-container">
            <input
              type="text"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              placeholder="ENTER-CODE-HERE"
              className="voucher-input"
              maxLength="20"
              disabled={redeeming}
            />
            <button 
              type="submit" 
              className="redeem-button"
              disabled={redeeming || !voucherCode.trim()}
            >
              {redeeming ? 'Redeeming...' : 'Redeem'}
            </button>
          </div>

          {message.text && (
            <div className={`message ${message.type}`}>
              {message.type === 'success' ? '✅' : '❌'} {message.text}
            </div>
          )}
        </form>

        {redemptionHistory.length > 0 && (
          <div className="redemption-history">
            <h2>Redemption History</h2>
            <div className="history-list">
              {redemptionHistory.map((redemption) => (
                <div key={redemption.id} className="history-item">
                  <div className="history-code">{redemption.voucher_codes?.code}</div>
                  <div className="history-points">+{redemption.points_awarded.toLocaleString()} points</div>
                  <div className="history-date">
                    {new Date(redemption.redeemed_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VoucherRedeemPage;
