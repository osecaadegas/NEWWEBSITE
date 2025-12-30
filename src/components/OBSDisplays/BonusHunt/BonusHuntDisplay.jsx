import BonusList from '../../BonusList/BonusList';
import CarouselLayout from './layouts/CarouselLayout';
import GridCardLayout from './layouts/GridCardLayout';
import SidebarLayout from './layouts/SidebarLayout';

export default function BonusHuntDisplay({ bonusHuntData, position }) {
  if (!bonusHuntData || !bonusHuntData.enabled) {
    return null;
  }

  const xPos = position?.x ?? 50;
  const yPos = position?.y ?? 50;
  const layout = bonusHuntData.layout || 'list';

  const renderLayout = () => {
    switch (layout) {
      case 'carousel':
        return <CarouselLayout bonuses={bonusHuntData.bonusList || []} settings={bonusHuntData} />;
      case 'grid':
        return <GridCardLayout bonuses={bonusHuntData.bonusList || []} settings={bonusHuntData} />;
      case 'sidebar':
        return <SidebarLayout bonuses={bonusHuntData.bonusList || []} settings={bonusHuntData} />;
      default:
        return (
          <BonusList
            bonuses={bonusHuntData.bonusList || []}
            showStatistics={bonusHuntData.showStatistics}
            startMoney={bonusHuntData.startMoney}
            targetMoney={bonusHuntData.targetMoney}
          />
        );
    }
  };

  return (
    <div 
      className="overlay-widget bonus-hunt"
      style={{
        position: 'fixed',
        left: xPos,
        top: yPos
      }}
    >
      {renderLayout()}
    </div>
  );
}
