export default function WidgetsTab({ overlay, availableWidgets, onAddWidget }) {
  return (
    <div className="tab-content">
      <h3>Widgets</h3>
      <p>Widget management coming soon...</p>
      {availableWidgets && availableWidgets.length > 0 && (
        <div className="widget-grid">
          {availableWidgets.map((widget) => (
            <div key={widget.id} className="widget-card">
              <span>{widget.icon}</span>
              <h4>{widget.display_name}</h4>
              <p>{widget.description}</p>
              <button onClick={() => onAddWidget(widget.id)}>
                Add Widget
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
