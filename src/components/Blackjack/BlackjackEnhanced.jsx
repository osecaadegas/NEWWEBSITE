import { useState, useEffect } from 'react';
import { useStreamElements } from '../../context/StreamElementsContext';
import { useAuth } from '../../context/AuthContext';
import './Blackjack3D.css';

const CARD_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10, 'A': 11
};

const SUITS = {
  hearts: { symbol: '♥', color: 'red' },
  diamonds: { symbol: '♦', color: 'red' },
  clubs: { symbol: '♣', color: 'black' },
  spades: { symbol: '♠', color: 'black' }
};

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const CHIP_VALUES = [10, 25, 50, 100, 500];

export default function BlackjackEnhanced() {
  const { points, isConnected, seAccount, updateUserPoints, refreshPoints } = useStreamElements();
  const { user } = useAuth();
  
  // Game state
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [gamePhase, setGamePhase] = useState('betting');
  const [dealerRevealed, setDealerRevealed] = useState(false);
  
  // Betting
  const [currentBet, setCurrentBet] = useState(0);
  const [sideBets, setSideBets] = useState({
    perfectPair: 0,
    twentyOneThree: 0
  });
  
  // Game controls
  const [message, setMessage] = useState('Place Your Bet');
  const [canDoubleDown, setCanDoubleDown] = useState(false);
  const [canSplit, setCanSplit] = useState(false);
  const [gameHistory, setGameHistory] = useState([]);

  // Create and shuffle deck
  const createDeck = () => {
    const newDeck = [];
    Object.keys(SUITS).forEach(suit => {
      RANKS.forEach(rank => {
        newDeck.push({
          suit,
          rank,
          value: CARD_VALUES[rank],
          suitSymbol: SUITS[suit].symbol,
          color: SUITS[suit].color
        });
      });
    });
    
    // Fisher-Yates shuffle
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    
    return newDeck;
  };

  // Calculate hand value
  const calculateScore = (hand) => {
    let value = 0;
    let aces = 0;
    
    hand.forEach(card => {
      if (card.rank === 'A') {
        aces++;
        value += 11;
      } else {
        value += card.value;
      }
    });
    
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }
    
    return value;
  };

  // Add chip to bet
  const addChipToBet = (value) => {
    if (gamePhase !== 'betting') return;
    if (currentBet + value > points) return;
    setCurrentBet(prev => prev + value);
  };

  // Clear bet
  const clearBet = () => {
    if (gamePhase !== 'betting') return;
    setCurrentBet(0);
    setSideBets({ perfectPair: 0, twentyOneThree: 0 });
  };

  // Place side bet
  const placeSideBet = (type, amount) => {
    if (gamePhase !== 'betting') return;
    const totalBet = currentBet + sideBets.perfectPair + sideBets.twentyOneThree + amount;
    if (totalBet > points) return;
    
    setSideBets(prev => ({ ...prev, [type]: amount }));
  };

  // Start new round
  const startNewRound = async () => {
    if (!isConnected) {
      setMessage('Please connect StreamElements first!');
      return;
    }

    if (currentBet === 0) {
      setMessage('Please place a bet!');
      return;
    }

    const totalBet = currentBet + sideBets.perfectPair + sideBets.twentyOneThree;
    if (totalBet > points) {
      setMessage('Insufficient balance!');
      return;
    }

    // Deduct bet from balance
    await updateUserPoints(-totalBet);

    // Create and deal cards
    const freshDeck = createDeck();
    const newPlayerHand = [freshDeck[0], freshDeck[2]];
    const newDealerHand = [freshDeck[1], freshDeck[3]];
    const remainingDeck = freshDeck.slice(4);

    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    setDeck(remainingDeck);
    setGamePhase('playing');
    setDealerRevealed(false);
    setMessage('');

    // Check for blackjack
    const playerScore = calculateScore(newPlayerHand);
    if (playerScore === 21) {
      setTimeout(() => dealerTurn(newPlayerHand, newDealerHand, remainingDeck), 1000);
      return;
    }

    // Check for double down and split
    setCanDoubleDown(true);
    setCanSplit(
      newPlayerHand[0].rank === newPlayerHand[1].rank && 
      points >= currentBet
    );

    // Check side bets
    checkSideBets(newPlayerHand, newDealerHand);
  };

  // Check side bet wins
  const checkSideBets = async (playerCards, dealerCards) => {
    let sideBetWinnings = 0;
    let sideBetMessage = '';

    // Perfect Pair check
    if (sideBets.perfectPair > 0) {
      const card1 = playerCards[0];
      const card2 = playerCards[1];
      
      if (card1.rank === card2.rank && card1.suit === card2.suit) {
        sideBetWinnings += sideBets.perfectPair * 25;
        sideBetMessage += ' Perfect Pair! +' + (sideBets.perfectPair * 25);
      }
    }

    // 21+3 check (simplified - checks for flush, straight, or three of a kind)
    if (sideBets.twentyOneThree > 0) {
      const threeCards = [...playerCards, dealerCards[0]];
      const suits = threeCards.map(c => c.suit);
      const ranks = threeCards.map(c => c.rank);
      
      // Check for flush (all same suit)
      const isFlush = suits.every(s => s === suits[0]);
      
      // Check for three of a kind
      const isThreeOfKind = ranks.every(r => r === ranks[0]);
      
      if (isThreeOfKind) {
        sideBetWinnings += sideBets.twentyOneThree * 30;
        sideBetMessage += ' Three of a Kind! +' + (sideBets.twentyOneThree * 30);
      } else if (isFlush) {
        sideBetWinnings += sideBets.twentyOneThree * 9;
        sideBetMessage += ' Flush! +' + (sideBets.twentyOneThree * 9);
      }
    }

    if (sideBetWinnings > 0) {
      await updateUserPoints(sideBetWinnings);
      setMessage('Side Bet Win!' + sideBetMessage);
    }
  };

  // Player hits
  const hit = () => {
    if (gamePhase !== 'playing') return;

    const newCard = deck[0];
    const newDeck = deck.slice(1);
    const newHand = [...playerHand, newCard];

    setPlayerHand(newHand);
    setDeck(newDeck);
    setCanDoubleDown(false);
    setCanSplit(false);

    const score = calculateScore(newHand);
    if (score > 21) {
      setMessage('BUST! You lose.');
      setGamePhase('ended');
      addToHistory('Bust', -currentBet);
      setTimeout(() => resetRound(), 3000);
    } else if (score === 21) {
      setTimeout(() => dealerTurn(newHand, dealerHand, newDeck), 500);
    }
  };

  // Player stands
  const stand = () => {
    if (gamePhase !== 'playing') return;
    dealerTurn(playerHand, dealerHand, deck);
  };

  // Player doubles down
  const doubleDown = async () => {
    if (!canDoubleDown || points < currentBet) return;

    await updateUserPoints(-currentBet);
    const newBet = currentBet * 2;
    setCurrentBet(newBet);

    const newCard = deck[0];
    const newDeck = deck.slice(1);
    const newHand = [...playerHand, newCard];

    setPlayerHand(newHand);
    setDeck(newDeck);
    setCanDoubleDown(false);

    const score = calculateScore(newHand);
    if (score > 21) {
      setMessage('BUST! You lose.');
      setGamePhase('ended');
      addToHistory('Double Down Bust', -newBet);
      setTimeout(() => resetRound(), 3000);
    } else {
      setTimeout(() => dealerTurn(newHand, dealerHand, newDeck), 500);
    }
  };

  // Dealer's turn
  const dealerTurn = (finalPlayerHand, currentDealerHand, currentDeck) => {
    setGamePhase('dealer-turn');
    setDealerRevealed(true);

    let dealerCards = [...currentDealerHand];
    let dealerScore = calculateScore(dealerCards);
    let deckCopy = [...currentDeck];

    const dealerDrawInterval = setInterval(() => {
      if (dealerScore < 17) {
        const newCard = deckCopy[0];
        deckCopy = deckCopy.slice(1);
        dealerCards = [...dealerCards, newCard];
        dealerScore = calculateScore(dealerCards);
        
        setDealerHand(dealerCards);
        setDeck(deckCopy);
      } else {
        clearInterval(dealerDrawInterval);
        determineWinner(finalPlayerHand, dealerCards);
      }
    }, 1000);
  };

  // Determine winner
  const determineWinner = async (finalPlayerHand, finalDealerHand) => {
    const playerScore = calculateScore(finalPlayerHand);
    const dealerScore = calculateScore(finalDealerHand);

    let result = '';
    let payoutMultiplier = 0;

    const playerBlackjack = playerScore === 21 && finalPlayerHand.length === 2;
    const dealerBlackjack = dealerScore === 21 && finalDealerHand.length === 2;

    if (playerBlackjack && !dealerBlackjack) {
      result = 'BLACKJACK! You win 3:2';
      payoutMultiplier = 2.5;
    } else if (dealerBlackjack && !playerBlackjack) {
      result = 'Dealer Blackjack! You lose';
      payoutMultiplier = 0;
    } else if (dealerScore > 21) {
      result = 'Dealer Bust! You win';
      payoutMultiplier = 2;
    } else if (playerScore > dealerScore) {
      result = 'You win!';
      payoutMultiplier = 2;
    } else if (playerScore < dealerScore) {
      result = 'You lose';
      payoutMultiplier = 0;
    } else {
      result = 'Push (Tie)';
      payoutMultiplier = 1;
    }

    const winnings = Math.floor(currentBet * payoutMultiplier);
    const netResult = winnings - currentBet;

    if (winnings > 0) {
      await updateUserPoints(winnings);
    }

    setMessage(result);
    setGamePhase('ended');
    addToHistory(result, netResult);

    setTimeout(() => resetRound(), 4000);
  };

  // Add to game history
  const addToHistory = (result, netChange) => {
    const entry = {
      result,
      netChange,
      timestamp: new Date().toLocaleTimeString()
    };

    setGameHistory(prev => [entry, ...prev].slice(0, 10));
  };

  // Reset round
  const resetRound = async () => {
    await refreshPoints();
    setCurrentBet(0);
    setSideBets({ perfectPair: 0, twentyOneThree: 0 });
    setPlayerHand([]);
    setDealerHand([]);
    setGamePhase('betting');
    setDealerRevealed(false);
    setMessage('Place Your Bet');
    setCanDoubleDown(false);
    setCanSplit(false);
  };

  // Card component
  const Card = ({ card, hidden }) => {
    if (hidden) {
      return (
        <div className="card card-back">
          <i className="fas fa-question"></i>
        </div>
      );
    }

    return (
      <div className={`card ${card.color === 'red' ? 'text-red-600' : 'text-gray-900'}`}>
        <div className="card-content">
          <div className="text-3xl">{card.suitSymbol}</div>
          <div className="text-2xl font-bold mt-2">{card.rank}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="blackjack-container">
      {/* Header */}
      <header className="game-header">
        <div className="header-left">
          <h1 className="game-title">
            <i className="fas fa-spade mr-2"></i>
            Blackjack Casino
          </h1>
          <p className="game-subtitle">Live Dealer • SE Points</p>
        </div>

        <div className="player-info">
          <div className="info-item">
            <p className="info-label">PLAYER</p>
            <p className="info-value">{seAccount?.se_username || user?.email || 'Guest'}</p>
          </div>
          <div className="info-item">
            <p className="info-label">BALANCE</p>
            <p className="info-value text-green-400">
              {points?.toLocaleString() || 0} <span className="text-sm">pts</span>
            </p>
          </div>
          <div className="info-item">
            <p className="info-label">CURRENT BET</p>
            <p className="info-value text-yellow-400">{currentBet}</p>
          </div>
        </div>
      </header>

      <div className="game-layout">
        {/* Main Game Area */}
        <div className="game-main">
          <div className="casino-table">
            {/* Dealer Area */}
            <div className="dealer-area">
              <div className="area-header">
                <h2 className="area-title">
                  <i className="fas fa-user-tie mr-2"></i>
                  DEALER
                  {dealerHand.length > 0 && (
                    <span className="score-badge dealer-score">
                      {dealerRevealed ? calculateScore(dealerHand) : dealerHand[0].value}
                    </span>
                  )}
                </h2>
                <div className="dealer-rule">Stand on 17</div>
              </div>
              <div className="cards-container">
                {dealerHand.map((card, index) => (
                  <Card 
                    key={index} 
                    card={card} 
                    hidden={index === 1 && !dealerRevealed} 
                  />
                ))}
                {dealerHand.length === 0 && (
                  <>
                    <Card hidden />
                    <Card hidden />
                  </>
                )}
              </div>
            </div>

            {/* Player Area */}
            <div className="player-area">
              <div className="area-header">
                <h2 className="area-title">
                  <i className="fas fa-user mr-2"></i>
                  PLAYER
                  {playerHand.length > 0 && (
                    <span className="score-badge player-score">
                      {calculateScore(playerHand)}
                    </span>
                  )}
                </h2>
                <div className={`game-status ${gamePhase === 'ended' ? 'game-status-ended' : ''}`}>
                  {message}
                </div>
              </div>
              <div className="cards-container">
                {playerHand.map((card, index) => (
                  <Card key={index} card={card} />
                ))}
              </div>

              {/* Betting Area */}
              {gamePhase === 'betting' && (
                <div className="betting-area">
                  <h3 className="betting-title">Place Your Bet</h3>
                  <div className="chips-container">
                    {CHIP_VALUES.map(value => (
                      <div
                        key={value}
                        className={`chip chip-${value}`}
                        onClick={() => addChipToBet(value)}
                      >
                        {value}
                      </div>
                    ))}
                  </div>
                  <div className="betting-actions">
                    <button onClick={clearBet} className="btn btn-secondary">
                      Clear Bet
                    </button>
                    <button 
                      onClick={startNewRound} 
                      className="btn btn-primary"
                      disabled={currentBet === 0 || !isConnected}
                    >
                      Place Bet
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {gamePhase === 'playing' && (
                <div className="action-buttons">
                  <button onClick={hit} className="btn btn-action">
                    <i className="fas fa-plus mr-2"></i>Hit
                  </button>
                  <button onClick={stand} className="btn btn-action">
                    <i className="fas fa-hand-paper mr-2"></i>Stand
                  </button>
                  <button 
                    onClick={doubleDown} 
                    className="btn btn-double"
                    disabled={!canDoubleDown || points < currentBet}
                  >
                    <i className="fas fa-times mr-2"></i>Double Down
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Game History */}
          <div className="game-history-panel">
            <h3 className="panel-title">
              <i className="fas fa-history mr-2"></i>Game History
            </h3>
            <div className="history-list">
              {gameHistory.length === 0 ? (
                <div className="history-empty">No games played yet</div>
              ) : (
                gameHistory.map((entry, index) => (
                  <div key={index} className="history-item">
                    <div>
                      <span className="history-result">{entry.result}</span>
                      <span className="history-time">{entry.timestamp}</span>
                    </div>
                    <div className={`history-change ${entry.netChange > 0 ? 'positive' : entry.netChange < 0 ? 'negative' : 'neutral'}`}>
                      {entry.netChange > 0 ? '+' : ''}{entry.netChange}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="game-sidebar">
          {/* Side Bets */}
          <div className="sidebar-panel">
            <h3 className="panel-title">
              <i className="fas fa-star mr-2"></i>Side Bets
            </h3>
            <p className="panel-subtitle">Increase your winnings!</p>

            <div className="sidebet-list">
              {/* Perfect Pair */}
              <div className={`sidebet-option ${sideBets.perfectPair > 0 ? 'active' : ''}`}>
                <div className="sidebet-header">
                  <div>
                    <h4 className="sidebet-title">Perfect Pair</h4>
                    <p className="sidebet-desc">Same rank & suit</p>
                  </div>
                  <div className="sidebet-payout">
                    <p className="payout-value">25:1</p>
                    <p className="payout-label">Payout</p>
                  </div>
                </div>
                <div className="sidebet-input">
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={sideBets.perfectPair}
                    onChange={(e) => placeSideBet('perfectPair', parseInt(e.target.value) || 0)}
                    disabled={gamePhase !== 'betting'}
                    className="sidebet-amount"
                  />
                  <span className="sidebet-current">Bet: {sideBets.perfectPair}</span>
                </div>
              </div>

              {/* 21+3 */}
              <div className={`sidebet-option ${sideBets.twentyOneThree > 0 ? 'active' : ''}`}>
                <div className="sidebet-header">
                  <div>
                    <h4 className="sidebet-title">21+3</h4>
                    <p className="sidebet-desc">Poker hand combo</p>
                  </div>
                  <div className="sidebet-payout">
                    <p className="payout-value">9:1</p>
                    <p className="payout-label">Payout</p>
                  </div>
                </div>
                <div className="sidebet-input">
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={sideBets.twentyOneThree}
                    onChange={(e) => placeSideBet('twentyOneThree', parseInt(e.target.value) || 0)}
                    disabled={gamePhase !== 'betting'}
                    className="sidebet-amount"
                  />
                  <span className="sidebet-current">Bet: {sideBets.twentyOneThree}</span>
                </div>
              </div>
            </div>

            <div className="sidebet-total">
              <span>Total Side Bets:</span>
              <span className="total-value">
                {sideBets.perfectPair + sideBets.twentyOneThree}
              </span>
            </div>
          </div>

          {/* Game Rules */}
          <div className="sidebar-panel">
            <h3 className="panel-title">
              <i className="fas fa-info-circle mr-2"></i>Game Rules
            </h3>
            <ul className="rules-list">
              <li>
                <i className="fas fa-check text-green-500"></i>
                Dealer stands on 17
              </li>
              <li>
                <i className="fas fa-check text-green-500"></i>
                Blackjack pays 3:2
              </li>
              <li>
                <i className="fas fa-check text-green-500"></i>
                Double down on any two cards
              </li>
              <li>
                <i className="fas fa-check text-green-500"></i>
                Perfect Pair pays 25:1
              </li>
              <li>
                <i className="fas fa-check text-green-500"></i>
                21+3 pays 9:1 for flush, 30:1 for trips
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
