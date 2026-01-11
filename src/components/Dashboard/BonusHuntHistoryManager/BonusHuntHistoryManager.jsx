/**
 * Bonus Hunt History Manager Component
 * Track all bonuses, calculate stats, and manage hunt data
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { 
  addBonusToHistory, 
  updateBonusInHistory,
  formatCurrency, 
  formatMultiplier, 
  formatNumber 
} from '../../../utils/historicalTrackingUtils';
import '../SlotHistoryManager/SlotHistoryManager.css';

export default function BonusHuntHistoryManager({ userId }) {
  const [bonuses, setBonuses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    hunt_name: '',
    slot_name: '',
    provider: '',
    bet_size: '',
    bonus_cost: '',
    bonus_win: '',
    notes: ''
  });

  useEffect(() => {
    loadBonusHistory();
    loadBonusStats();
    subscribeToUpdates();
  }, [userId]);

  const loadBonusHistory = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('bonus_hunt_history')
        .select('*')
        .eq('user_id', userId)
        .order('opened_at', { ascending: false });

      if (fetchError) throw fetchError;
      setBonuses(data || []);
    } catch (err) {
      console.error('Error loading bonus history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBonusStats = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('bonus_hunt_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      setStats(data);
    } catch (err) {
      console.error('Error loading bonus stats:', err);
    }
  };

  const subscribeToUpdates = () => {
    const bonusChannel = supabase
      .channel(`bonus_hunt_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bonus_hunt_history',
        filter: `user_id=eq.${userId}`
      }, () => {
        loadBonusHistory();
      })
      .subscribe();

    const statsChannel = supabase
      .channel(`bonus_stats_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bonus_hunt_stats',
        filter: `user_id=eq.${userId}`
      }, () => {
        loadBonusStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bonusChannel);
      supabase.removeChannel(statsChannel);
    };
  };

  const handleAddBonus = async (e) => {
    e.preventDefault();
    
    try {
      const betSize = parseFloat(formData.bet_size);
      const bonusCost = parseFloat(formData.bonus_cost);
      const bonusWin = parseFloat(formData.bonus_win) || 0;

      if (!formData.slot_name || !betSize || !bonusCost) {
        alert('Please fill in all required fields');
        return;
      }

      await addBonusToHistory(supabase, userId, {
        hunt_name: formData.hunt_name || `Hunt ${new Date().toLocaleDateString()}`,
        slot_name: formData.slot_name,
        provider: formData.provider || 'Unknown',
        bet_size: betSize,
        bonus_cost: bonusCost,
        bonus_win: bonusWin,
        notes: formData.notes
      });

      // Reset form
      setFormData({
        hunt_name: '',
        slot_name: '',
        provider: '',
        bet_size: '',
        bonus_cost: '',
        bonus_win: '',
        notes: ''
      });
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding bonus:', err);
      alert(`Failed to add bonus: ${err.message}`);
    }
  };

  const handleEditBonus = async (bonusId, updates) => {
    try {
      await updateBonusInHistory(supabase, bonusId, updates);
      setEditingId(null);
    } catch (err) {
      console.error('Error updating bonus:', err);
      alert(`Failed to update: ${err.message}`);
    }
  };

  const handleDeleteBonus = async (bonusId) => {
    if (!confirm('Delete this bonus? This cannot be undone.')) return;

    try {
      const { error: deleteError } = await supabase
        .from('bonus_hunt_history')
        .delete()
        .eq('id', bonusId);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('Error deleting bonus:', err);
      alert(`Failed to delete: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="bonus-history-manager">
        <div className="loading-state">Loading bonus hunt history...</div>
      </div>
    );
  }

  return (
    <div className="bonus-history-manager">
      <div className="manager-header">
        <h2>🎯 Bonus Hunt History</h2>
        <p className="manager-subtitle">Track bonuses, calculate averages, and analyze hunt performance</p>
      </div>

      {/* Summary Stats */}
      {stats && (
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-icon">🎰</div>
            <div className="stat-content">
              <div className="stat-value">{formatNumber(stats.total_bonuses)}</div>
              <div className="stat-label">Total Bonuses</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-value">{formatCurrency(stats.total_cost)}</div>
              <div className="stat-label">Total Cost</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-value">{formatCurrency(stats.total_won)}</div>
              <div className="stat-label">Total Won</div>
            </div>
          </div>
          <div className={`stat-card ${stats.total_profit_loss >= 0 ? 'positive' : 'negative'}`}>
            <div className="stat-icon">{stats.total_profit_loss >= 0 ? '📈' : '📉'}</div>
            <div className="stat-content">
              <div className="stat-value">{formatCurrency(stats.total_profit_loss)}</div>
              <div className="stat-label">Net Profit/Loss</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{formatMultiplier(stats.average_multiplier)}</div>
              <div className="stat-label">Avg Multiplier</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎲</div>
            <div className="stat-content">
              <div className="stat-value">{formatMultiplier(stats.required_multiplier)}</div>
              <div className="stat-label">Required Multi</div>
            </div>
          </div>
        </div>
      )}

      {/* Best Ever Records */}
      {stats && stats.best_bonus_payout > 0 && (
        <div className="best-records">
          <h3>🏆 Best Ever Records</h3>
          <div className="records-grid">
            <div className="record-item">
              <span className="record-label">Best Payout:</span>
              <span className="record-value">{formatCurrency(stats.best_bonus_payout)}</span>
            </div>
            <div className="record-item">
              <span className="record-label">Best Multiplier:</span>
              <span className="record-value">{formatMultiplier(stats.best_bonus_multiplier)}</span>
            </div>
            {stats.best_bonus_slot && (
              <div className="record-item">
                <span className="record-label">Best Slot:</span>
                <span className="record-value">{stats.best_bonus_slot}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Bonus Button */}
      <button onClick={() => setShowAddForm(!showAddForm)} className="add-btn">
        {showAddForm ? '✕ Cancel' : '+ Add Bonus'}
      </button>

      {/* Add Bonus Form */}
      {showAddForm && (
        <form onSubmit={handleAddBonus} className="add-bonus-form">
          <div className="form-grid">
            <div className="form-field">
              <label>Hunt Name (Optional)</label>
              <input
                type="text"
                value={formData.hunt_name}
                onChange={(e) => setFormData({...formData, hunt_name: e.target.value})}
                placeholder="e.g., Saturday Hunt"
              />
            </div>
            <div className="form-field">
              <label>Slot Name *</label>
              <input
                type="text"
                required
                value={formData.slot_name}
                onChange={(e) => setFormData({...formData, slot_name: e.target.value})}
                placeholder="e.g., Gates of Olympus"
              />
            </div>
            <div className="form-field">
              <label>Provider</label>
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => setFormData({...formData, provider: e.target.value})}
                placeholder="e.g., Pragmatic Play"
              />
            </div>
            <div className="form-field">
              <label>Bet Size *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.bet_size}
                onChange={(e) => setFormData({...formData, bet_size: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div className="form-field">
              <label>Bonus Cost *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.bonus_cost}
                onChange={(e) => setFormData({...formData, bonus_cost: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div className="form-field">
              <label>Bonus Win</label>
              <input
                type="number"
                step="0.01"
                value={formData.bonus_win}
                onChange={(e) => setFormData({...formData, bonus_win: e.target.value})}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="form-field full-width">
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Add any notes..."
              rows="3"
            />
          </div>
          <button type="submit" className="save-btn">Add Bonus</button>
        </form>
      )}

      {/* Bonuses Table */}
      <div className="bonus-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Slot</th>
              <th>Bet Size</th>
              <th>Cost</th>
              <th>Win</th>
              <th>Multi</th>
              <th>P/L</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bonuses.length === 0 ? (
              <tr>
                <td colSpan="9" style={{textAlign: 'center', padding: '40px'}}>
                  No bonuses yet. Click "Add Bonus" to start tracking!
                </td>
              </tr>
            ) : (
              bonuses.map(bonus => (
                <tr key={bonus.id}>
                  <td>{new Date(bonus.opened_at).toLocaleDateString()}</td>
                  <td>{bonus.slot_name}</td>
                  <td>{formatCurrency(bonus.bet_size)}</td>
                  <td>{formatCurrency(bonus.bonus_cost)}</td>
                  <td>{formatCurrency(bonus.bonus_win)}</td>
                  <td>{formatMultiplier(bonus.bonus_multiplier)}</td>
                  <td className={bonus.profit_loss >= 0 ? 'profit' : 'loss'}>
                    {formatCurrency(bonus.profit_loss)}
                  </td>
                  <td>
                    {bonus.is_win ? 
                      <span className="win-badge">Win</span> : 
                      <span className="loss-badge">Loss</span>
                    }
                  </td>
                  <td>
                    <button 
                      onClick={() => handleDeleteBonus(bonus.id)} 
                      className="delete-btn"
                      style={{padding: '4px 8px', fontSize: '11px'}}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
