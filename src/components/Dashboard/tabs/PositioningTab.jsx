export default function PositioningTab({ widgets, onUpdateWidget }) {
  return (
    <div className="tab-content">
      <h3>Widget Positioning</h3>
      <p>Drag and drop widget positioning coming soon...</p>
      {widgets && widgets.length > 0 && (
        <div className="widgets-list">
          {widgets.map((widget) => (
            <div key={widget.id} className="widget-item">
              <span>{widget.name}</span>
              <label>
                X: <input type="number" defaultValue={widget.position?.x || 0} />
              </label>
              <label>
                Y: <input type="number" defaultValue={widget.position?.y || 0} />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
