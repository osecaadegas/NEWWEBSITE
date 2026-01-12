/**
 * Widget Registry - Exports all 25+ production-ready widgets
 * All widgets are fully implemented with animations, data bindings, and OBS-safe performance
 */

// Core Stats Widgets (Hunt Analytics)
export { default as AverageHuntBetsizeWidget } from './AverageHuntBetsizeWidget';
export { default as AverageBonusCostWidget } from './AverageBonusCostWidget';
export { default as CurrentMultiplierWidget } from './CurrentMultiplierWidget';
export { default as RequiredMultiplierWidget } from './RequiredMultiplierWidget';
export { default as BestMultiplierWidget } from './BestMultiplierWidget';
export { default as BestBonusPayoutWidget } from './BestBonusPayoutWidget';
export { default as CumulativeMultisWidget } from './CumulativeMultisWidget';

// Average & Goal Widgets
export { default as CurrentAverageWidget } from './CurrentAverageWidget';
export { default as RequiredAverageWidget } from './RequiredAverageWidget';
export { default as RequiredRollAverageWidget } from './RequiredRollAverageWidget';
export { default as GoalProgressWidget } from './GoalProgressWidget';

// Counter Widgets
export { default as BonusesCountWidget } from './BonusesCountWidget';
export { default as RemainingBonusesWidget } from './RemainingBonusesWidget';
export { default as CurrentStartCostWidget } from './CurrentStartCostWidget';

// List & Timeline Widgets
export { default as SimpleBonusListWidget } from './SimpleBonusListWidget';
export { default as RecentWinsFeedWidget } from './RecentWinsFeedWidget';
export { default as BonusHistoryTimelineWidget } from './BonusHistoryTimelineWidget';

// BH Trackers (Bonus Hunt Trackers)
export { default as BonusHuntListWidget } from './BonusHuntListWidget';

// Alert & Panel Widgets
export { default as BigWinAlertWidget } from './BigWinAlertWidget';
export { default as SessionStatsPanelWidget } from './SessionStatsPanelWidget';

// Info Widgets
export { default as SlotInfoWidget } from './SlotInfoWidget';
export { default as CasinoInfoWidget } from './CasinoInfoWidget';

// Legacy Widgets (Pre-existing, production-ready)
export { default as BalanceWidget } from './BalanceWidget';
export { default as WagerCounterWidget } from './WagerCounterWidget';
export { default as ProfitTrackerWidget } from './ProfitTrackerWidget';
