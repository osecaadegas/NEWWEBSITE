import './styles/TournamentDisplay.css';

export default function TournamentDisplay({ tournamentData, position }) {
  if (!tournamentData || !tournamentData.active || !tournamentData.data) {
    return null;
  }

  const { players, slots, matches, phase, format, currentMatchIndex } = tournamentData.data;
  
  // Get position from props or use defaults (bottom-left equivalent in top-left coordinates)
  const xPos = position?.x ?? 10;
  const yPos = position?.y ?? 1040; // Default to bottom area (1440 - 400 estimated height)
  
  if (!matches || matches.length === 0) {
    return null;
  }
  
  // Determine current active match based on which matches have data filled
  const getActiveMatchIndex = () => {
    if (typeof currentMatchIndex === 'number') return currentMatchIndex;
    
    for (let i = 0; i < matches.length; i++) {
      const matchData = matches[i].data || {};
      const p1 = matchData.player1 || {};
      const p2 = matchData.player2 || {};
      // If this match is incomplete, it's the active one
      if (!p1.bet || !p2.bet || !p1.payout || !p2.payout) {
        return i;
      }
    }
    return matches.length - 1; // All complete, show last match
  };
  
  const activeMatchIndex = getActiveMatchIndex();

  // Determine current phase and which matches to show
  const getCurrentPhase = () => {
    if (phase) return phase;
    // Fallback: determine by number of matches
    if (matches.length === 1) return 'finals';
    if (matches.length === 2) return 'semifinals';
    if (matches.length === 4) return 'quarterfinals';
    return 'quarterfinals';
  };

  const currentPhase = getCurrentPhase();
  
  const getPhaseLabel = () => {
    switch(currentPhase) {
      case 'quarterfinals': return 'QUARTER-FINALS';
      case 'semifinals': return 'SEMI-FINALS';
      case 'finals': return 'FINALS';
      default: return 'QUARTER-FINALS';
    }
  };

  const renderMatch = (match, index) => {
    const player1 = players?.[match.player1];
    const player2 = players?.[match.player2];
    const slot1 = slots?.[match.player1];
    const slot2 = slots?.[match.player2];

    const isWinner1 = match.winner === match.player1;
    const isWinner2 = match.winner === match.player2;
    const isActiveMatch = index === activeMatchIndex;

    // Calculate X multipliers
    const matchData = match.data || {};
    const p1Data = matchData.player1 || {};
    const p2Data = matchData.player2 || {};
    
    const calculateX = (playerData) => {
      const bet = parseFloat(playerData.bet);
      if (!bet || bet === 0) return null;
      
      if (format === 'bo3') {
        const total = (parseFloat(playerData.payout1) || 0) + 
                      (parseFloat(playerData.payout2) || 0) + 
                      (parseFloat(playerData.payout3) || 0);
        return total / bet;
      }
      const payout = parseFloat(playerData.payout);
      return payout ? payout / bet : null;
    };

    const player1X = calculateX(p1Data);
    const player2X = calculateX(p2Data);

    return (
      <div key={index} className={`bracket-match-cell ${isActiveMatch ? 'current-match' : 'inactive-match'}`}>
        {/* Player 1 Card */}
        <div className={`bracket-mini-card ${isWinner1 ? 'winner' : ''} ${isWinner2 ? 'loser' : ''}`}>
          <div className="mini-card-image">
            {isWinner1 && (
              <div className="mini-winner-badge">
                <span className="winner-crown">👑</span>
              </div>
            )}
            <img src={slot1?.image || '/placeholder-slot.png'} alt={slot1?.name} />
            <div className="mini-card-name">{player1}</div>
            {player1X !== null && (
              <div className="multiplier-badge">{player1X.toFixed(2)}x</div>
            )}
          </div>
        </div>

        {/* VS Divider - only animate on active match */}
        <div className={`bracket-mini-vs ${isActiveMatch ? 'active' : ''}`}>VS</div>

        {/* Player 2 Card */}
        <div className={`bracket-mini-card ${isWinner2 ? 'winner' : ''} ${isWinner1 ? 'loser' : ''}`}>
          <div className="mini-card-image">
            {isWinner2 && (
              <div className="mini-winner-badge">
                <span className="winner-crown">👑</span>
              </div>
            )}
            <img src={slot2?.image || '/placeholder-slot.png'} alt={slot2?.name} />
            <div className="mini-card-name">{player2}</div>
            {player2X !== null && (
              <div className="multiplier-badge">{player2X.toFixed(2)}x</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bracket-widget-wrapper ${currentPhase}`} style={{ left: `${xPos}px`, bottom: `${yPos}px` }}>
      <div className="bracket-widget-display">
        <div className="bracket-display-header">
          <div className="bracket-phase-tabs">
            <div className="phase-tab active">
              {getPhaseLabel()}
            </div>
          </div>
        </div>

        <div className="bracket-matches-grid">
          {matches.map((match, index) => renderMatch(match, index))}
        </div>

        {/* Format Indicator */}
        <div className="bracket-format-indicator">
          {format === 'bo3' ? 'Best of 3' : 'Single Match'}
        </div>
      </div>
    </div>
  );
}
