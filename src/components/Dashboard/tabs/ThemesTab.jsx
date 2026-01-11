import ThemeStudio from '../ThemeStudio/ThemeStudio';

export default function ThemesTab({ overlay }) {
  return (
    <div className="tab-content themes-tab-content">
      {overlay ? (
        <ThemeStudio overlayId={overlay.id} />
      ) : (
        <div className="loading-state">
          <p>Loading theme studio...</p>
        </div>
      )}
    </div>
  );
}
