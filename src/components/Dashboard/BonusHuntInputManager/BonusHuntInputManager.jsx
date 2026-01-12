/**
 * BonusHuntInputManager - Redesigned Workflow
 * 
 * New Flow:
 * 1. View list of saved hunts + "Add Bonus Hunt" button
 * 2. Create hunt → Add bonuses → Save or Open
 * 3. Opening bonuses → Input payouts one by one
 * 4. History of completed hunts
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
import './BonusHuntInputManager.css';

export default function BonusHuntInputManager({ userId }) {
  // View modes: 'list', 'creating', 'opening'
  const [viewMode, setViewMode] = useState('list');
  
  // Hunt sessions
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [currentBonuses, setCurrentBonuses] = useState([]);
  
  // Current bonus being opened
  const [openingIndex, setOpeningIndex] = useState(0);
  
  // Form states
  const [huntSettings, setHuntSettings] = useState({
    hunt_name: '',
    start_amount: '',
    target_amount: '',
    stop_loss: ''
  });
  
  const [bonusForm, setBonusForm] = useState({
    slot_name: '',
    provider: '',
    bet_size: '',
    bonus_cost: '',
    slot_image: '',
    is_super_bonus: false
  });
  
  const [payoutForm, setPayoutForm] = useState({
    bonus_win: ''
  });
  
  // Autocomplete
  const [showSlotSuggestions, setShowSlotSuggestions] = useState(false);
  const [filteredSlots, setFilteredSlots] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    if (!userId) return;
    loadSessions();
  }, [userId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bonus_hunt_sessions')
        .select(`
          *,
          bonuses:bonus_hunt_history(count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionBonuses = async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('bonus_hunt_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCurrentBonuses(data || []);
      return data || [];
    } catch (err) {
      console.error('Error loading bonuses:', err);
      setError(err.message);
      return [];
    }
  };

  // ============================================================================
  // SLOT AUTOCOMPLETE
  // ============================================================================

  const searchSlots = async (searchTerm) => {
    try {
      const { data, error } = await supabase
        .from('slots')
        .select('id, name, provider, image')
        .ilike('name', `%${searchTerm}%`)
        .order('name')
        .limit(20);

      if (error) throw error;
      return (data || []).map(slot => ({
        ...slot,
        image_link: slot.image
      }));
    } catch (err) {
      console.error('Error searching slots:', err);
      return [];
    }
  };

  const handleSlotNameChange = async (e) => {
    const value = e.target.value;
    setBonusForm({ ...bonusForm, slot_name: value });

    if (value.length >= 3) {
      const results = await searchSlots(value);
      setFilteredSlots(results);
      setShowSlotSuggestions(results.length > 0);
    } else {
      setShowSlotSuggestions(false);
      setFilteredSlots([]);
    }
  };

  const handleSlotSelect = (slot) => {
    setBonusForm({
      ...bonusForm,
      slot_name: slot.name,
      provider: slot.provider,
      slot_image: slot.image_link || ''
    });
    setShowSlotSuggestions(false);
  };

  // ============================================================================
  // HUNT CREATION
  // ============================================================================

  const startNewHunt = async () => {
    if (!huntSettings.hunt_name) {
      setError('Please enter a hunt name');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bonus_hunt_sessions')
        .insert([{
          user_id: userId,
          hunt_name: huntSettings.hunt_name,
          start_amount: parseFloat(huntSettings.start_amount) || 0,
          target_amount: parseFloat(huntSettings.target_amount) || 0,
          stop_loss: parseFloat(huntSettings.stop_loss) || 0,
          status: 'building'
        }])
        .select()
        .single();

      if (error) throw error;
      
      setCurrentSession(data);
      setCurrentBonuses([]);
      setViewMode('creating');
      setError(null);
    } catch (err) {
      console.error('Error creating hunt:', err);
      setError(err.message);
    }
  };

  // ============================================================================
  // ADD BONUSES TO HUNT
  // ============================================================================

  const addBonusToHunt = async (e) => {
    e.preventDefault();

    if (!bonusForm.slot_name || !bonusForm.bet_size) {
      setError('Please fill in Slot Name and Bet Size');
      return;
    }

    try {
      const bonusCost = parseFloat(bonusForm.bonus_cost) || 0;
      const betSize = parseFloat(bonusForm.bet_size);

      const { data, error } = await supabase
        .from('bonus_hunt_history')
        .insert([{
          user_id: userId,
          session_id: currentSession.id,
          hunt_name: currentSession.hunt_name,
          slot_name: bonusForm.slot_name,
          provider: bonusForm.provider || 'Unknown',
          bet_size: betSize,
          bonus_cost: bonusCost,
          bonus_win: 0,
          bonus_multiplier: 0,
          profit_loss: -bonusCost,
          is_win: false,
          slot_image: bonusForm.slot_image || null,
          is_super_bonus: bonusForm.is_super_bonus
        }])
        .select()
        .single();

      if (error) throw error;

      setCurrentBonuses([...currentBonuses, data]);
      
      // Reset form but keep bet size
      setBonusForm({
        slot_name: '',
        provider: '',
        bet_size: bonusForm.bet_size,
        bonus_cost: '',
        slot_image: '',
        is_super_bonus: false
      });
      
      setError(null);
    } catch (err) {
      console.error('Error adding bonus:', err);
      setError(err.message);
    }
  };

  const removeBonusFromHunt = async (bonusId) => {
    if (!confirm('Remove this bonus from the hunt?')) return;

    try {
      const { error } = await supabase
        .from('bonus_hunt_history')
        .delete()
        .eq('id', bonusId);

      if (error) throw error;

      setCurrentBonuses(currentBonuses.filter(b => b.id !== bonusId));
    } catch (err) {
      console.error('Error removing bonus:', err);
      setError(err.message);
    }
  };

  // ============================================================================
  // SAVE HUNT
  // ============================================================================

  const saveHunt = async () => {
    if (currentBonuses.length === 0) {
      setError('Add at least one bonus before saving');
      return;
    }

    try {
      const { error } = await supabase
        .from('bonus_hunt_sessions')
        .update({ status: 'saved' })
        .eq('id', currentSession.id);

      if (error) throw error;

      alert(`Hunt "${currentSession.hunt_name}" saved with ${currentBonuses.length} bonuses!`);
      setViewMode('list');
      setCurrentSession(null);
      setCurrentBonuses([]);
      loadSessions();
    } catch (err) {
      console.error('Error saving hunt:', err);
      setError(err.message);
    }
  };

  // ============================================================================
  // HUNT MANAGEMENT
  // ============================================================================

  const setActiveHunt = async (sessionId) => {
    try {
      // First, deactivate all hunts for this user
      await supabase
        .from('bonus_hunt_sessions')
        .update({ is_active_for_display: false })
        .eq('user_id', userId);

      // Then activate the selected hunt
      const { error } = await supabase
        .from('bonus_hunt_sessions')
        .update({ is_active_for_display: true })
        .eq('id', sessionId);

      if (error) throw error;

      // Reload sessions to update UI
      loadSessions();
    } catch (err) {
      console.error('Error setting active hunt:', err);
      setError(err.message);
    }
  };

  const editHunt = async (session) => {
    try {
      // Set this hunt as active when editing
      await setActiveHunt(session.id);
      
      const bonuses = await loadSessionBonuses(session.id);
      setCurrentSession(session);
      setCurrentBonuses(bonuses);
      setViewMode('creating');
    } catch (err) {
      console.error('Error loading hunt for editing:', err);
      setError(err.message);
    }
  };

  const deleteHunt = async (sessionId, huntName) => {
    if (!confirm(`Are you sure you want to delete "${huntName}"? This will remove all bonuses in this hunt.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bonus_hunt_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      alert(`Hunt "${huntName}" deleted successfully!`);
      loadSessions();
    } catch (err) {
      console.error('Error deleting hunt:', err);
      setError(err.message);
    }
  };

  // ============================================================================
  // OPEN BONUSES (Input Payouts)
  // ============================================================================

  const startOpeningBonuses = async (session) => {
    try {
      await loadSessionBonuses(session.id);
      
      const { error } = await supabase
        .from('bonus_hunt_sessions')
        .update({ 
          status: 'opening',
          started_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (error) throw error;

      setCurrentSession(session);
      setOpeningIndex(0);
      setViewMode('opening');
    } catch (err) {
      console.error('Error starting bonus opening:', err);
      setError(err.message);
    }
  };

  const continueOpeningBonuses = async (session) => {
    try {
      // Set this hunt as active when opening
      await setActiveHunt(session.id);
      
      const bonuses = await loadSessionBonuses(session.id);
      
      // Find first unopened bonus
      const firstUnopened = bonuses.findIndex(b => b.bonus_win === 0);
      
      setCurrentSession(session);
      setOpeningIndex(firstUnopened >= 0 ? firstUnopened : 0);
      setViewMode('opening');
    } catch (err) {
      console.error('Error continuing bonus opening:', err);
      setError(err.message);
    }
  };

  const submitPayout = async (e) => {
    e.preventDefault();

    const bonus = currentBonuses[openingIndex];
    const bonusWin = parseFloat(payoutForm.bonus_win) || 0;
    const multiplier = bonus.bet_size > 0 ? (bonusWin / bonus.bet_size) : 0;
    const profitLoss = bonusWin - bonus.bonus_cost;
    const isWin = bonusWin > bonus.bonus_cost;

    try {
      const { error } = await supabase
        .from('bonus_hunt_history')
        .update({
          bonus_win: bonusWin,
          bonus_multiplier: parseFloat(multiplier.toFixed(2)),
          profit_loss: parseFloat(profitLoss.toFixed(2)),
          is_win: isWin,
          opened_at: new Date().toISOString()
        })
        .eq('id', bonus.id);

      if (error) throw error;

      // Update local state
      const updatedBonuses = [...currentBonuses];
      updatedBonuses[openingIndex] = {
        ...bonus,
        bonus_win: bonusWin,
        bonus_multiplier: parseFloat(multiplier.toFixed(2)),
        profit_loss: parseFloat(profitLoss.toFixed(2)),
        is_win: isWin
      };
      setCurrentBonuses(updatedBonuses);

      // Move to next bonus or complete
      if (openingIndex < currentBonuses.length - 1) {
        setOpeningIndex(openingIndex + 1);
        setPayoutForm({ bonus_win: '' });
      } else {
        // All bonuses opened - mark session as completed
        await supabase
          .from('bonus_hunt_sessions')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', currentSession.id);

        alert('Hunt completed! All bonuses opened.');
        setViewMode('list');
        setCurrentSession(null);
        setCurrentBonuses([]);
        setOpeningIndex(0);
        loadSessions();
      }
    } catch (err) {
      console.error('Error submitting payout:', err);
      setError(err.message);
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

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return <div className="bonus-hunt-input-manager"><p>Loading...</p></div>;
  }

  // VIEW: LIST OF HUNTS
  if (viewMode === 'list') {
    return (
      <div className="bonus-hunt-input-manager">
        <div className="bonus-hunt-header">
          <h2>🎯 Bonus Hunts</h2>
          <button onClick={() => setViewMode('creating')} className="btn-primary">
            ➕ Add Bonus Hunt
          </button>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className="hunts-grid">
          {sessions.length === 0 ? (
            <div className="empty-state">
              <p>No bonus hunts yet. Create your first hunt! 🎰</p>
            </div>
          ) : (
            sessions.map(session => (
              <div key={session.id} className={`hunt-card ${session.status === 'opening' ? 'active-hunt' : ''}`}>
                <div className="hunt-card-header">
                  <h3>{session.hunt_name}</h3>
                  <div className="hunt-badges">
                    {session.status === 'opening' && (
                      <span className="active-badge">
                        🔴 ACTIVE
                      </span>
                    )}
                    <span className={`status-badge status-${session.status}`}>
                      {session.status}
                    </span>
                  </div>
                </div>
                
                <div className="hunt-card-stats">
                  <div className="stat-row">
                    <span>Bonuses:</span>
                    <span>{session.bonuses_opened}/{session.bonuses_count}</span>
                  </div>
                  <div className="stat-row">
                    <span>Cost:</span>
                    <span>{formatCurrency(session.total_cost)}</span>
                  </div>
                  <div className="stat-row">
                    <span>Wins:</span>
                    <span>{formatCurrency(session.total_wins)}</span>
                  </div>
                  <div className="stat-row">
                    <span>P/L:</span>
                    <span className={session.total_profit_loss >= 0 ? 'profit' : 'loss'}>
                      {formatCurrency(session.total_profit_loss)}
                    </span>
                  </div>
                </div>

                <div className="hunt-card-actions">
                  <button 
                    onClick={() => setActiveHunt(session.id)}
                    className={session.is_active_for_display ? "btn-active" : "btn-secondary"}
                    disabled={session.is_active_for_display}
                  >
                    {session.is_active_for_display ? '⭐ Active' : 'Set Active'}
                  </button>
                  
                  {session.status === 'building' && (
                    <>
                      <button 
                        onClick={() => editHunt(session)}
                        className="btn-primary"
                      >
                        ✏️ Continue Building
                      </button>
                      <button 
                        onClick={() => deleteHunt(session.id, session.hunt_name)}
                        className="btn-danger"
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                  {session.status === 'saved' && (
                    <>
                      <button 
                        onClick={() => startOpeningBonuses(session)}
                        className="btn-primary"
                      >
                        🎰 Open Bonuses
                      </button>
                      <button 
                        onClick={() => editHunt(session)}
                        className="btn-secondary"
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => deleteHunt(session.id, session.hunt_name)}
                        className="btn-danger"
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                  {session.status === 'opening' && (
                    <>
                      <button 
                        onClick={() => continueOpeningBonuses(session)}
                        className="btn-primary"
                      >
                        ▶️ Continue Opening
                      </button>
                      <button 
                        onClick={() => deleteHunt(session.id, session.hunt_name)}
                        className="btn-danger"
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                  {session.status === 'completed' && (
                    <>
                      <button className="btn-secondary" disabled>
                        ✅ Completed
                      </button>
                      <button 
                        onClick={() => deleteHunt(session.id, session.hunt_name)}
                        className="btn-danger"
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // VIEW: CREATING HUNT (Adding Bonuses)
  if (viewMode === 'creating') {
    return (
      <div className="bonus-hunt-input-manager">
        <div className="bonus-hunt-header">
          <h2>🎯 {currentSession ? `Building: ${currentSession.hunt_name}` : 'New Bonus Hunt'}</h2>
          <button onClick={() => {
            setViewMode('list');
            setCurrentSession(null);
          }} className="btn-secondary">
            ← Back
          </button>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Step 1: Hunt Settings */}
        {!currentSession && (
          <div className="hunt-settings-section">
            <h3>Hunt Settings</h3>
            <div className="form-row">
              <div className="form-group required">
                <label>Hunt Name *</label>
                <input
                  type="text"
                  value={huntSettings.hunt_name}
                  onChange={(e) => setHuntSettings({ ...huntSettings, hunt_name: e.target.value })}
                  placeholder="e.g., Weekend Hunt"
                  required
                />
              </div>
              <div className="form-group">
                <label>Start Amount (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={huntSettings.start_amount}
                  onChange={(e) => setHuntSettings({ ...huntSettings, start_amount: e.target.value })}
                  placeholder="500.00"
                />
              </div>
              <div className="form-group">
                <label>Target Amount (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={huntSettings.target_amount}
                  onChange={(e) => setHuntSettings({ ...huntSettings, target_amount: e.target.value })}
                  placeholder="2000.00"
                />
              </div>
              <div className="form-group">
                <label>Stop Loss (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={huntSettings.stop_loss}
                  onChange={(e) => setHuntSettings({ ...huntSettings, stop_loss: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <button onClick={startNewHunt} className="btn-primary">
              Start Hunt
            </button>
          </div>
        )}

        {/* Step 2: Add Bonuses */}
        {currentSession && (
          <>
            <div className="current-bonuses-section">
              <h3>Bonuses in Hunt ({currentBonuses.length})</h3>
              {currentBonuses.length === 0 ? (
                <p className="empty-hint">Add your first bonus below</p>
              ) : (
                <div className="bonuses-list">
                  {currentBonuses.map((bonus, idx) => (
                    <div key={bonus.id} className={`bonus-item ${bonus.is_super_bonus ? 'super-bonus' : ''}`}>
                      <span className="bonus-number">#{idx + 1}</span>
                      {bonus.is_super_bonus && <span className="super-badge">⭐ SUPER</span>}
                      <span className="bonus-slot">{bonus.slot_name}</span>
                      <span className="bonus-bet">{formatCurrency(bonus.bet_size)}</span>
                      <span className="bonus-cost">{formatCurrency(bonus.bonus_cost)}</span>
                      <button 
                        onClick={() => removeBonusFromHunt(bonus.id)}
                        className="btn-remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="add-bonus-section">
              <h3>Add Bonus</h3>
              <form onSubmit={addBonusToHunt} className="bonus-form">
                <div className="form-row">
                  <div className="form-group required" style={{ position: 'relative' }}>
                    <label>Slot Name *</label>
                    <input
                      type="text"
                      value={bonusForm.slot_name}
                      onChange={handleSlotNameChange}
                      onFocus={() => bonusForm.slot_name.length >= 3 && setShowSlotSuggestions(true)}
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
                      value={bonusForm.provider}
                      onChange={(e) => setBonusForm({ ...bonusForm, provider: e.target.value })}
                      placeholder="e.g., Pragmatic Play"
                    />
                  </div>

                  <div className="form-group required">
                    <label>Bet Size * (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bonusForm.bet_size}
                      onChange={(e) => setBonusForm({ ...bonusForm, bet_size: e.target.value })}
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
                      value={bonusForm.bonus_cost}
                      onChange={(e) => setBonusForm({ ...bonusForm, bonus_cost: e.target.value })}
                      placeholder="100.00"
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={bonusForm.is_super_bonus}
                        onChange={(e) => setBonusForm({ ...bonusForm, is_super_bonus: e.target.checked })}
                      />
                      <span className="checkbox-text">⭐ SUPER Bonus</span>
                    </label>
                  </div>
                </div>

                <button type="submit" className="btn-primary">
                  ➕ Add Bonus
                </button>
              </form>
            </div>

            <div className="hunt-actions">
              <button 
                onClick={saveHunt}
                className="btn-success"
                disabled={currentBonuses.length === 0}
              >
                💾 Save Hunt
              </button>
              <button 
                onClick={() => startOpeningBonuses(currentSession)}
                className="btn-primary"
                disabled={currentBonuses.length === 0}
              >
                🎰 Open Bonuses
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // VIEW: OPENING BONUSES (Input Payouts)
  if (viewMode === 'opening' && currentBonuses.length > 0) {
    const currentBonus = currentBonuses[openingIndex];
    const progress = ((openingIndex + 1) / currentBonuses.length) * 100;

    return (
      <div className="bonus-hunt-input-manager">
        <div className="bonus-hunt-header">
          <h2>🎰 Opening: {currentSession?.hunt_name}</h2>
          <div className="progress-info">
            Bonus {openingIndex + 1} of {currentBonuses.length}
          </div>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className="opening-bonus-card">
          <div className="opening-bonus-header">
            {currentBonus.slot_image && (
              <div className="slot-image-container">
                <img src={currentBonus.slot_image} alt={currentBonus.slot_name} className="slot-image" />
              </div>
            )}
            <div className="slot-info">
              <h3>{currentBonus.slot_name}</h3>
              <p className="bonus-provider">{currentBonus.provider}</p>
            </div>
          </div>

          <div className="bonus-details">
            <div className="detail-item">
              <span className="detail-label">Bet Size:</span>
              <span className="detail-value">{formatCurrency(currentBonus.bet_size)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Bonus Cost:</span>
              <span className="detail-value">{formatCurrency(currentBonus.bonus_cost)}</span>
            </div>
          </div>

          <form onSubmit={submitPayout} className="payout-form">
            <div className="form-group">
              <label>Bonus Win (€) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={payoutForm.bonus_win}
                onChange={(e) => setPayoutForm({ bonus_win: e.target.value })}
                placeholder="Enter payout amount"
                required
                autoFocus
              />
            </div>

            {payoutForm.bonus_win && (
              <div className="payout-preview">
                <div className="preview-item">
                  <span>Multiplier:</span>
                  <span>{formatMultiplier(parseFloat(payoutForm.bonus_win) / currentBonus.bet_size)}</span>
                </div>
                <div className="preview-item">
                  <span>Profit/Loss:</span>
                  <span className={(parseFloat(payoutForm.bonus_win) - currentBonus.bonus_cost) >= 0 ? 'profit' : 'loss'}>
                    {formatCurrency(parseFloat(payoutForm.bonus_win) - currentBonus.bonus_cost)}
                  </span>
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary btn-large">
              {openingIndex < currentBonuses.length - 1 ? 'Next Bonus →' : 'Complete Hunt ✓'}
            </button>
          </form>
        </div>

        <div className="opened-bonuses-summary">
          <h4>Already Opened:</h4>
          <div className="opened-list">
            {currentBonuses.slice(0, openingIndex).map((bonus, idx) => (
              <div key={bonus.id} className="opened-item">
                <span>{bonus.slot_name}</span>
                <span>{formatMultiplier(bonus.bonus_multiplier)}</span>
                <span className={bonus.is_win ? 'profit' : 'loss'}>
                  {formatCurrency(bonus.profit_loss)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
