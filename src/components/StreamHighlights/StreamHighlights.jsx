import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import './StreamHighlights.css';

export default function StreamHighlights() {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHighlight, setSelectedHighlight] = useState(null);

  useEffect(() => {
    loadHighlights();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('highlights-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'stream_highlights' 
        }, 
        (payload) => {
          console.log('Highlights changed, reloading...', payload);
          loadHighlights();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadHighlights = async () => {
    try {
      const { data, error } = await supabase
        .from('stream_highlights')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHighlights(data || []);
    } catch (err) {
      console.error('Error loading highlights:', err);
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async (highlightId) => {
    try {
      const { error } = await supabase.rpc('increment_highlight_views', {
        highlight_id: highlightId
      });
      if (error) console.error('Error incrementing views:', error);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleHighlightClick = (highlight) => {
    setSelectedHighlight(highlight);
    incrementViewCount(highlight.id);
  };

  const closeModal = () => {
    setSelectedHighlight(null);
  };

  if (loading) {
    return <div className="highlights-loading">Loading highlights...</div>;
  }

  if (highlights.length === 0) {
    return null; // Don't show section if no highlights
  }

  return (
    <div className="stream-highlights">
      <div className="highlights-header">
        <h2>🎬 Stream Highlights</h2>
        <p>Best moments from recent streams</p>
      </div>

      <div className="highlights-grid">
        {highlights.map(highlight => (
          <div 
            key={highlight.id} 
            className="highlight-card"
            onClick={() => handleHighlightClick(highlight)}
          >
            <div className="highlight-thumbnail">
              {highlight.thumbnail_url ? (
                <img src={highlight.thumbnail_url} alt={highlight.title} />
              ) : (
                <div className="no-thumbnail">
                  <span>▶️</span>
                </div>
              )}
              {highlight.duration && (
                <div className="highlight-duration">{highlight.duration}</div>
              )}
              <div className="highlight-overlay">
                <span className="play-icon">▶️</span>
              </div>
            </div>
            <div className="highlight-info">
              <h3>{highlight.title}</h3>
              {highlight.description && (
                <p className="highlight-description">{highlight.description}</p>
              )}
              <div className="highlight-stats">
                <span className="view-count">👁️ {highlight.view_count || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedHighlight && (
        <div className="highlight-modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeModal}>✕</button>
            <div className="modal-video">
              <video 
                controls 
                autoPlay
                src={selectedHighlight.video_url}
                style={{ width: '100%', maxHeight: '80vh', borderRadius: '12px' }}
              />
            </div>
            <div className="modal-info">
              <h2>{selectedHighlight.title}</h2>
              {selectedHighlight.description && (
                <p>{selectedHighlight.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
