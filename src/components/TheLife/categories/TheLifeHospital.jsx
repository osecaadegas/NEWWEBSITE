import { supabase } from '../../../config/supabaseClient';

export default function TheLifeHospital({ 
  player,
  setPlayer,
  isInHospital,
  hospitalTimeRemaining,
  setMessage,
  initializePlayer,
  user
}) {
  const emergencyRecovery = async () => {
    const recoveryCost = Math.floor((player.cash + player.bank_balance) * 0.15);
    const totalWealth = player.cash + player.bank_balance;
    
    if (totalWealth < recoveryCost) {
      setMessage({ type: 'error', text: 'Not enough money for recovery!' });
      return;
    }
    
    let newCash = player.cash;
    let newBank = player.bank_balance;
    
    if (player.cash >= recoveryCost) {
      newCash -= recoveryCost;
    } else {
      const remaining = recoveryCost - player.cash;
      newCash = 0;
      newBank -= remaining;
    }
    
    const { data, error } = await supabase
      .from('the_life_players')
      .update({
        hp: player.max_hp,
        cash: newCash,
        bank_balance: newBank,
        hospital_until: null
      })
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (!error) {
      setPlayer(data);
      setMessage({ type: 'success', text: 'Fully recovered! You\'re back in action!' });
    }
  };

  const buyService = async (cost, hpRestore) => {
    if (player.cash < cost) {
      setMessage({ type: 'error', text: 'Not enough cash!' });
      return;
    }
    
    const { data, error } = await supabase
      .from('the_life_players')
      .update({
        cash: player.cash - cost,
        hp: Math.min(player.max_hp, player.hp + hpRestore)
      })
      .eq('user_id', user.id)
      .select()
      .single();
      
    if (!error) {
      setPlayer(data);
      setMessage({ type: 'success', text: `Restored ${hpRestore} HP!` });
    }
  };

  const buyFullRecovery = async () => {
    if (player.cash < 1500) {
      setMessage({ type: 'error', text: 'Not enough cash!' });
      return;
    }
    
    const { data, error } = await supabase
      .from('the_life_players')
      .update({
        cash: player.cash - 1500,
        hp: player.max_hp
      })
      .eq('user_id', user.id)
      .select()
      .single();
      
    if (!error) {
      setPlayer(data);
      setMessage({ type: 'success', text: 'Fully restored!' });
    }
  };

  if (player?.hp === 0) {
    const recoveryCost = Math.floor((player.cash + player.bank_balance) * 0.15);
    
    return (
      <div className="hospital-section">
        <h2>🏥 Hospital</h2>
        <div className="hospital-emergency">
          <div className="hospital-status">
            <h3>💀 Critical Condition!</h3>
            <p>Your HP is at 0. You need immediate medical attention!</p>
          </div>
          <div className="recovery-option">
            <h4>🚑 Emergency Recovery</h4>
            <p>Restore to full HP instantly</p>
            <div className="recovery-cost">
              Cost: ${recoveryCost.toLocaleString()} (15% of total wealth)
            </div>
            <button 
              className="recovery-btn"
              onClick={emergencyRecovery}
              disabled={player.cash + player.bank_balance < recoveryCost}
            >
              Pay for Recovery
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isInHospital) {
    const recoveryCost = Math.floor((player.cash + player.bank_balance) * 0.15);
    
    return (
      <div className="hospital-section">
        <h2>🏥 Hospital</h2>
        <div className="hospital-active">
          <div className="hospital-status">
            <h3>🤕 You are recovering...</h3>
            <p>You lost all your HP and need time to recover</p>
            {hospitalTimeRemaining && (
              <div className="hospital-timer">
                <span className="timer-label">Recovery Time Remaining:</span>
                <span className="timer-value">
                  {hospitalTimeRemaining.minutes}m {hospitalTimeRemaining.seconds}s
                </span>
              </div>
            )}
            {!hospitalTimeRemaining && (
              <div className="hospital-timer">
                <span className="timer-label">Release Time:</span>
                <span className="timer-value">{new Date(player.hospital_until).toLocaleString()}</span>
              </div>
            )}
          </div>
          <div className="hospital-info">
            <p>💊 Rest up and recover your strength</p>
            <p>⏰ You'll be released automatically when the timer expires</p>
            <p>🚨 Or pay for early release below</p>
          </div>
          <div className="recovery-option">
            <h4>🚑 Emergency Early Release</h4>
            <p>Pay to leave hospital early and restore to full HP</p>
            <div className="recovery-cost">
              Cost: ${recoveryCost.toLocaleString()} (15% of total wealth)
            </div>
            <button 
              className="recovery-btn"
              onClick={emergencyRecovery}
              disabled={player.cash + player.bank_balance < recoveryCost}
            >
              Pay for Early Release
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hospital-section">
      <h2>🏥 Hospital</h2>
      <div className="hospital-info">
        <h3>💊 Medical Services</h3>
        <p>Purchase medical services to restore your HP</p>
        
        <div className="hospital-services">
          <div className="service-item">
            <div className="service-icon">💊</div>
            <h4>Small Med Kit</h4>
            <p>Restores 25 HP</p>
            <div className="service-price">$500</div>
            <button 
              className="service-buy-btn"
              onClick={() => buyService(500, 25)}
              disabled={player.cash < 500 || player.hp >= player.max_hp}
            >
              Buy
            </button>
          </div>

          <div className="service-item">
            <div className="service-icon">💉</div>
            <h4>Large Med Kit</h4>
            <p>Restores 50 HP</p>
            <div className="service-price">$900</div>
            <button 
              className="service-buy-btn"
              onClick={() => buyService(900, 50)}
              disabled={player.cash < 900 || player.hp >= player.max_hp}
            >
              Buy
            </button>
          </div>

          <div className="service-item">
            <div className="service-icon">🧪</div>
            <h4>Full Recovery</h4>
            <p>Restores to MAX HP</p>
            <div className="service-price">$1,500</div>
            <button 
              className="service-buy-btn"
              onClick={buyFullRecovery}
              disabled={player.cash < 1500 || player.hp >= player.max_hp}
            >
              Buy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
