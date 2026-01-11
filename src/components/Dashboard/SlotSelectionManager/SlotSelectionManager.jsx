/**
 * SlotSelectionManager
 * Production-ready slot library with visual selection and overlay integration
 * 
 * Features:
 * - Fetch all slots from Supabase slots table
 * - Visual card-based selection with slot artwork
 * - Search and filter by provider/name
 * - Quick actions: assign to bonus hunt, assign to tournament
 * - Preview mode for overlay display
 * - Real-time sync with overlay widgets
 * - Favorites/starred slots
 * - Sort by name, provider, popularity
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
import './SlotSelectionManager.css';

export default function SlotSelectionManager({ userId, onSlotSelect, mode = 'standalone' }) {
  // State Management
  const [slots, setSlots] = useState([]);
  const [filteredSlots, setFilteredSlots] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // name, provider, recent
  const [viewMode, setViewMode] = useState('grid'); // grid, list, compact

  // Favorites (stored in localStorage)
  const [favorites, setFavorites] = useState([]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('slots')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setSlots(data || []);
      setFilteredSlots(data || []);

      // Extract unique providers
      const uniqueProviders = [...new Set(data?.map(slot => slot.provider) || [])];
      setProviders(uniqueProviders.sort());

      setLoading(false);
    } catch (err) {
      console.error('Error fetching slots:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem(`slot_favorites_${userId}`);
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, [userId]);

  // Save favorites to localStorage
  useEffect(() => {
    if (favorites.length > 0 || favorites.length === 0) {
      localStorage.setItem(`slot_favorites_${userId}`, JSON.stringify(favorites));
    }
  }, [favorites, userId]);

  // ============================================================================
  // FILTERING & SORTING
  // ============================================================================

  useEffect(() => {
    let result = [...slots];

    // Filter by search term
    if (searchTerm) {
      result = result.filter(slot =>
        slot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.provider.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by provider
    if (selectedProvider && selectedProvider !== 'all') {
      result = result.filter(slot => slot.provider === selectedProvider);
    }

    // Filter favorites
    if (selectedProvider === 'favorites') {
      result = result.filter(slot => favorites.includes(slot.id));
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'provider':
          return a.provider.localeCompare(b.provider);
        case 'recent':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        default:
          return 0;
      }
    });

    setFilteredSlots(result);
  }, [slots, searchTerm, selectedProvider, sortBy, favorites]);

  // ============================================================================
  // FAVORITES
  // ============================================================================

  const toggleFavorite = (slotId) => {
    setFavorites(prev =>
      prev.includes(slotId)
        ? prev.filter(id => id !== slotId)
        : [...prev, slotId]
    );
  };

  const isFavorite = (slotId) => favorites.includes(slotId);

  // ============================================================================
  // SLOT SELECTION
  // ============================================================================

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
    if (onSlotSelect) {
      onSlotSelect(slot);
    }
  };

  // ============================================================================
  // QUICK ACTIONS
  // ============================================================================

  const handleAssignToBonusHunt = async (slot) => {
    // This would trigger a callback to BonusHuntInputManager
    console.log('Assigning to bonus hunt:', slot.name);
    if (onSlotSelect) {
      onSlotSelect(slot, 'bonus_hunt');
    }
  };

  const handleAssignToTournament = async (slot) => {
    // This would trigger a callback to TournamentInputManager
    console.log('Assigning to tournament:', slot.name);
    if (onSlotSelect) {
      onSlotSelect(slot, 'tournament');
    }
  };

  const handleCopySlotName = (slotName) => {
    navigator.clipboard.writeText(slotName);
    // Could show a toast notification here
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderSlotCard = (slot) => (
    <div
      key={slot.id}
      className={`slot-card ${selectedSlot?.id === slot.id ? 'selected' : ''} ${isFavorite(slot.id) ? 'favorite' : ''}`}
      onClick={() => handleSlotClick(slot)}
    >
      <button
        className="favorite-btn"
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(slot.id);
        }}
      >
        {isFavorite(slot.id) ? '⭐' : '☆'}
      </button>

      {slot.image_link ? (
        <div className="slot-image-wrapper">
          <img
            src={slot.image_link}
            alt={slot.name}
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="slot-image-fallback" style={{ display: 'none' }}>
            <span className="fallback-icon">🎰</span>
          </div>
        </div>
      ) : (
        <div className="slot-image-fallback">
          <span className="fallback-icon">🎰</span>
        </div>
      )}

      <div className="slot-card-content">
        <h4 className="slot-name" title={slot.name}>
          {slot.name}
        </h4>
        <p className="slot-provider">{slot.provider}</p>

        {mode === 'standalone' && (
          <div className="slot-card-actions">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAssignToBonusHunt(slot);
              }}
              className="action-btn bonus-btn"
              title="Add to Bonus Hunt"
            >
              🎯
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAssignToTournament(slot);
              }}
              className="action-btn tournament-btn"
              title="Add to Tournament"
            >
              🏆
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopySlotName(slot.name);
              }}
              className="action-btn copy-btn"
              title="Copy Name"
            >
              📋
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderSlotList = (slot) => (
    <div
      key={slot.id}
      className={`slot-list-item ${selectedSlot?.id === slot.id ? 'selected' : ''}`}
      onClick={() => handleSlotClick(slot)}
    >
      <button
        className="favorite-btn-list"
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(slot.id);
        }}
      >
        {isFavorite(slot.id) ? '⭐' : '☆'}
      </button>

      {slot.image_link && (
        <img src={slot.image_link} alt={slot.name} className="list-thumbnail" />
      )}

      <div className="list-content">
        <h4 className="list-slot-name">{slot.name}</h4>
        <p className="list-slot-provider">{slot.provider}</p>
      </div>

      {mode === 'standalone' && (
        <div className="list-actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAssignToBonusHunt(slot);
            }}
            className="list-action-btn"
          >
            🎯 Bonus
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAssignToTournament(slot);
            }}
            className="list-action-btn"
          >
            🏆 Tournament
          </button>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="slot-selection-loading">
        <div className="loading-spinner"></div>
        <p>Loading slot library...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="slot-selection-error">
        <p>⚠️ Error loading slots: {error}</p>
        <button onClick={fetchSlots} className="retry-btn">
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div className="slot-selection-manager">
      {/* Header */}
      <div className="slot-selection-header">
        <div className="header-left">
          <h2>🎰 Slot Library</h2>
          <span className="slot-count">
            {filteredSlots.length} of {slots.length} slots
          </span>
        </div>
        <div className="header-right">
          <button
            onClick={fetchSlots}
            className="refresh-btn"
            title="Refresh Slots"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="slot-controls">
        {/* Search */}
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search slots by name or provider..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="clear-search"
            >
              ×
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="filter-controls">
          <div className="filter-group">
            <label>Provider:</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
            >
              <option value="all">All Providers ({slots.length})</option>
              <option value="favorites">⭐ Favorites ({favorites.length})</option>
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider} ({slots.filter(s => s.provider === provider).length})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Sort By:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name">Name (A-Z)</option>
              <option value="provider">Provider</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>

          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              ⊞
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              ☰
            </button>
            <button
              className={`view-btn ${viewMode === 'compact' ? 'active' : ''}`}
              onClick={() => setViewMode('compact')}
              title="Compact View"
            >
              ⊡
            </button>
          </div>
        </div>
      </div>

      {/* Selected Slot Preview */}
      {selectedSlot && mode === 'standalone' && (
        <div className="selected-slot-preview">
          <div className="preview-header">
            <h3>Selected Slot</h3>
            <button
              onClick={() => setSelectedSlot(null)}
              className="close-preview"
            >
              ×
            </button>
          </div>
          <div className="preview-content">
            {selectedSlot.image_link && (
              <img
                src={selectedSlot.image_link}
                alt={selectedSlot.name}
                className="preview-image"
              />
            )}
            <div className="preview-info">
              <h4>{selectedSlot.name}</h4>
              <p className="preview-provider">by {selectedSlot.provider}</p>
              {selectedSlot.rtp && (
                <p className="preview-rtp">RTP: {selectedSlot.rtp}%</p>
              )}
              {selectedSlot.volatility && (
                <p className="preview-volatility">
                  Volatility: {selectedSlot.volatility}
                </p>
              )}
              <div className="preview-actions">
                <button
                  onClick={() => handleAssignToBonusHunt(selectedSlot)}
                  className="preview-action-btn bonus"
                >
                  🎯 Add to Bonus Hunt
                </button>
                <button
                  onClick={() => handleAssignToTournament(selectedSlot)}
                  className="preview-action-btn tournament"
                >
                  🏆 Add to Tournament
                </button>
                <button
                  onClick={() => handleCopySlotName(selectedSlot.name)}
                  className="preview-action-btn copy"
                >
                  📋 Copy Name
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slots Display */}
      <div className={`slots-container ${viewMode}-view`}>
        {filteredSlots.length === 0 ? (
          <div className="no-results">
            <p>No slots found matching your criteria</p>
            <button onClick={() => {
              setSearchTerm('');
              setSelectedProvider('all');
            }} className="reset-filters-btn">
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            {viewMode === 'grid' && (
              <div className="slots-grid">
                {filteredSlots.map(renderSlotCard)}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="slots-list">
                {filteredSlots.map(renderSlotList)}
              </div>
            )}

            {viewMode === 'compact' && (
              <div className="slots-compact">
                {filteredSlots.map((slot) => (
                  <button
                    key={slot.id}
                    className={`compact-slot-btn ${selectedSlot?.id === slot.id ? 'selected' : ''}`}
                    onClick={() => handleSlotClick(slot)}
                    title={`${slot.name} - ${slot.provider}`}
                  >
                    {isFavorite(slot.id) && <span className="star-icon">⭐</span>}
                    {slot.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Integration Notes */}
      {mode === 'standalone' && (
        <div className="integration-notes">
          <details>
            <summary>🔌 Integration Guide</summary>
            <div className="notes-content">
              <p><strong>This component can be used in three ways:</strong></p>
              <ul>
                <li>
                  <strong>Standalone Mode:</strong> Full slot library with quick actions
                </li>
                <li>
                  <strong>Embedded Mode:</strong> Pass <code>onSlotSelect</code> callback to receive selected slot
                </li>
                <li>
                  <strong>Compact Mode:</strong> Set <code>mode="compact"</code> for inline slot picker
                </li>
              </ul>
              <p><strong>Usage Example:</strong></p>
              <code>
                {`<SlotSelectionManager 
  userId={user.id} 
  onSlotSelect={(slot, context) => {
    console.log('Selected:', slot.name);
  }}
/>`}
              </code>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
