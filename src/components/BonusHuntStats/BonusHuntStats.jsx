import { useState, useEffect } from 'react';
import { useBonusHunt } from '../../context/BonusHuntContext';
import useDraggable from '../../hooks/useDraggable';
import './BonusHuntStats.css';

const BonusHuntStats = () => {
  const { bonuses, startMoney, stopMoney, actualBalance, totalSpent } = useBonusHunt();
  const draggableRef = useDraggable(true, 'stats');

  // Calculate statistics
  const totalBonuses = bonuses.length;
  const completedBonuses = bonuses.filter(b => b.opened && b.multiplier !== null).length;

  const totalWinnings = bonuses.reduce((sum, b) => {
    if (b.opened && b.multiplier !== null) {
      return sum + (b.betSize * b.multiplier);
    }
    return sum;
  }, 0);
  
  const openedBonuses = bonuses.filter(b => b.opened && b.multiplier !== null);
  const averageMultiplier = openedBonuses.length > 0
    ? openedBonuses.reduce((sum, b) => sum + b.multiplier, 0) / openedBonuses.length
    : 0;
  
  const profitLoss = totalWinnings - totalSpent;
  
  const unopenedBets = bonuses
    .filter(b => !b.opened || b.multiplier === null)
    .reduce((sum, b) => sum + b.betSize, 0);
  
  const requiredMultiplier = unopenedBets > 0
    ? (totalSpent - totalWinnings) / unopenedBets
    : 0;

  const bestSlot = openedBonuses.length > 0
    ? openedBonuses.reduce((best, b) => {
        if (!best || b.multiplier > best.multiplier) {
          return { slotName: b.slotName, multiplier: b.multiplier };
        }
        return best;
      }, null)
    : null;

  const worstSlot = openedBonuses.length > 0
    ? openedBonuses.reduce((worst, b) => {
        if (!worst || b.multiplier < worst.multiplier) {
          return { slotName: b.slotName, multiplier: b.multiplier };
        }
        return worst;
      }, null)
    : null;

  const formatCurrency = (value) => `€${value.toFixed(2)}`;
  const formatMultiplier = (value) => `${value.toFixed(2)}x`;

  return (
    <div className="bonus-hunt-stats" ref={draggableRef}>
      <div className="bh-stats-header drag-handle">
        <h3>📊 BONUS HUNT STATISTICS</h3>
      </div>
      
      <div className="bh-stats-grid">
        <div className="bh-stat-card">
          <div className="bh-stat-icon">💰</div>
          <div className="bh-stat-info">
            <div className="bh-stat-label">Start Money</div>
            <div className="bh-stat-value">{formatCurrency(startMoney)}</div>
          </div>
        </div>

        <div className="bh-stat-card">
          <div className="bh-stat-icon">🎯</div>
          <div className="bh-stat-info">
            <div className="bh-stat-label">Target Money</div>
            <div className="bh-stat-value">{formatCurrency(stopMoney)}</div>
          </div>
        </div>

        <div className="bh-stat-card">
          <div className="bh-stat-icon">💵</div>
          <div className="bh-stat-info">
            <div className="bh-stat-label">Current Balance</div>
            <div className="bh-stat-value">{formatCurrency(actualBalance)}</div>
          </div>
        </div>

        <div className="bh-stat-card">
          <div className="bh-stat-icon">💸</div>
          <div className="bh-stat-info">
            <div className="bh-stat-label">Total Spent</div>
            <div className="bh-stat-value">{formatCurrency(totalSpent)}</div>
          </div>
        </div>

        <div className="bh-stat-card">
          <div className="bh-stat-icon">{profitLoss >= 0 ? '📈' : '📉'}</div>
          <div className="bh-stat-info">
            <div className="bh-stat-label">Total Profit/Loss</div>
            <div className={`bh-stat-value ${profitLoss >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(profitLoss)}
            </div>
          </div>
        </div>

        <div className="bh-stat-card">
          <div className="bh-stat-icon">🎰</div>
          <div className="bh-stat-info">
            <div className="bh-stat-label">Total Bonuses</div>
            <div className="bh-stat-value">{totalBonuses}</div>
            <div className="bh-stat-subvalue">({completedBonuses} opened)</div>
          </div>
        </div>

        <div className="bh-stat-card">
          <div className="bh-stat-icon">📊</div>
          <div className="bh-stat-info">
            <div className="bh-stat-label">Avg Multiplier</div>
            <div className={`bh-stat-value ${averageMultiplier >= requiredMultiplier ? 'positive' : 'negative'}`}>
              {formatMultiplier(averageMultiplier)}
            </div>
          </div>
        </div>

        <div className="bh-stat-card">
          <div className="bh-stat-icon">⚖️</div>
          <div className="bh-stat-info">
            <div className="bh-stat-label">Required Mult.</div>
            <div className="bh-stat-value">{formatMultiplier(requiredMultiplier)}</div>
            <div className="bh-stat-subvalue">(break-even)</div>
          </div>
        </div>

        <div className="bh-stat-card">
          <div className="bh-stat-icon">🏆</div>
          <div className="bh-stat-info">
            <div className="bh-stat-label">Best Slot</div>
            <div className="bh-stat-value">{bestSlot ? bestSlot.slotName : '--'}</div>
            {bestSlot && <div className="bh-stat-subvalue">{formatMultiplier(bestSlot.multiplier)}</div>}
          </div>
        </div>

        <div className="bh-stat-card">
          <div className="bh-stat-icon">💔</div>
          <div className="bh-stat-info">
            <div className="bh-stat-label">Worst Slot</div>
            <div className="bh-stat-value">{worstSlot ? worstSlot.slotName : '--'}</div>
            {worstSlot && <div className="bh-stat-subvalue">{formatMultiplier(worstSlot.multiplier)}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BonusHuntStats;
