import { useState, useEffect } from 'react';
import { useStreamElements } from '../../context/StreamElementsContext';
import { supabase } from '../../config/supabaseClient';
import './Mines.css';

const GRID_SIZE = 25; // 5x5 grid
const MINE_COUNTS = [1, 3, 5, 10, 15]; // Different difficulty levels
const MAX_BET = 200; // Maximum bet amount

export default function Mines() {
  const { points, isConnected, updateUserPoints } = useStreamElements();
  const [betAmount, setBetAmount] = useState(100);
  const [mineCount, setMineCount] = useState(3);
  const [gameState, setGameState] = useState('betting'); // betting, playing, won, lost
  const [grid, setGrid] = useState([]);
  const [revealedCells, setRevealedCells] = useState([]);
  const [minePositions, setMinePositions] = useState([]);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [balance, setBalance] = useState(0);
  const [profit, setProfit] = useState(0);

  useEffect(() => {
    setBalance(points);
  }, [points]);

  const getMultiplier = (revealed, mines) => {
    // Calculate multiplier based on revealed safe cells and mine count
    const totalCells = GRID_SIZE;
    const safeCells = totalCells - mines;
    const baseMultiplier = 1 + (mines / safeCells) * 0.25;
    return Math.pow(baseMultiplier, revealed);
  };

  const startGame = async () => {
    if (!isConnected) {
      alert('Please connect your StreamElements account first!');
      return;
    }

    if (betAmount > balance || betAmount <= 0) {
      alert('Invalid bet amount!');
      return;
    }

    if (betAmount > MAX_BET) {
      alert(`Maximum bet is ${MAX_BET} points!`);
      return;
    }

    // Deduct bet from balance
    const newBalance = balance - betAmount;
    setBalance(newBalance);
    await updatePoints(-betAmount);

    // Generate random mine positions
    const positions = [];
    while (positions.length < mineCount) {
      const pos = Math.floor(Math.random() * GRID_SIZE);
      if (!positions.includes(pos)) {
        positions.push(pos);
      }
    }

    setMinePositions(positions);
    setGrid(Array(GRID_SIZE).fill(null));
    setRevealedCells([]);
    setCurrentMultiplier(1.0);
    setProfit(0);
    setGameState('playing');
  };

  const revealCell = async (index) => {
    if (gameState !== 'playing' || revealedCells.includes(index)) return;

    const newRevealed = [...revealedCells, index];
    setRevealedCells(newRevealed);

    if (minePositions.includes(index)) {
      // Hit a mine - game over
      setGameState('lost');
      revealAllMines();
      // Save losing game session
      await saveGameSession(0);
    } else {
      // Safe cell - update multiplier
      const multiplier = getMultiplier(newRevealed.length, mineCount);
      setCurrentMultiplier(multiplier);
      setProfit(betAmount * multiplier - betAmount);
    }
  };

  const revealAllMines = () => {
    const newGrid = [...grid];
    minePositions.forEach(pos => {
      newGrid[pos] = 'mine';
    });
    setGrid(newGrid);
  };

  const cashOut = async () => {
    if (gameState !== 'playing') return;

    const winAmount = Math.floor(betAmount * currentMultiplier);
    const newBalance = balance + winAmount;
    setBalance(newBalance);
    await updatePoints(winAmount);

    // Save winning game session
    await saveGameSession(winAmount);

    revealAllMines();
    setGameState('won');
  };

  const updatePoints = async (amount) => {
    try {
      await updateUserPoints(amount);
    } catch (err) {
      console.error('Error updating points:', err);
    }
  };

  const saveGameSession = async (resultAmount) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('game_sessions').insert({
        user_id: user.id,
        game_type: 'mines',
        bet_amount: betAmount,
        result_amount: resultAmount,
        game_data: {
          mine_count: mineCount,
          cells_revealed: revealedCells.length,
          multiplier: currentMultiplier,
          mine_positions: minePositions
        }
      });
    } catch (err) {
      console.error('Error saving game session:', err);
    }
  };

  const resetGame = () => {
    setGrid([]);
    setRevealedCells([]);
    setMinePositions([]);
    setCurrentMultiplier(1.0);
    setProfit(0);
    setGameState('betting');
  };

  const getCellClass = (index) => {
    if (gameState === 'playing' && !revealedCells.includes(index)) {
      return 'cell hidden';
    }
    if (revealedCells.includes(index) && !minePositions.includes(index)) {
      return 'cell revealed safe';
    }
    if (minePositions.includes(index) && (gameState === 'lost' || gameState === 'won')) {
      return 'cell revealed mine';
    }
    return 'cell hidden';
  };

  return (
    <div className="mines-container">
      <div className="mines-header">
        <h1>💣 Mines</h1>
        <div className="balance-display">
          <span className="balance-label">Balance:</span>
          <span className="balance-amount">{balance} pts</span>
        </div>
      </div>

      {!isConnected && (
        <div className="connection-warning">
          <p>⚠️ Connect with Twitch to access the games</p>
        </div>
      )}

      <div className="mines-content">
        {/* Left Panel - Controls */}
        <div className="controls-panel">
          {gameState === 'betting' && (
            <>
              <div className="control-section">
                <label>Bet Amount</label>
                <div className="bet-controls">
                  <button onClick={() => setBetAmount(Math.min(MAX_BET, Math.max(10, betAmount / 2)))}>½</button>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.min(MAX_BET, Math.max(10, parseInt(e.target.value) || 10)))}
                    min="10"
                    max={MAX_BET}
                  />
                  <button onClick={() => setBetAmount(Math.min(MAX_BET, Math.min(balance, betAmount * 2)))}>2×</button>
                </div>
                <div className="quick-bets">
                  <button onClick={() => setBetAmount(50)}>50</button>
                  <button onClick={() => setBetAmount(100)}>100</button>
                  <button onClick={() => setBetAmount(200)}>200</button>
                </div>
              </div>

              <div className="control-section">
                <label>Number of Mines</label>
                <div className="mine-selector">
                  {MINE_COUNTS.map(count => (
                    <button
                      key={count}
                      className={mineCount === count ? 'selected' : ''}
                      onClick={() => setMineCount(count)}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <button className="start-button" onClick={startGame} disabled={!isConnected}>
                Start Game
              </button>
            </>
          )}

          {gameState === 'playing' && (
            <>
              <div className="game-stats">
                <div className="stat-item">
                  <span className="stat-label">Bet:</span>
                  <span className="stat-value">{betAmount} pts</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Mines:</span>
                  <span className="stat-value">{mineCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Revealed:</span>
                  <span className="stat-value">{revealedCells.length}</span>
                </div>
              </div>

              <div className="multiplier-display">
                <div className="multiplier-label">Current Multiplier</div>
                <div className="multiplier-value">{currentMultiplier.toFixed(2)}×</div>
                <div className="profit-display">
                  Profit: <span className={profit > 0 ? 'profit-positive' : ''}>{profit > 0 ? '+' : ''}{Math.floor(profit)} pts</span>
                </div>
              </div>

              <button
                className="cashout-button"
                onClick={cashOut}
                disabled={revealedCells.length === 0}
              >
                Cash Out {Math.floor(betAmount * currentMultiplier)} pts
              </button>
            </>
          )}

          {(gameState === 'won' || gameState === 'lost') && (
            <div className="game-result">
              <div className={`result-message ${gameState}`}>
                {gameState === 'won' ? (
                  <>
                    <div className="result-icon">🎉</div>
                    <div className="result-title">You Won!</div>
                    <div className="result-amount">+{Math.floor(profit)} pts</div>
                  </>
                ) : (
                  <>
                    <div className="result-icon">💥</div>
                    <div className="result-title">Hit a Mine!</div>
                    <div className="result-amount">-{betAmount} pts</div>
                  </>
                )}
              </div>
              <button className="play-again-button" onClick={resetGame}>
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* Right Panel - Game Grid */}
        <div className="game-grid-panel">
          <div className="mines-grid">
            {Array(GRID_SIZE).fill(null).map((_, index) => (
              <button
                key={index}
                className={getCellClass(index)}
                onClick={() => revealCell(index)}
                disabled={gameState !== 'playing' || revealedCells.includes(index)}
              >
                {revealedCells.includes(index) && !minePositions.includes(index) && (
                  <span className="gem-icon">💎</span>
                )}
                {minePositions.includes(index) && (gameState === 'lost' || gameState === 'won') && (
                  <span className="mine-icon">💣</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
