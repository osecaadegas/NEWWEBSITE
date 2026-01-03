import { useState, useEffect, useRef } from 'react';
import './ChatDisplay.css';

export default function ChatDisplay({ chatData, position }) {
  const [messages, setMessages] = useState([]);
  const chatContainerRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!chatData || !chatData.enabled || !chatData.channelName) {
      return;
    }

    const channel = chatData.channelName.toLowerCase();
    
    // Connect to Twitch IRC via WebSocket
    const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    wsRef.current = ws;

    ws.onopen = () => {
      // Authenticate as anonymous user
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
      ws.send('PASS SCHMOOPIIE'); // Anonymous login
      ws.send('NICK justinfan12345'); // Anonymous username
      ws.send(`JOIN #${channel}`);
    };

    ws.onmessage = (event) => {
      const rawMessage = event.data;
      
      // Handle PING/PONG
      if (rawMessage.startsWith('PING')) {
        ws.send('PONG :tmi.twitch.tv');
        return;
      }

      // Parse chat messages
      if (rawMessage.includes('PRIVMSG')) {
        const message = parseIRCMessage(rawMessage);
        if (message) {
          setMessages(prev => {
            const newMessages = [...prev, message];
            const maxMessages = chatData.maxMessages || 10;
            return newMessages.slice(-maxMessages);
          });
        }
      }
    };

    ws.onerror = (error) => {
      console.error('Twitch chat WebSocket error:', error);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [chatData?.enabled, chatData?.channelName, chatData?.maxMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const parseIRCMessage = (rawMessage) => {
    try {
      const parts = rawMessage.split(' ');
      const tags = {};
      
      // Parse tags
      if (rawMessage.startsWith('@')) {
        const tagsRaw = rawMessage.split(' ')[0].substring(1);
        tagsRaw.split(';').forEach(tag => {
          const [key, value] = tag.split('=');
          tags[key] = value;
        });
      }

      // Extract username
      const userMatch = rawMessage.match(/:(.+?)!/);
      const username = userMatch ? userMatch[1] : 'Unknown';

      // Extract message content
      const messageMatch = rawMessage.match(/PRIVMSG #\w+ :(.+)/);
      const content = messageMatch ? messageMatch[1] : '';

      // Get color from tags or use default
      const color = tags['color'] || `#${Math.floor(Math.random()*16777215).toString(16)}`;

      return {
        id: Date.now() + Math.random(),
        username,
        content,
        color,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error parsing IRC message:', error);
      return null;
    }
  };

  if (!chatData || !chatData.enabled) {
    return null;
  }

  const xPos = position?.x ?? 50;
  const yPos = position?.y ?? 100;

  return (
    <div 
      className="chat-display"
      style={{ 
        left: `${xPos}px`, 
        top: `${yPos}px` 
      }}
    >
      <div className="chat-container">
        <div className="chat-header">
          <svg viewBox="0 0 24 24" fill="currentColor" className="chat-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h8c1.1 0 2-.9 2-2v-8c0-5.52-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8v8h-8z"/>
            <circle cx="8.5" cy="12" r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
            <circle cx="15.5" cy="12" r="1.5"/>
          </svg>
          <h3>Twitch Chat</h3>
          <span className="channel-name">#{chatData.channelName}</span>
        </div>
        
        <div className="chat-messages" ref={chatContainerRef}>
          {messages.length === 0 ? (
            <div className="chat-empty">
              <p>Waiting for messages...</p>
            </div>
          ) : (
            messages.map(message => (
              <div key={message.id} className="chat-message">
                <span 
                  className="chat-username" 
                  style={{ color: message.color }}
                >
                  {message.username}
                </span>
                <span className="chat-separator">:</span>
                <span className="chat-content">{message.content}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
