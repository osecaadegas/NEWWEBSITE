import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ArtAdPanel.css';
import useDraggable from '../../hooks/useDraggable';

const ArtAdPanel = ({ onClose }) => {
  const [media, setMedia] = useState(() => {
    const saved = localStorage.getItem('artad-media');
    return saved ? JSON.parse(saved) : [];
  });
  const [mediaUrl, setMediaUrl] = useState('');
  const [displayedMedia, setDisplayedMedia] = useState(() => {
    const saved = localStorage.getItem('artad-displayed');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage whenever media or displayedMedia changes
  useEffect(() => {
    localStorage.setItem('artad-media', JSON.stringify(media));
  }, [media]);

  useEffect(() => {
    localStorage.setItem('artad-displayed', JSON.stringify(displayedMedia));
  }, [displayedMedia]);

  const addMedia = () => {
    if (mediaUrl.trim()) {
      let url = mediaUrl.trim();
      let filename = url.split('/').pop().split('?')[0] || 'Media';
      let mediaType = 'image';
      
      // Check if it's a YouTube URL and convert to embed format
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        if (url.includes('youtube.com/watch')) {
          videoId = new URL(url).searchParams.get('v');
        } else if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/embed/')) {
          videoId = url.split('youtube.com/embed/')[1].split('?')[0];
        }
        if (videoId) {
          url = `https://www.youtube.com/embed/${videoId}`;
          filename = `YouTube: ${videoId}`;
          mediaType = 'youtube';
        }
      } else if (url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('data:video')) {
        mediaType = 'video';
      }
      
      const newMedia = {
        id: Date.now(),
        title: filename,
        url: url,
        type: mediaType
      };
      setMedia([...media, newMedia]);
      setMediaUrl('');
    }
  };

  const removeMedia = (id) => {
    setMedia(media.filter(m => m.id !== id));
    setDisplayedMedia(displayedMedia.filter(m => m.id !== id));
  };

  const showMedia = (mediaItem) => {
    // Check if there's already a displayed instance of this media
    const existingDisplayed = displayedMedia.find(m => m.id === mediaItem.id);
    
    if (existingDisplayed) {
      // Already displayed, don't add duplicate
      return;
    }

    const newDisplayedMedia = {
      ...mediaItem,
      displayId: `${mediaItem.id}-${Date.now()}`,
      width: mediaItem.type === 'youtube' ? 560 : 400,
      height: mediaItem.type === 'youtube' ? 315 : mediaItem.type === 'video' ? 225 : 300,
      x: window.innerWidth / 2 - (mediaItem.type === 'youtube' ? 280 : 200),
      y: window.innerHeight / 2 - (mediaItem.type === 'youtube' ? 157.5 : 150),
      scale: 1
    };
    setDisplayedMedia([...displayedMedia, newDisplayedMedia]);
  };

  const updateMediaScale = (displayId, scale) => {
    setDisplayedMedia(displayedMedia.map(m =>
      m.displayId === displayId ? { ...m, scale } : m
    ));
  };

  const hideMedia = (displayId) => {
    setDisplayedMedia(displayedMedia.filter(m => m.displayId !== displayId));
  };

  const updateMediaSize = (displayId, width, height) => {
    setDisplayedMedia(displayedMedia.map(m =>
      m.displayId === displayId ? { ...m, width, height } : m
    ));
  };

  const updateMediaPosition = (displayId, x, y) => {
    setDisplayedMedia(displayedMedia.map(m =>
      m.displayId === displayId ? { ...m, x, y } : m
    ));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setMediaUrl(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const draggableRef = useDraggable(true, 'artad');

  return (
    <>
      <div className="artad-panel" ref={draggableRef}>
        <div className="artad-header drag-handle">
          <h2>🖼️ Media Manager</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="artad-content">
          <div className="media-add-section">
            <input
              type="text"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="Enter URL or upload file..."
              className="media-url-input"
            />
            <div className="media-action-buttons">
              <button 
                className="media-upload-btn"
                onClick={() => document.getElementById('media-file-upload').click()}
                title="Upload File"
              >
                📁 Upload
              </button>
              <button className="media-add-btn" onClick={addMedia} title="Add Media">
                + Add
              </button>
              <input
                type="file"
                id="media-file-upload"
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
          </div>

          <div className="media-grid">
            {media.length === 0 ? (
              <div className="no-media">
                <div className="no-media-icon">🖼️</div>
                <p>No media added</p>
              </div>
            ) : (
              media.map(item => {
                const displayedItem = displayedMedia.find(m => m.id === item.id);
                return (
                  <div key={item.id} className="media-card">
                    <div className="media-card-preview">
                      {item.type === 'youtube' ? (
                        <iframe src={item.url} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{width: '100%', height: '100%'}} />
                      ) : item.type === 'video' ? (
                        <video src={item.url} />
                      ) : (
                        <img src={item.url} alt={item.title} />
                      )}
                      <div className="media-card-type-badge">{item.type === 'youtube' ? '▶️' : item.type === 'video' ? '🎥' : '🖼️'}</div>
                    </div>
                    <div className="media-card-footer">
                      <div className="media-card-title" title={item.title}>{item.title.length > 15 ? item.title.substring(0, 15) + '...' : item.title}</div>
                    </div>
                    {displayedItem && (
                      <div className="media-resize-controls">
                        <label className="resize-label">Size: {Math.round(displayedItem.scale * 100)}%</label>
                        <input 
                          type="range" 
                          min="25" 
                          max="200" 
                          value={displayedItem.scale * 100}
                          onChange={(e) => updateMediaScale(displayedItem.displayId, parseFloat(e.target.value) / 100)}
                          className="resize-slider"
                        />
                      </div>
                    )}
                    <div className="media-card-actions">
                      <button 
                        className={`ad-action-btn toggle ${displayedItem ? 'hide' : 'show'}`}
                        onClick={() => displayedItem ? setDisplayedMedia(displayedMedia.filter(m => m.id !== item.id)) : showMedia(item)}
                      >
                        {displayedItem ? '🙈 Hide' : '👁️ Show'}
                      </button>
                      <button 
                        className="ad-action-btn remove"
                        onClick={() => removeMedia(item.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {createPortal(
        displayedMedia.map(item => (
          <DraggableMedia
            key={item.displayId}
            item={item}
            onClose={() => hideMedia(item.displayId)}
            onSizeChange={(w, h) => updateMediaSize(item.displayId, w, h)}
            onPositionChange={(x, y) => updateMediaPosition(item.displayId, x, y)}
          />
        )),
        document.body
      )}
    </>
  );
};

const DraggableMedia = ({ item, onClose, onSizeChange, onPositionChange }) => {
  const mediaRef = useRef(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 });



  const handleMouseDown = (e) => {
    if (e.target.classList.contains('resize-handle')) {
      isResizing.current = true;
      startPos.current = {
        x: e.clientX,
        y: e.clientY,
        width: item.width,
        height: item.height
      };
      e.preventDefault();
    } else if (e.currentTarget === mediaRef.current || e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
      isDragging.current = true;
      startPos.current = {
        x: e.clientX - item.x,
        y: e.clientY - item.y
      };
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isResizing.current) {
      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;
      const newWidth = Math.max(200, startPos.current.width + deltaX);
      const newHeight = Math.max(150, startPos.current.height + deltaY);
      
      onSizeChange(newWidth, newHeight);
    } else if (isDragging.current) {
      const x = e.clientX - startPos.current.x;
      const y = e.clientY - startPos.current.y;
      
      // Only update position, NOT size
      onPositionChange(x, y);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    isResizing.current = false;
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const scale = item.scale || 1;
  const scaledWidth = item.width * scale;
  const scaledHeight = item.height * scale;

  return (
    <div 
      ref={mediaRef}
      className="draggable-media-container"
      onMouseDown={handleMouseDown}
      style={{
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
        left: `${item.x}px`,
        top: `${item.y}px`
      }}
    >
      {item.type === 'youtube' ? (
        <iframe src={item.url} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ width: '100%', height: '100%', pointerEvents: 'auto' }} />
      ) : item.type === 'video' ? (
        <video src={item.url} controls autoPlay loop style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'auto' }} />
      ) : (
        <img src={item.url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      )}
      <div className="resize-handle"></div>
    </div>
  );
};

export default ArtAdPanel;
