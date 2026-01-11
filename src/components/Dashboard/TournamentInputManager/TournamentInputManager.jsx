/**
 * TournamentInputManager
 * Production-ready tournament management with real-time overlay updates
 * 
 * Features:
 * - Create/manage tournaments with multiple rounds
 * - Add/remove players dynamically
 * - Assign slots to rounds
 * - Track scores, multipliers, and winners per round
 * - Calculate tournament stats (total score, placement, ROI)
 * - Supabase persistence with Realtime updates
 * - Live leaderboard with top players
 * - Historical tracking integration
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
import './TournamentInputManager.css';

export default function TournamentInputManager({ userId }) {
  // State Management
  const [tournaments, setTournaments] = useState([]);
  const [activeTournament, setActiveTournament] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [slots, setSlots] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [tournamentForm, setTournamentForm] = useState({
    tournament_name: '',
    entry_fee: '',
    prize_pool: '',
    notes: ''
  });

  const [roundForm, setRoundForm] = useState({
    round_number: 1,
    slot_name: '',
    bet_size: '',
    score: '',
    multiplier: '',
    player_name: ''
  });

  const [newPlayer, setNewPlayer] = useState('');

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Fetch all tournaments for this user
  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_history')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);

      // Set first active tournament as default
      const active = data?.find(t => t.status === 'active') || data?.[0];
      if (active) {
        setActiveTournament(active);
        fetchRounds(active.id);
      }
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      setError(err.message);
    }
  };

  // Fetch rounds for a tournament
  const fetchRounds = async (tournamentId) => {
    try {
      const { data, error } = await supabase
        .from('tournament_rounds')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_number');

      if (error) throw error;
      setRounds(data || []);
    } catch (err) {
      console.error('Error fetching rounds:', err);
    }
  };

  // Fetch available slots
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

  // Initial load
  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchTournaments(),
        fetchSlots()
      ]);
      setLoading(false);
    };

    loadData();
  }, [userId]);

  // Load players from localStorage (or could be from Supabase)
  useEffect(() => {
    const savedPlayers = localStorage.getItem(`tournament_players_${userId}`);
    if (savedPlayers) {
      setPlayers(JSON.parse(savedPlayers));
    } else {
      // Default players
      setPlayers(['Player 1', 'Player 2', 'Player 3', 'Player 4']);
    }
  }, [userId]);

  // Save players to localStorage
  useEffect(() => {
    if (players.length > 0) {
      localStorage.setItem(`tournament_players_${userId}`, JSON.stringify(players));
    }
  }, [players, userId]);

  // ============================================================================
  // REALTIME SUBSCRIPTIONS
  // ============================================================================

  useEffect(() => {
    if (!userId) return;

    const tournamentSub = supabase
      .channel('tournament_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_history',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchTournaments();
      })
      .subscribe();

    const roundsSub = supabase
      .channel('rounds_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_rounds'
      }, () => {
        if (activeTournament) {
          fetchRounds(activeTournament.id);
        }
      })
      .subscribe();

    return () => {
      tournamentSub.unsubscribe();
      roundsSub.unsubscribe();
    };
  }, [userId, activeTournament]);

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  const calculateTournamentStats = (roundsData) => {
    if (!roundsData || roundsData.length === 0) {
      return {
        total_score: 0,
        total_rounds: 0,
        rounds_won: 0,
        average_score_per_round: 0,
        best_round_score: 0,
        best_round_slot: null
      };
    }

    const total_score = roundsData.reduce((sum, r) => sum + (r.score || 0), 0);
    const total_rounds = roundsData.length;
    const rounds_won = roundsData.filter(r => r.is_winner).length;
    const average_score_per_round = total_score / total_rounds;
    const bestRound = roundsData.reduce((best, r) => r.score > (best.score || 0) ? r : best, {});

    return {
      total_score,
      total_rounds,
      rounds_won,
      average_score_per_round,
      best_round_score: bestRound.score || 0,
      best_round_slot: bestRound.slot_name || null
    };
  };

  // ============================================================================
  // CRUD OPERATIONS - TOURNAMENTS
  // ============================================================================

  const handleCreateTournament = async (e) => {
    e.preventDefault();

    if (!tournamentForm.tournament_name) {
      setError('Tournament name is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tournament_history')
        .insert([{
          user_id: userId,
          tournament_name: tournamentForm.tournament_name,
          entry_fee: parseFloat(tournamentForm.entry_fee) || 0,
          prize_pool: parseFloat(tournamentForm.prize_pool) || 0,
          notes: tournamentForm.notes,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      setActiveTournament(data);
      setTournamentForm({
        tournament_name: '',
        entry_fee: '',
        prize_pool: '',
        notes: ''
      });
      setError(null);
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError(err.message);
    }
  };

  const handleCompleteTournament = async (finalPlacement, prizeWon) => {
    if (!activeTournament) return;

    try {
      const stats = calculateTournamentStats(rounds);
      const netProfit = (prizeWon || 0) - (activeTournament.entry_fee || 0);
      const roi = activeTournament.entry_fee > 0 
        ? ((netProfit / activeTournament.entry_fee) * 100)
        : 0;

      const { error } = await supabase
        .from('tournament_history')
        .update({
          ...stats,
          final_placement: parseInt(finalPlacement) || null,
          prize_won: parseFloat(prizeWon) || 0,
          net_profit: netProfit,
          roi: roi,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', activeTournament.id);

      if (error) throw error;

      // Refresh tournaments
      await fetchTournaments();
    } catch (err) {
      console.error('Error completing tournament:', err);
      setError(err.message);
    }
  };

  const handleDeleteTournament = async (id) => {
    if (!confirm('Delete this tournament and all its rounds?')) return;

    try {
      const { error } = await supabase
        .from('tournament_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (activeTournament?.id === id) {
        setActiveTournament(null);
        setRounds([]);
      }
    } catch (err) {
      console.error('Error deleting tournament:', err);
      setError(err.message);
    }
  };

  // ============================================================================
  // CRUD OPERATIONS - ROUNDS
  // ============================================================================

  const handleAddRound = async (e) => {
    e.preventDefault();

    if (!activeTournament) {
      setError('Please create a tournament first');
      return;
    }

    if (!roundForm.slot_name || !roundForm.bet_size) {
      setError('Slot name and bet size are required');
      return;
    }

    try {
      const { error } = await supabase
        .from('tournament_rounds')
        .insert([{
          tournament_id: activeTournament.id,
          round_number: roundForm.round_number,
          slot_name: roundForm.slot_name,
          bet_size: parseFloat(roundForm.bet_size),
          score: parseFloat(roundForm.score) || 0,
          multiplier: parseFloat(roundForm.multiplier) || 0,
          is_winner: false
        }]);

      if (error) throw error;

      // Auto-increment round number
      setRoundForm({
        ...roundForm,
        round_number: roundForm.round_number + 1,
        slot_name: '',
        score: '',
        multiplier: ''
      });

      setError(null);
    } catch (err) {
      console.error('Error adding round:', err);
      setError(err.message);
    }
  };

  const handleUpdateRound = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('tournament_rounds')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating round:', err);
      setError(err.message);
    }
  };

  const handleDeleteRound = async (id) => {
    if (!confirm('Delete this round?')) return;

    try {
      const { error } = await supabase
        .from('tournament_rounds')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting round:', err);
      setError(err.message);
    }
  };

  const handleMarkWinner = async (id) => {
    try {
      // Unmark all other rounds as winner
      await supabase
        .from('tournament_rounds')
        .update({ is_winner: false })
        .eq('tournament_id', activeTournament.id);

      // Mark this round as winner
      await supabase
        .from('tournament_rounds')
        .update({ is_winner: true })
        .eq('id', id);

      await fetchRounds(activeTournament.id);
    } catch (err) {
      console.error('Error marking winner:', err);
      setError(err.message);
    }
  };

  // ============================================================================
  // PLAYER MANAGEMENT
  // ============================================================================

  const handleAddPlayer = () => {
    if (!newPlayer.trim()) return;
    if (players.includes(newPlayer.trim())) {
      setError('Player already exists');
      return;
    }

    setPlayers([...players, newPlayer.trim()]);
    setNewPlayer('');
    setError(null);
  };

  const handleRemovePlayer = (playerName) => {
    setPlayers(players.filter(p => p !== playerName));
  };

  // ============================================================================
  // SLOT SELECTION
  // ============================================================================

  const handleSlotSelect = (slot) => {
    setRoundForm({
      ...roundForm,
      slot_name: slot.name
    });
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

  // Calculate leaderboard from rounds
  const getLeaderboard = () => {
    const playerScores = {};

    rounds.forEach(round => {
      const player = round.player_name || 'Unknown';
      if (!playerScores[player]) {
        playerScores[player] = {
          totalScore: 0,
          rounds: 0,
          wins: 0
        };
      }
      playerScores[player].totalScore += round.score || 0;
      playerScores[player].rounds += 1;
      if (round.is_winner) playerScores[player].wins += 1;
    });

    return Object.entries(playerScores)
      .map(([name, data]) => ({
        name,
        ...data,
        average: data.rounds > 0 ? data.totalScore / data.rounds : 0
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  };

  if (loading) {
    return <div className="tournament-loading">Loading tournament data...</div>;
  }

  const stats = calculateTournamentStats(rounds);
  const leaderboard = getLeaderboard();

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="tournament-input-manager">
      {/* Header */}
      <div className="tournament-header">
        <h2>🏆 Tournament Manager</h2>
        {activeTournament && (
          <div className="active-tournament-badge">
            <span className="badge-icon">🎮</span>
            <div className="badge-content">
              <span className="badge-name">{activeTournament.tournament_name}</span>
              <span className="badge-status">{activeTournament.status}</span>
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

      {/* Create Tournament Section */}
      <div className="create-tournament-section">
        <h3>➕ Create New Tournament</h3>
        <form onSubmit={handleCreateTournament} className="tournament-form">
          <div className="form-row">
            <div className="form-group required">
              <label>Tournament Name *</label>
              <input
                type="text"
                value={tournamentForm.tournament_name}
                onChange={(e) => setTournamentForm({ ...tournamentForm, tournament_name: e.target.value })}
                placeholder="e.g., Friday Night Slots Battle"
                required
              />
            </div>

            <div className="form-group">
              <label>Entry Fee (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tournamentForm.entry_fee}
                onChange={(e) => setTournamentForm({ ...tournamentForm, entry_fee: e.target.value })}
                placeholder="10.00"
              />
            </div>

            <div className="form-group">
              <label>Prize Pool (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tournamentForm.prize_pool}
                onChange={(e) => setTournamentForm({ ...tournamentForm, prize_pool: e.target.value })}
                placeholder="100.00"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label>Notes (optional)</label>
              <textarea
                value={tournamentForm.notes}
                onChange={(e) => setTournamentForm({ ...tournamentForm, notes: e.target.value })}
                placeholder="Tournament rules, details..."
                rows="2"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary">
            🏆 Create Tournament
          </button>
        </form>
      </div>

      {/* Player Management */}
      <div className="player-management-section">
        <h3>👥 Manage Players ({players.length})</h3>
        <div className="player-add-form">
          <input
            type="text"
            value={newPlayer}
            onChange={(e) => setNewPlayer(e.target.value)}
            placeholder="Enter player name"
            onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
          />
          <button onClick={handleAddPlayer} className="btn-secondary">
            ➕ Add
          </button>
        </div>
        <div className="players-list">
          {players.map((player, idx) => (
            <div key={idx} className="player-chip">
              <span>{player}</span>
              <button onClick={() => handleRemovePlayer(player)}>×</button>
            </div>
          ))}
        </div>
      </div>

      {activeTournament && (
        <>
          {/* Add Round Section */}
          <div className="add-round-section">
            <h3>🎯 Add Round to {activeTournament.tournament_name}</h3>
            <form onSubmit={handleAddRound} className="round-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Round #</label>
                  <input
                    type="number"
                    min="1"
                    value={roundForm.round_number}
                    onChange={(e) => setRoundForm({ ...roundForm, round_number: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div className="form-group required">
                  <label>Slot Name *</label>
                  <input
                    type="text"
                    value={roundForm.slot_name}
                    onChange={(e) => setRoundForm({ ...roundForm, slot_name: e.target.value })}
                    placeholder="Select slot"
                    required
                  />
                </div>

                <div className="form-group required">
                  <label>Bet Size * (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={roundForm.bet_size}
                    onChange={(e) => setRoundForm({ ...roundForm, bet_size: e.target.value })}
                    placeholder="0.40"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Score (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={roundForm.score}
                    onChange={(e) => setRoundForm({ ...roundForm, score: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Multiplier</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={roundForm.multiplier}
                    onChange={(e) => setRoundForm({ ...roundForm, multiplier: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary">
                ➕ Add Round
              </button>
            </form>

            {/* Slot Quick Select */}
            {slots.length > 0 && (
              <div className="slot-quick-select">
                <h4>Quick Select Slot:</h4>
                <div className="slot-grid">
                  {slots.slice(0, 8).map((slot, idx) => (
                    <button
                      key={idx}
                      className={`slot-card ${roundForm.slot_name === slot.name ? 'selected' : ''}`}
                      onClick={() => handleSlotSelect(slot)}
                    >
                      {slot.image_link && <img src={slot.image_link} alt={slot.name} />}
                      <span className="slot-name">{slot.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rounds Table */}
          <div className="rounds-table-section">
            <h3>📋 Tournament Rounds ({rounds.length})</h3>
            {rounds.length === 0 ? (
              <div className="empty-state">
                <p>No rounds added yet. Add your first round above! 🎮</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="rounds-table">
                  <thead>
                    <tr>
                      <th>Round</th>
                      <th>Slot</th>
                      <th>Bet</th>
                      <th>Score</th>
                      <th>Multi</th>
                      <th>Winner</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.map((round) => (
                      <tr key={round.id} className={round.is_winner ? 'winner-row' : ''}>
                        <td className="round-number">#{round.round_number}</td>
                        <td>{round.slot_name}</td>
                        <td>{formatCurrency(round.bet_size)}</td>
                        <td className="score-cell">
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={round.score}
                            onBlur={(e) => handleUpdateRound(round.id, { score: parseFloat(e.target.value) })}
                          />
                        </td>
                        <td className="multiplier-cell">{formatMultiplier(round.multiplier)}</td>
                        <td>
                          {round.is_winner ? (
                            <span className="winner-badge">👑 Winner</span>
                          ) : (
                            <button
                              onClick={() => handleMarkWinner(round.id)}
                              className="btn-mark-winner"
                            >
                              Mark Winner
                            </button>
                          )}
                        </td>
                        <td className="actions-cell">
                          <button onClick={() => handleDeleteRound(round.id)} className="btn-delete">
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tournament Stats */}
          <div className="tournament-stats-section">
            <h3>📊 Tournament Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">🎮</div>
                <div className="stat-content">
                  <div className="stat-title">Total Rounds</div>
                  <div className="stat-number">{stats.total_rounds}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-content">
                  <div className="stat-title">Total Score</div>
                  <div className="stat-number">{formatCurrency(stats.total_score)}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-content">
                  <div className="stat-title">Average Score</div>
                  <div className="stat-number">{formatCurrency(stats.average_score_per_round)}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🔥</div>
                <div className="stat-content">
                  <div className="stat-title">Best Round</div>
                  <div className="stat-number">{formatCurrency(stats.best_round_score)}</div>
                  <div className="stat-subtitle">{stats.best_round_slot}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Complete Tournament */}
          <div className="complete-tournament-section">
            <h3>🏁 Complete Tournament</h3>
            <div className="complete-form">
              <div className="form-group">
                <label>Final Placement</label>
                <input
                  type="number"
                  min="1"
                  id="final-placement"
                  placeholder="e.g., 1 for 1st place"
                />
              </div>
              <div className="form-group">
                <label>Prize Won (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="prize-won"
                  placeholder="0.00"
                />
              </div>
              <button
                onClick={() => {
                  const placement = document.getElementById('final-placement').value;
                  const prize = document.getElementById('prize-won').value;
                  handleCompleteTournament(placement, prize);
                }}
                className="btn-complete"
              >
                🏁 Complete Tournament
              </button>
            </div>
          </div>
        </>
      )}

      {/* Tournament History */}
      <div className="tournament-history-section">
        <h3>📜 Tournament History ({tournaments.length})</h3>
        <div className="tournaments-grid">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className={`tournament-card ${tournament.id === activeTournament?.id ? 'active' : ''}`}
            >
              <div className="tournament-card-header">
                <h4>{tournament.tournament_name}</h4>
                <span className={`status-badge ${tournament.status}`}>
                  {tournament.status}
                </span>
              </div>
              <div className="tournament-card-body">
                <div className="tournament-info">
                  <span>Entry: {formatCurrency(tournament.entry_fee)}</span>
                  <span>Prize Pool: {formatCurrency(tournament.prize_pool)}</span>
                </div>
                {tournament.status === 'completed' && (
                  <div className="tournament-results">
                    <div className="result-item">
                      <span>Placement:</span>
                      <strong>#{tournament.final_placement || 'N/A'}</strong>
                    </div>
                    <div className="result-item">
                      <span>Prize Won:</span>
                      <strong>{formatCurrency(tournament.prize_won)}</strong>
                    </div>
                    <div className="result-item">
                      <span>ROI:</span>
                      <strong className={tournament.roi >= 0 ? 'profit' : 'loss'}>
                        {tournament.roi?.toFixed(1)}%
                      </strong>
                    </div>
                  </div>
                )}
              </div>
              <div className="tournament-card-actions">
                <button
                  onClick={() => {
                    setActiveTournament(tournament);
                    fetchRounds(tournament.id);
                  }}
                  className="btn-view"
                >
                  👁️ View
                </button>
                <button
                  onClick={() => handleDeleteTournament(tournament.id)}
                  className="btn-delete-small"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Notes */}
      <div className="integration-notes">
        <details>
          <summary>🔌 Overlay Widget Integration</summary>
          <div className="notes-content">
            <p><strong>Tournament data updates these overlay widgets:</strong></p>
            <ul>
              <li><code>TournamentLeaderboardWidget</code> - displays top players with scores</li>
              <li><code>CurrentRoundWidget</code> - shows active round number and slot</li>
              <li><code>TournamentStatsWidget</code> - displays total rounds, average score</li>
              <li><code>BestRoundWidget</code> - highlights best performing round</li>
            </ul>
            <p><strong>Realtime Updates:</strong> All tournament and round changes sync to overlay via Supabase Realtime subscriptions.</p>
          </div>
        </details>
      </div>
    </div>
  );
}
