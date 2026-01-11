// Stub widgets - implement full versions based on your needs

export { default as BetHistoryWidget } from './BetHistoryWidget';
export { default as GoalBarWidget } from './GoalBarWidget';
export { default as BigWinAlert } from './BigWinAlert';
export { default as SessionStatsWidget } from './SessionStatsWidget';
export { default as RecentWinsWidget } from './RecentWinsWidget';

// Stub implementations
import React from 'react';

export const BetHistoryWidget = ({ config, data }) => (
  <div className="widget-stub">
    <h4>🎯 Bet History</h4>
    <p>Last {config?.maxItems || 10} bets</p>
  </div>
);

export const GoalBarWidget = ({ config, data }) => (
  <div className="widget-stub">
    <h4>🎯 Goal Progress</h4>
    <p>Goal: ${config?.goal || 10000}</p>
  </div>
);

export const BigWinAlert = ({ config, data }) => (
  <div className="widget-stub alert">
    <h4>🎉 Big Win Alert!</h4>
    <p>{config?.threshold || 100}x+ wins</p>
  </div>
);

export const SessionStatsWidget = ({ config, data }) => (
  <div className="widget-stub">
    <h4>📊 Session Stats</h4>
    <p>Time, spins, avg bet</p>
  </div>
);

export const RecentWinsWidget = ({ config, data }) => (
  <div className="widget-stub">
    <h4>🏆 Recent Wins</h4>
    <p>Top {config?.maxWins || 5} wins</p>
  </div>
);
