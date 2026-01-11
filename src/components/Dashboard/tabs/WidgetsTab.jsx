import OverlayWidgetManager from '../OverlayWidgetManager/OverlayWidgetManager';

export default function WidgetsTab({ overlay }) {
  return (
    <div className="tab-content widgets-tab-content">
      {overlay ? (
        <OverlayWidgetManager overlayId={overlay.id} />
      ) : (
        <div className="loading-state">
          <p>Loading overlay...</p>
        </div>
      )}
    </div>
  );
}
