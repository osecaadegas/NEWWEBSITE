/**
 * BonusHuntInputManager
 * Production-ready bonus hunt tracking with real-time calculations and overlay updates
 * 
 * Features:
 * - Add/Edit/Delete bonus entries
 * - Real-time stat calculations (averages, required multiplier, P/L)
 * - Supabase persistence with Realtime updates
 * - Historical tracking integration
 * - Live overlay widget updates
 * - Inline editing with validation
 * - Slot selection integration
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
import './BonusHuntInputManager.css';

export default function BonusHuntInputManager({ userId }) {
  // State Management
  const [bonuses, setBonuses] = useState([]);
  const [stats, setStats] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showSlotSuggestions, setShowSlotSuggestions] = useState(false);
  const [filteredSlots, setFilteredSlots] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    hunt_name: '',
    slot_name: '',
    provider: '',
    bet_size: '',
    bonus_cost: '',
    bonus_win: '',
    start_amount: '',
    target_amount: '',
    stop_loss: '',
    notes: ''
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Fetch all bonuses for this user
  const fetchBonuses = async () => {
    try {
      const { data, error } = await supabase
        .from('bonus_hunt_history')
        .select('*')
        .eq('user_id', userId)
        .order('opened_at', { ascending: false });

      if (error) throw error;
      setBonuses(data || []);
    } catch (err) {
      console.error('Error fetching bonuses:', err);
      setError(err.message);
    }
  };

  // Fetch aggregated stats
  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('bonus_hunt_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Fetch available slots for selection
  const fetchSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('slots')
        .select('name, provider, image_link')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSlots(data || []);
    } catch (err) {
      console.error('Error fetching slots:', err);
    }
  };

  // Initial data load
  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchBonuses(),
        fetchStats(),
        fetchSlots()
      ]);
      setLoading(false);
    };

    loadData();
  }, [userId]);

  // ============================================================================
  // REALTIME SUBSCRIPTIONS
  // ============================================================================

  useEffect(() => {
    if (!userId) return;

    // Subscribe to bonus hunt history changes
    const bonusSubscription = supabase
      .channel('bonus_hunt_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bonus_hunt_history',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchBonuses();
        fetchStats(); // Stats auto-update via trigger
      })
      .subscribe();

    // Subscribe to stats changes
    const statsSubscription = supabase
      .channel('bonus_stats_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bonus_hunt_stats',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      bonusSubscription.unsubscribe();
      statsSubscription.unsubscribe();
    };
  }, [userId]);

  // ============================================================================
  // CALCULATIONS (Client-side for instant feedback)
  // ============================================================================

  const calculateBonusStats = (betSize, bonusCost, bonusWin) => {
    const bet = parseFloat(betSize) || 0;
    const cost = parseFloat(bonusCost) || 0;
    const win = parseFloat(bonusWin) || 0;

    const multiplier = bet > 0 ? (win / bet) : 0;
    const profitLoss = win - cost;
    const isWin = win > cost;

    return {
      bonus_multiplier: parseFloat(multiplier.toFixed(2)),
      profit_loss: parseFloat(profitLoss.toFixed(2)),
      is_win: isWin
    };
  };

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  // Add new bonus
  const handleAddBonus = async (e) => {
    e.preventDefault();

    if (!formData.slot_name || !formData.bet_size) {
      setError('Please fill in required fields: Slot Name and Bet Size');
      return;
    }

    try {
      const calculated = calculateBonusStats(
        formData.bet_size,
        formData.bonus_cost || 0,
        formData.bonus_win || 0
      );

      const insertData = {
        user_id: userId,
        hunt_name: formData.hunt_name || `Hunt ${new Date().toLocaleDateString()}`,
        slot_name: formData.slot_name,
        provider: formData.provider || 'Unknown',
        bet_size: parseFloat(formData.bet_size),
        bonus_win: parseFloat(formData.bonus_win) || 0,
        ...calculated,
        notes: formData.notes
      };

      // Add optional bonus_cost if provided
      if (formData.bonus_cost) {
        insertData.bonus_cost = parseFloat(formData.bonus_cost);
      }

      const { error } = await supabase
        .from('bonus_hunt_history')
        .insert([insertData]);

      if (error) throw error;

      // Reset form
      setFormData({
        hunt_name: formData.hunt_name, // Keep hunt name
        slot_name: '',
        provider: '',
        bet_size: formData.bet_size, // Keep bet size for convenience
        bonus_cost: '',
        bonus_win: '',
        start_amount: formData.start_amount, // Keep hunt settings
        target_amount: formData.target_amount,
        stop_loss: formData.stop_loss,
        notes: ''
      });

      setError(null);
    } catch (err) {
      console.error('Error adding bonus:', err);
      setError(err.message);
    }
  };

  // Update existing bonus
  const handleUpdateBonus = async (id, updates) => {
    try {
      const bonus = bonuses.find(b => b.id === id);
      if (!bonus) return;

      // Recalculate if numeric fields changed
      const calculated = calculateBonusStats(
        updates.bet_size ?? bonus.bet_size,
        updates.bonus_cost ?? bonus.bonus_cost,
        updates.bonus_win ?? bonus.bonus_win
      );

      const { error } = await supabase
        .from('bonus_hunt_history')
        .update({
          ...updates,
          ...calculated
        })
        .eq('id', id);

      if (error) throw error;
      setEditingId(null);
    } catch (err) {
      console.error('Error updating bonus:', err);
      setError(err.message);
    }
  };

  // Delete bonus
  const handleDeleteBonus = async (id) => {
    if (!confirm('Delete this bonus entry?')) return;

    try {
      const { error } = await supabase
        .from('bonus_hunt_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting bonus:', err);
      setError(err.message);
    }
  };

  // ============================================================================
  // SLOT SELECTION
  // ============================================================================

  // Slot selection integration
  const handleSlotSelect = (slot) => {
    setFormData({
      ...formData,
      slot_name: slot.name,
      provider: slot.provider
    });
    setShowSlotSuggestions(false);
  };

  // Handle slot name input change for autocomplete
  const handleSlotNameChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, slot_name: value });

    // Show suggestions after 3 characters
    if (value.length >= 3) {
      const filtered = slots.filter(slot =>
        slot.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSlots(filtered);
      setShowSlotSuggestions(true);
    } else {
      setShowSlotSuggestions(false);
      setFilteredSlots([]);
    }
  };

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(value || 0);
  };

  const formatMultiplier = (value) => {
    return `${(value || 0).toFixed(2)}x`;
  };

  if (loading) {
    return <div className="bonus-hunt-loading">Loading bonus hunt data...</div>;
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="bonus-hunt-input-manager">
      {/* Header with Stats Overview */}
      <div className="bonus-hunt-header">
        <h2>🎯 Bonus Hunt Manager</h2>
        {stats && (
          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-label">Total Bonuses:</span>
              <span className="stat-value">{stats.total_bonuses}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Required Multi:</span>
              <span className="stat-value danger">{formatMultiplier(stats.required_multiplier)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Current P/L:</span>
              <span className={`stat-value ${stats.total_profit_loss >= 0 ? 'success' : 'danger'}`}>
                {formatCurrency(stats.total_profit_loss)}
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Add Bonus Form */}
      <div className="add-bonus-section">
        <h3>➕ Add New Bonus</h3>
        <form onSubmit={handleAddBonus} className="bonus-form">
          <div className="form-row">
            <div className="form-group">
              <label>Start Amount (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.start_amount}
                onChange={(e) => setFormData({ ...formData, start_amount: e.target.value })}
                placeholder="e.g., 500.00"
              />
            </div>

            <div className="form-group">
              <label>Target Amount (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.target_amount}
                onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                placeholder="e.g., 2000.00"
              />
            </div>

            <div className="form-group">
              <label>Stop Loss (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.stop_loss}
                onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
                placeholder="e.g., 0 for none"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Hunt Name (optional)</label>
              <input
                type="text"
                value={formData.hunt_name}
                onChange={(e) => setFormData({ ...formData, hunt_name: e.target.value })}
                placeholder="e.g., Christmas Hunt 2024"
              />
            </div>

            <div className="form-group required" style={{ position: 'relative' }}>
              <label>Slot Name *</label>
              <input
                type="text"
                value={formData.slot_name}
                onChange={handleSlotNameChange}
                onFocus={() => formData.slot_name.length >= 3 && setShowSlotSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSlotSuggestions(false), 200)}
                placeholder="Type at least 3 letters..."
                required
              />
              {showSlotSuggestions && filteredSlots.length > 0 && (
                <div className="slot-suggestions">
                  {filteredSlots.slice(0, 10).map((slot) => (
                    <div
                      key={slot.id}
                      className="suggestion-item"
                      onClick={() => handleSlotSelect(slot)}
                    >
                      {slot.image_link && (
                        <img src={slot.image_link} alt={slot.name} />
                      )}
                      <div className="suggestion-info">
                        <span className="suggestion-name">{slot.name}</span>
                        <span className="suggestion-provider">{slot.provider}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Provider</label>
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                placeholder="e.g., Pragmatic Play"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group required">
              <label>Bet Size * (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.bet_size}
                onChange={(e) => setFormData({ ...formData, bet_size: e.target.value })}
                placeholder="0.40"
                required
              />
            </div>

            <div className="form-group">
              <label>Bonus Cost (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.bonus_cost}
                onChange={(e) => setFormData({ ...formData, bonus_cost: e.target.value })}
                placeholder="100.00 (optional)"
              />
            </div>

            <div className="form-group">
              <label>Bonus Win (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.bonus_win}
                onChange={(e) => setFormData({ ...formData, bonus_win: e.target.value })}
                placeholder="0.00 (fill after opening)"
              />
            </div>

            <div className="form-group preview-calc">
              <label>Preview Multiplier</label>
              <div className="calc-display">
                {formData.bet_size && formData.bonus_win
                  ? formatMultiplier((parseFloat(formData.bonus_win) || 0) / (parseFloat(formData.bet_size) || 1))
                  : '0.00x'}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label>Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows="2"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary">
            ➕ Add Bonus
          </button>
        </form>
      </div>

      {/* Slot Selection Quick Picks */}
      {slots.length > 0 && (
        <div className="slot-quick-picks">
          <h4>Quick Select Slot:</h4>
          <div className="slot-grid">
            {slots.slice(0, 12).map((slot, idx) => (
              <button
                key={idx}
                className={`slot-card ${formData.slot_name === slot.name ? 'selected' : ''}`}
                onClick={() => handleSlotSelect(slot)}
              >
                {slot.image_link && (
                  <img src={slot.image_link} alt={slot.name} />
                )}
                <div className="slot-info">
                  <span className="slot-name">{slot.name}</span>
                  <span className="slot-provider">{slot.provider}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bonuses Table */}
      <div className="bonuses-table-section">
        <h3>📋 Bonus Entries ({bonuses.length})</h3>
        {bonuses.length === 0 ? (
          <div className="empty-state">
            <p>No bonuses added yet. Start by adding your first bonus above! 🎰</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="bonuses-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Slot</th>
                  <th>Provider</th>
                  <th>Bet</th>
                  <th>Cost</th>
                  <th>Win</th>
                  <th>Multi</th>
                  <th>P/L</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bonuses.map((bonus) => (
                  <tr key={bonus.id} className={editingId === bonus.id ? 'editing' : ''}>
                    <td>{new Date(bonus.opened_at).toLocaleDateString()}</td>
                    <td>
                      {editingId === bonus.id ? (
                        <input
                          type="text"
                          defaultValue={bonus.slot_name}
                          onBlur={(e) => handleUpdateBonus(bonus.id, { slot_name: e.target.value })}
                        />
                      ) : (
                        bonus.slot_name
                      )}
                    </td>
                    <td>{bonus.provider}</td>
                    <td>
                      {editingId === bonus.id ? (
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={bonus.bet_size}
                          onBlur={(e) => handleUpdateBonus(bonus.id, { bet_size: parseFloat(e.target.value) })}
                        />
                      ) : (
                        formatCurrency(bonus.bet_size)
                      )}
                    </td>
                    <td>
                      {editingId === bonus.id ? (
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={bonus.bonus_cost}
                          onBlur={(e) => handleUpdateBonus(bonus.id, { bonus_cost: parseFloat(e.target.value) })}
                        />
                      ) : (
                        formatCurrency(bonus.bonus_cost)
                      )}
                    </td>
                    <td>
                      {editingId === bonus.id ? (
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={bonus.bonus_win}
                          onBlur={(e) => handleUpdateBonus(bonus.id, { bonus_win: parseFloat(e.target.value) })}
                        />
                      ) : (
                        formatCurrency(bonus.bonus_win)
                      )}
                    </td>
                    <td className="multiplier-cell">
                      {formatMultiplier(bonus.bonus_multiplier)}
                    </td>
                    <td className={bonus.profit_loss >= 0 ? 'profit' : 'loss'}>
                      {formatCurrency(bonus.profit_loss)}
                    </td>
                    <td>
                      <span className={`status-badge ${bonus.is_win ? 'win' : 'loss'}`}>
                        {bonus.is_win ? '✓ Win' : '✗ Loss'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      {editingId === bonus.id ? (
                        <button onClick={() => setEditingId(null)} className="btn-done">
                          ✓
                        </button>
                      ) : (
                        <>
                          <button onClick={() => setEditingId(bonus.id)} className="btn-edit">
                            ✏️
                          </button>
                          <button onClick={() => handleDeleteBonus(bonus.id)} className="btn-delete">
                            🗑️
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats Cards */}
      {stats && (
        <div className="stats-summary">
          <h3>📊 Session Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-title">Total Cost</div>
                <div className="stat-number">{formatCurrency(stats.total_cost)}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🎁</div>
              <div className="stat-content">
                <div className="stat-title">Total Won</div>
                <div className="stat-number">{formatCurrency(stats.total_won)}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <div className="stat-title">Average Multi</div>
                <div className="stat-number">{formatMultiplier(stats.average_multiplier)}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-content">
                <div className="stat-title">Best Payout</div>
                <div className="stat-number">{formatCurrency(stats.best_bonus_payout)}</div>
                <div className="stat-subtitle">{stats.best_bonus_slot}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-content">
                <div className="stat-title">Best Multi</div>
                <div className="stat-number">{formatMultiplier(stats.best_bonus_multiplier)}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-title">Win Rate</div>
                <div className="stat-number">{stats.win_rate.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integration Notes for Overlay Widgets */}
      <div className="integration-notes">
        <details>
          <summary>🔌 Overlay Widget Integration</summary>
          <div className="notes-content">
            <p><strong>These stats auto-update the following overlay widgets:</strong></p>
            <ul>
              <li><code>RequiredMultiplierWidget</code> - reads from bonus_hunt_stats.required_multiplier</li>
              <li><code>BestMultiplierWidget</code> - reads from bonus_hunt_stats.best_bonus_multiplier</li>
              <li><code>BestBonusPayoutWidget</code> - reads from bonus_hunt_stats.best_bonus_payout</li>
              <li><code>AverageBonusCostWidget</code> - reads from bonus_hunt_stats.average_bonus_cost</li>
              <li><code>BonusesCountWidget</code> - reads from bonus_hunt_stats.total_bonuses</li>
              <li><code>CurrentAverageWidget</code> - reads from bonus_hunt_stats.average_multiplier</li>
            </ul>
            <p><strong>Realtime Updates:</strong> All changes trigger database triggers that recalculate stats automatically. Overlay widgets subscribe to these tables via Supabase Realtime.</p>
          </div>
        </details>
      </div>
    </div>
  );
}
