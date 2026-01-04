import { supabase } from '../../../config/supabaseClient';

export default function TheLifeBank({ 
  player,
  setPlayer,
  depositAmount,
  setDepositAmount,
  withdrawAmount,
  setWithdrawAmount,
  setMessage,
  user
}) {
  // Props include setDepositAmount and setWithdrawAmount for clearing inputs
  const depositToBank = async (amount) => {
    if (amount > player.cash) {
      setMessage({ type: 'error', text: 'Not enough cash!' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('the_life_players')
        .update({
          cash: player.cash - amount,
          bank_balance: player.bank_balance + amount
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      setMessage({ type: 'success', text: `Deposited $${amount.toLocaleString()}` });
      setDepositAmount('');
    } catch (err) {
      console.error('Error depositing:', err);
    }
  };

  const withdrawFromBank = async (amount) => {
    if (amount > player.bank_balance) {
      setMessage({ type: 'error', text: 'Not enough in bank!' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('the_life_players')
        .update({
          cash: player.cash + amount,
          bank_balance: player.bank_balance - amount
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      setMessage({ type: 'success', text: `Withdrew $${amount.toLocaleString()}` });
      setWithdrawAmount('');
    } catch (err) {
      console.error('Error withdrawing:', err);
    }
  };

  return (
    <div className="bank-section">
      <h2>🏦 Bank</h2>
      <p>Keep your money safe from other players!</p>
      <div className="bank-actions">
        <div className="bank-deposit">
          <h3>💰 Deposit Cash</h3>
          <p>Available: ${player?.cash?.toLocaleString()}</p>
          <input 
            type="number" 
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Amount"
          />
          <div className="bank-buttons">
            <button 
              onClick={() => depositToBank(parseInt(depositAmount))}
              disabled={!depositAmount || depositAmount <= 0}
            >
              Deposit
            </button>
            <button 
              onClick={() => depositToBank(player.cash)}
              disabled={player?.cash === 0}
            >
              Deposit All
            </button>
          </div>
        </div>
        <div className="bank-withdraw">
          <h3>🏦 Withdraw Cash</h3>
          <p>In Bank: ${player?.bank_balance?.toLocaleString()}</p>
          <input 
            type="number" 
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Amount"
          />
          <div className="bank-buttons">
            <button 
              onClick={() => withdrawFromBank(parseInt(withdrawAmount))}
              disabled={!withdrawAmount || withdrawAmount <= 0}
            >
              Withdraw
            </button>
            <button 
              onClick={() => withdrawFromBank(player.bank_balance)}
              disabled={player?.bank_balance === 0}
            >
              Withdraw All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
