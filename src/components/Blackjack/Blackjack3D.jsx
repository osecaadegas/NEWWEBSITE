import { useState, useEffect, useRef } from 'react';
import { useStreamElements } from '../../context/StreamElementsContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';
import './Blackjack3D.css';

const CARD_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10, 'A': 11
};

const SUITS = ['♥', '♦', '♣', '♠'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const CHIP_VALUES = [10, 25, 50, 100, 500];

export default function Blackjack() {
  const { points, isConnected, seAccount, updateUserPoints } = useStreamElements();
  const { user } = useAuth();
  
  // Game state
  const [deck, setDeck] = useState([]);
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [splitCards, setSplitCards] = useState([]);
  const [gamePhase, setGamePhase] = useState('betting'); // betting, playing, dealer-turn, finished
  const [currentHand, setCurrentHand] = useState('main'); // main or split
  const [dealerCardRevealed, setDealerCardRevealed] = useState(false);
  
  // Betting
  const [betAmount, setBetAmount] = useState(10);
  const [balance, setBalance] = useState(0);
  
  // Game controls
  const [message, setMessage] = useState('');
  const [canDoubleDown, setCanDoubleDown] = useState(false);
  const [canSplit, setCanSplit] = useState(false);

  useEffect(() => {
    setBalance(points);
  }, [points]);

  // Create and shuffle deck
  const createDeck = () => {
    const newDeck = [];
    for (let suit of SUITS) {
      for (let rank of RANKS) {
        newDeck.push({ suit, rank, value: CARD_VALUES[rank] });
      }
    }
    // Shuffle
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  };

  // Calculate hand value
  const getHandValue = (cards) => {
    let value = 0;
    let aces = 0;
    
    for (let card of cards) {
      if (card.rank === 'A') {
        aces++;
        value += 11;
      } else {
        value += card.value;
      }
    }
    
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }
    
    return value;
  };

  // Start new game
  const startNewGame = async () => {
    if (!isConnected) {
      setMessage('Connect StreamElements first!');
      return;
    }
    
    if (betAmount > balance || betAmount <= 0) {
      setMessage('Invalid bet amount!');
      return;
    }

    // Deduct bet
    await updateUserPoints(-betAmount);
    
    // Create fresh deck
    const freshDeck = createDeck();
    
    // Deal initial 4 cards (player, dealer, player, dealer)
    const newPlayerCards = [freshDeck[0], freshDeck[2]];
    const newDealerCards = [freshDeck[1], freshDeck[3]];
    const remainingDeck = freshDeck.slice(4);
    
    setPlayerCards(newPlayerCards);
    setDealerCards(newDealerCards);
    setSplitCards([]);
    setDeck(remainingDeck);
    setGamePhase('playing');
    setCurrentHand('main');
    setDealerCardRevealed(false);
    setMessage('');
    
    // Check for blackjack
    const playerValue = getHandValue(newPlayerCards);
    if (playerValue === 21) {
      setTimeout(() => playDealerHand(newPlayerCards, newDealerCards, remainingDeck), 500);
      return;
    }
    
    // Check for double down and split
    setCanDoubleDown(true);
    setCanSplit(newPlayerCards[0].rank === newPlayerCards[1].rank && balance >= betAmount);
  };

  // Hit - draw a card
  const hit = () => {
    if (gamePhase !== 'playing') return;
    
    const newCard = deck[0];
    const newDeck = deck.slice(1);
    
    if (currentHand === 'main') {
      const newCards = [...playerCards, newCard];
      setPlayerCards(newCards);
      setDeck(newDeck);
      setCanDoubleDown(false);
      setCanSplit(false);
      
      const value = getHandValue(newCards);
      if (value > 21) {
        if (splitCards.length > 0) {
          setCurrentHand('split');
          setMessage('Main hand busts! Playing split hand...');
        } else {
          endGame(newCards, dealerCards);
        }
      } else if (value === 21) {
        if (splitCards.length > 0) {
          setCurrentHand('split');
          setMessage('21! Playing split hand...');
        } else {
          setTimeout(() => playDealerHand(newCards, dealerCards, newDeck), 500);
        }
      }
    } else {
      const newCards = [...splitCards, newCard];
      setSplitCards(newCards);
      setDeck(newDeck);
      
      const value = getHandValue(newCards);
      if (value >= 21) {
        setTimeout(() => playDealerHand(playerCards, dealerCards, newDeck), 500);
      }
    }
  };

  // Stand - end player turn
  const stand = () => {
    if (gamePhase !== 'playing') return;
    
    if (currentHand === 'main' && splitCards.length > 0) {
      setCurrentHand('split');
      setMessage('Playing split hand...');
    } else {
      playDealerHand(playerCards, dealerCards, deck);
    }
  };

  // Double down
  const doubleDown = async () => {
    if (!canDoubleDown || balance < betAmount) return;
    
    await updateUserPoints(-betAmount);
    setBetAmount(betAmount * 2);
    
    const newCard = deck[0];
    const newDeck = deck.slice(1);
    const newCards = [...playerCards, newCard];
    
    setPlayerCards(newCards);
    setDeck(newDeck);
    setCanDoubleDown(false);
    
    if (splitCards.length > 0) {
      setCurrentHand('split');
      setMessage('Playing split hand...');
    } else {
      setTimeout(() => playDealerHand(newCards, dealerCards, newDeck), 500);
    }
  };

  // Split pair
  const split = async () => {
    if (!canSplit) return;
    
    await updateUserPoints(-betAmount);
    
    const card1 = playerCards[0];
    const card2 = playerCards[1];
    const newCard1 = deck[0];
    const newCard2 = deck[1];
    const newDeck = deck.slice(2);
    
    setPlayerCards([card1, newCard1]);
    setSplitCards([card2, newCard2]);
    setDeck(newDeck);
    setCurrentHand('main');
    setCanDoubleDown(false);
    setCanSplit(false);
    setMessage('Playing first hand...');
  };

  // Dealer plays
  const playDealerHand = async (finalPlayerCards, currentDealerCards, currentDeck) => {
    setGamePhase('dealer-turn');
    setDealerCardRevealed(true);
    
    let dealerHand = [...currentDealerCards];
    let deckCopy = [...currentDeck];
    let dealerValue = getHandValue(dealerHand);
    
    // Dealer draws to 17
    while (dealerValue < 17) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const newCard = deckCopy[0];
      deckCopy = deckCopy.slice(1);
      dealerHand = [...dealerHand, newCard];
      setDealerCards(dealerHand);
      dealerValue = getHandValue(dealerHand);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    endGame(finalPlayerCards, dealerHand);
  };

  // End game and calculate winner
  const endGame = async (finalPlayerCards, finalDealerCards) => {
    setGamePhase('finished');
    setDealerCardRevealed(true);
    
    const playerValue = getHandValue(finalPlayerCards);
    const dealerValue = getHandValue(finalDealerCards);
    const splitValue = splitCards.length > 0 ? getHandValue(splitCards) : 0;
    
    let winAmount = 0;
    let msg = '';
    
    // Calculate main hand
    const baseBet = splitCards.length > 0 ? betAmount / 2 : betAmount;
    
    if (playerValue > 21) {
      msg = 'Bust! ';
    } else if (dealerValue > 21) {
      winAmount += baseBet * 2;
      msg = `Dealer busts! You win ${baseBet} pts! `;
    } else if (playerValue > dealerValue) {
      winAmount += baseBet * 2;
      msg = `You win ${baseBet} pts! `;
    } else if (playerValue === dealerValue) {
      winAmount += baseBet;
      msg = 'Push! ';
    } else {
      msg = 'Dealer wins! ';
    }
    
    // Calculate split hand
    if (splitCards.length > 0) {
      if (splitValue > 21) {
        msg += 'Split busts!';
      } else if (dealerValue > 21) {
        winAmount += baseBet * 2;
        msg += `Split wins ${baseBet} pts!`;
      } else if (splitValue > dealerValue) {
        winAmount += baseBet * 2;
        msg += `Split wins ${baseBet} pts!`;
      } else if (splitValue === dealerValue) {
        winAmount += baseBet;
        msg += 'Split push!';
      } else {
        msg += 'Split loses!';
      }
    }
    
    if (winAmount > 0) {
      await updateUserPoints(winAmount);
    }
    
    setMessage(msg);
  };

  // Render a card
  const renderCard = (card, index, isHidden = false) => {
    const cardColor = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
    
    return (
      <div 
        key={`card-${index}-${card.rank}-${card.suit}`}
        className={`bj-card ${isHidden ? 'bj-card-back' : cardColor}`}
        style={{ animation: `dealCard 0.4s ease-out ${index * 0.15}s both` }}
      >
        {!isHidden && (
          <>
            <div className="bj-card-corner-top">{card.rank}</div>
            <div className="bj-card-corner-bottom">{card.rank}</div>
            <div className="bj-card-center">{card.suit}</div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="blackjack-container">
      <div className="bj-content">
        <div className="bj-left-panel">
          <h1>Blackjack 3D</h1>
          <p className="bj-subtitle">Single Deck • Dealer Stands on 17</p>
          
          {gamePhase === 'betting' && (
            <>
              <div className="bet-section">
                <label>Bet Amount (Max 150)</label>
                <input 
                  type="range" 
                  min="10" 
                  max="150" 
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                />
                <div className="bet-quick-buttons">
                  <button onClick={() => setBetAmount(10)}>10</button>
                  <button onClick={() => setBetAmount(25)}>25</button>
                  <button onClick={() => setBetAmount(50)}>50</button>
                  <button onClick={() => setBetAmount(100)}>100</button>
                  <button onClick={() => setBetAmount(150)}>150</button>
                </div>
                <div className="bet-amount-display">{betAmount}</div>
              </div>
              
              <button className="btn-deal" onClick={startNewGame}>
                Deal
              </button>
            </>
          )}
          
          {gamePhase === 'playing' && (
            <>
              <button className="btn-hit" onClick={hit}>Hit</button>
              <button className="btn-stand" onClick={stand}>Stand</button>
              {canDoubleDown && (
                <button className="btn-double" onClick={doubleDown}>Double Down</button>
              )}
              {canSplit && (
                <button className="btn-split" onClick={split}>Split</button>
              )}
            </>
          )}
          
          {gamePhase === 'finished' && (
            <button className="btn-deal" onClick={startNewGame}>
              New Game
            </button>
          )}
          
          {message && <div className="game-message">{message}</div>}
          <div className="balance-display">Balance: {balance} pts</div>
        </div>

        <div className="bj-right-panel">
          <div className="blackjack-table">
            <svg className="curved-text" viewBox="0 0 500 100">
              <defs>
                <path id="curve" d="M 50,80 Q 250,20 450,80" fill="transparent"/>
              </defs>
              <text fill="rgba(255,255,255,0.3)" fontSize="11" fontWeight="600" letterSpacing="2">
                <textPath href="#curve" startOffset="50%" textAnchor="middle">
                  DEALER MUST STAND ON ALL 17S
                </textPath>
              </text>
            </svg>

            {/* Dealer */}
            <div className="dealer-section">
              <div className="hand-label">
                <span>DEALER</span>
                {dealerCards.length > 0 && (
                  <div className="score-pill">
                    <span className="score-dot"></span>
                    <span>{dealerCardRevealed ? getHandValue(dealerCards) : '?'}</span>
                  </div>
                )}
              </div>
              <div className="cards-row">
                {dealerCards.map((card, index) => 
                  renderCard(card, index, !dealerCardRevealed && index === 1)
                )}
              </div>
            </div>

            {/* Player */}
            <div className="player-section">
              <div className="hands-container">
                {/* Main Hand */}
                <div className={`hand-box ${currentHand === 'main' && gamePhase === 'playing' ? 'active' : ''}`}>
                  <div className="hand-label">
                    <span>{splitCards.length > 0 ? 'HAND 1' : 'PLAYER'}</span>
                    {playerCards.length > 0 && (
                      <div className="score-pill">
                        <span className="score-dot"></span>
                        <span>{getHandValue(playerCards)}</span>
                      </div>
                    )}
                  </div>
                  <div className="cards-row">
                    {playerCards.map((card, index) => renderCard(card, index))}
                  </div>
                </div>

                {/* Split Hand */}
                {splitCards.length > 0 && (
                  <div className={`hand-box ${currentHand === 'split' && gamePhase === 'playing' ? 'active' : ''}`}>
                    <div className="hand-label">
                      <span>HAND 2</span>
                      <div className="score-pill">
                        <span className="score-dot"></span>
                        <span>{getHandValue(splitCards)}</span>
                      </div>
                    </div>
                    <div className="cards-row">
                      {splitCards.map((card, index) => renderCard(card, index))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
