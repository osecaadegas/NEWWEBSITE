/**
 * Enhanced Dashboard for Overlay Controls
 * Production SaaS dashboard with subscription management
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import supabase from '../../config/supabaseClient';
import './DashboardV2.css';

// Tabs
import WidgetsTab from './tabs/WidgetsTab';
import PositioningTab from './tabs/PositioningTab';
import ThemesTab from './tabs/ThemesTab';
import PresetsTab from './tabs/PresetsTab';
import SubscriptionTab from './tabs/SubscriptionTab';

export default function DashboardV2() {
  const { user } = useAuth();
  const { subscription, isActive, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  
  const [overlay, setOverlay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('widgets');
  const [copied, setCopied] = useState(false);

  const overlayUrl = overlay ? `${window.location.origin}/premium/overlay?id=${overlay.public_id}` : '';

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    if (!subLoading) {
      if (isActive) {
        loadOverlay();
      } else {
        setLoading(false);
      }
    }
  }, [user, isActive, subLoading, navigate]);

  const loadOverlay = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch('/api/overlay/get', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 404) {
        // No overlay exists, create one
        await createOverlay();
      } else if (response.ok) {
        const data = await response.json();
        setOverlay(data);
      }
    } catch (error) {
      console.error('Error loading overlay:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOverlay = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch('/api/overlay/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOverlay(data);
      }
    } catch (error) {
      console.error('Error creating overlay:', error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || subLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Show subscription required screen
  if (!isActive) {
    return (
      <div className="dashboard-container">
        <div className="subscription-required">
          <div className="sub-required-card">
            <h1>🎯 Premium Subscription Required</h1>
            <p>Subscribe to access your interactive overlay dashboard</p>
            <SubscriptionTab />
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'widgets', label: 'Widgets', icon: '🧩' },
    { id: 'positioning', label: 'Positioning', icon: '📐' },
    { id: 'themes', label: 'Themes', icon: '🎨' },
    { id: 'presets', label: 'Presets', icon: '💾' },
    { id: 'subscription', label: 'Subscription', icon: '💳' }
  ];

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🎮 Overlay Dashboard</h1>
          <p>Manage your stream overlay</p>
        </div>
        
        {overlay && (
          <div className="overlay-url-section">
            <div className="url-label">Your OBS Overlay URL:</div>
            <div className="url-input-group">
              <input 
                type="text" 
                value={overlayUrl} 
                readOnly 
                className="url-input"
              />
              <button 
                onClick={copyToClipboard}
                className="copy-btn"
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <a 
              href={`/premium/overlay?id=${overlay.public_id}&preview=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="preview-link"
            >
              👁️ Preview Overlay
            </a>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="dashboard-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {activeTab === 'widgets' && (
          <WidgetsTab overlay={overlay} setOverlay={setOverlay} />
        )}
        {activeTab === 'positioning' && (
          <PositioningTab overlay={overlay} setOverlay={setOverlay} />
        )}
        {activeTab === 'themes' && (
          <ThemesTab overlay={overlay} setOverlay={setOverlay} />
        )}
        {activeTab === 'presets' && (
          <PresetsTab overlay={overlay} setOverlay={setOverlay} />
        )}
        {activeTab === 'subscription' && (
          <SubscriptionTab subscription={subscription} />
        )}
      </div>
    </div>
  );
}
