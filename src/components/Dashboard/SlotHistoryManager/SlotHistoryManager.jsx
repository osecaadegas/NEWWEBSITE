/**
 * Slot History Manager Component
 * View, edit, and track per-slot historical stats
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { formatCurrency, formatPercentage, formatNumber } from '../../../utils/historicalTrackingUtils';
import './SlotHistoryManager.css';

export default function SlotHistoryManager({ userId }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('total_plays');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterProvider, setFilterProvider] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    loadSlotHistory();
    subscribeToUpdates();
  }, [userId]);

  const loadSlotHistory = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('slot_history')
        .select('*')
        .eq('user_id', userId)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (fetchError) throw fetchError;
      setSlots(data || []);
    } catch (err) {
      console.error('Error loading slot history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel(`slot_history_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'slot_history',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setSlots(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setSlots(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
        } else if (payload.eventType === 'DELETE') {
          setSlots(prev => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    loadSlotHistory();
  };

  const handleEdit = (slot) => {
    setEditingId(slot.id);
    setEditValues({
      total_plays: slot.total_plays,
      total_wins: slot.total_wins,
      total_wagered: slot.total_wagered,
      total_won: slot.total_won,
      biggest_win_amount: slot.biggest_win_amount,
      best_multiplier: slot.best_multiplier
    });
  };

  const handleSaveEdit = async (slotId) => {
    try {
      // Recalculate derived fields
      const totalWagered = parseFloat(editValues.total_wagered) || 0;
      const totalWon = parseFloat(editValues.total_won) || 0;
      const totalPlays = parseInt(editValues.total_plays) || 0;
      const totalWins = parseInt(editValues.total_wins) || 0;

      const updates = {
        ...editValues,
        total_profit_loss: totalWon - totalWagered,
        average_payout: totalPlays > 0 ? totalWon / totalPlays : 0,
        win_rate: totalPlays > 0 ? (totalWins / totalPlays) * 100 : 0,
        rtp: totalWagered > 0 ? (totalWon / totalWagered) * 100 : 0
      };

      const { error: updateError } = await supabase
        .from('slot_history')
        .update(updates)
        .eq('id', slotId);

      if (updateError) throw updateError;

      setEditingId(null);
      setEditValues({});
    } catch (err) {
      console.error('Error updating slot:', err);
      alert(`Failed to update: ${err.message}`);
    }
  };

  const handleDelete = async (slotId) => {
    if (!confirm('Delete this slot history? This cannot be undone.')) return;

    try {
      const { error: deleteError } = await supabase
        .from('slot_history')
        .delete()
        .eq('id', slotId);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('Error deleting slot:', err);
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const filteredSlots = slots.filter(slot => {
    const matchesProvider = filterProvider === 'all' || slot.provider === filterProvider;
    const matchesSearch = slot.slot_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesProvider && matchesSearch;
  });

  const providers = [...new Set(slots.map(s => s.provider).filter(Boolean))];

  const totalStats = {
    totalSlots: filteredSlots.length,
    totalPlays: filteredSlots.reduce((sum, s) => sum + (s.total_plays || 0), 0),
    totalWagered: filteredSlots.reduce((sum, s) => sum + (s.total_wagered || 0), 0),
    totalWon: filteredSlots.reduce((sum, s) => sum + (s.total_won || 0), 0),
    totalProfitLoss: filteredSlots.reduce((sum, s) => sum + (s.total_profit_loss || 0), 0),
    bestSlot: filteredSlots.reduce((best, s) => 
      (s.biggest_win_amount || 0) > (best.biggest_win_amount || 0) ? s : best, 
      filteredSlots[0]
    )
  };

  if (loading) {
    return (
      <div className="slot-history-manager">
        <div className="loading-state">Loading slot history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="slot-history-manager">
        <div className="error-state">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="slot-history-manager">
      <div className="manager-header">
        <h2>🎰 Slot History</h2>
        <p className="manager-subtitle">Track per-slot stats, wins, and performance</p>
      </div>

      {/* Summary Stats */}
      <div className="stats-summary">
        <div className="stat-card">
          <div className="stat-icon">🎮</div>
          <div className="stat-content">
            <div className="stat-value">{formatNumber(totalStats.totalSlots)}</div>
            <div className="stat-label">Unique Slots</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎲</div>
          <div className="stat-content">
            <div className="stat-value">{formatNumber(totalStats.totalPlays)}</div>
            <div className="stat-label">Total Plays</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(totalStats.totalWagered)}</div>
            <div className="stat-label">Total Wagered</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(totalStats.totalWon)}</div>
            <div className="stat-label">Total Won</div>
          </div>
        </div>
        <div className={`stat-card ${totalStats.totalProfitLoss >= 0 ? 'positive' : 'negative'}`}>
          <div className="stat-icon">{totalStats.totalProfitLoss >= 0 ? '📈' : '📉'}</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(totalStats.totalProfitLoss)}</div>
            <div className="stat-label">Net Profit/Loss</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="manager-filters">
        <input
          type="text"
          placeholder="Search slots..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={filterProvider}
          onChange={(e) => setFilterProvider(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Providers</option>
          {providers.map(provider => (
            <option key={provider} value={provider}>{provider}</option>
          ))}
        </select>
      </div>

      {/* Slot Cards */}
      <div className="slots-grid">
        {filteredSlots.length === 0 ? (
          <div className="empty-state">
            <p>No slot history yet. Start playing to track your stats!</p>
          </div>
        ) : (
          filteredSlots.map(slot => (
            <div key={slot.id} className="slot-card">
              {slot.image_url && (
                <div className="slot-image">
                  <img src={slot.image_url} alt={slot.slot_name} />
                </div>
              )}
              <div className="slot-header">
                <h3>{slot.slot_name}</h3>
                {slot.provider && <span className="provider-badge">{slot.provider}</span>}
              </div>

              {editingId === slot.id ? (
                <div className="slot-edit-mode">
                  <div className="edit-row">
                    <label>Total Plays:</label>
                    <input
                      type="number"
                      value={editValues.total_plays}
                      onChange={(e) => setEditValues({...editValues, total_plays: e.target.value})}
                    />
                  </div>
                  <div className="edit-row">
                    <label>Total Wins:</label>
                    <input
                      type="number"
                      value={editValues.total_wins}
                      onChange={(e) => setEditValues({...editValues, total_wins: e.target.value})}
                    />
                  </div>
                  <div className="edit-row">
                    <label>Total Wagered:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editValues.total_wagered}
                      onChange={(e) => setEditValues({...editValues, total_wagered: e.target.value})}
                    />
                  </div>
                  <div className="edit-row">
                    <label>Total Won:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editValues.total_won}
                      onChange={(e) => setEditValues({...editValues, total_won: e.target.value})}
                    />
                  </div>
                  <div className="edit-row">
                    <label>Biggest Win:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editValues.biggest_win_amount}
                      onChange={(e) => setEditValues({...editValues, biggest_win_amount: e.target.value})}
                    />
                  </div>
                  <div className="edit-row">
                    <label>Best Multiplier:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editValues.best_multiplier}
                      onChange={(e) => setEditValues({...editValues, best_multiplier: e.target.value})}
                    />
                  </div>
                  <div className="edit-actions">
                    <button onClick={() => handleSaveEdit(slot.id)} className="save-btn">Save</button>
                    <button onClick={() => setEditingId(null)} className="cancel-btn">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="slot-stats">
                    <div className="stat-row">
                      <span className="stat-label">Plays:</span>
                      <span className="stat-value">{formatNumber(slot.total_plays)}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Win Rate:</span>
                      <span className="stat-value">{formatPercentage(slot.win_rate)}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">RTP:</span>
                      <span className="stat-value">{formatPercentage(slot.rtp)}</span>
                    </div>
                    <div className="stat-row highlight">
                      <span className="stat-label">Biggest Win:</span>
                      <span className="stat-value">{formatCurrency(slot.biggest_win_amount)}</span>
                    </div>
                    <div className="stat-row highlight">
                      <span className="stat-label">Best Multiplier:</span>
                      <span className="stat-value">{slot.best_multiplier?.toFixed(2)}x</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Total Wagered:</span>
                      <span className="stat-value">{formatCurrency(slot.total_wagered)}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Total Won:</span>
                      <span className="stat-value">{formatCurrency(slot.total_won)}</span>
                    </div>
                    <div className={`stat-row ${slot.total_profit_loss >= 0 ? 'profit' : 'loss'}`}>
                      <span className="stat-label">Profit/Loss:</span>
                      <span className="stat-value">{formatCurrency(slot.total_profit_loss)}</span>
                    </div>
                  </div>

                  <div className="slot-actions">
                    <button onClick={() => handleEdit(slot)} className="edit-btn">Edit</button>
                    <button onClick={() => handleDelete(slot.id)} className="delete-btn">Delete</button>
                  </div>
                </>
              )}

              <div className="slot-footer">
                <span className="last-played">Last played: {new Date(slot.last_played_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
