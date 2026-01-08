import './StreamPage.css';
import StreamHighlights from '../StreamHighlights/StreamHighlights';

export default function StreamPage() {
  const twitchChannel = 'osecaadegas95';
  
  return (
    <div className="stream-page">
      <div className="stream-container">
        
        {/* About Me Section */}
        <section className="about-section-stream">
          <div className="about-container-stream">
            <div className="about-image-wrapper-stream">
              <img 
                src="/profile-foto.png" 
                alt="osecaadegas - Miguel" 
                className="about-image-stream"
              />
            </div>
            <div className="about-content-stream">
              <h2 className="about-title-stream">Sobre Mim</h2>
              <p className="about-text-stream">
                Sou o Miguel, mais conhecido como osecaadegas. Sou um gajo simples e tranquilo. Trabalho aos fins de semana e, durante a semana, divido o tempo entre programação e streaming.
              </p>
              <p className="about-text-stream">
                O meu conteúdo principal é online gambling, mas também sou fã de simuladores, FPS e iRacing. Acima de tudo, estou aqui para te fazer rir e para passarmos bons momentos juntos.
              </p>
              <p className="about-text-stream">
                Se tiveres alguma questão ou precisares de ajuda, não hesites em mandar DM. Eu e toda a equipa estamos sempre disponíveis para ajudar.
                E claro, de vez em quando também gosto de beber umas boas birras ou finos. Se não fosse assim, nem fazia sentido ter este nome, não é verdade? 🍺
              </p>
            </div>
          </div>
        </section>

        <div className="stream-info">
          <div className="info-item">
            <span className="info-label">STATUS:</span>
            <div className="status-dot offline" title="Offline"></div>
          </div>
          <div className="info-item">
            <span className="info-label">VIEWERS:</span>
            <span className="info-value">0</span>
          </div>
          <div className="info-item">
            <span className="info-label">SCHEDULE:</span>
            <span className="info-value">Daily at 8PM EST</span>
          </div>
        </div>
        
        <div className="stream-content">
          <div className="stream-embed">
            <iframe
              src={`https://player.twitch.tv/?channel=${twitchChannel}&parent=${window.location.hostname}`}
              height="280"
              width="100%"
              allowFullScreen
              title="Twitch Stream"
              style={{ border: 'none', borderRadius: '12px' }}
            />
          </div>

          <div className="chat-embed">
            <iframe
              src={`https://www.twitch.tv/embed/${twitchChannel}/chat?parent=${window.location.hostname}&darkpopout`}
              height="280"
              width="100%"
              title="Twitch Chat"
              style={{ border: 'none', borderRadius: '12px' }}
            />
          </div>
        </div>

        {/* Stream Highlights Section */}
        <StreamHighlights />
      </div>
    </div>
  );
}
