import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import siteConfig from '../site.config';
import { useToast, useAppSettings } from './_app';

export default function Settings() {
  const showToast = useToast();
  const { settings, updateSettings } = useAppSettings();
  const [activeSection, setActiveSection] = useState('appearance');
  const [showResetModal, setShowResetModal] = useState(false);

  const sections = [
    { id: 'appearance', icon: 'fa-palette', label: 'Appearance' },
    { id: 'download', icon: 'fa-download', label: 'Download' },
    { id: 'bulk', icon: 'fa-layer-group', label: 'Bulk' },
    { id: 'history', icon: 'fa-clock-rotate-left', label: 'History' },
    { id: 'accessibility', icon: 'fa-universal-access', label: 'Accessibility' },
    { id: 'privacy', icon: 'fa-shield-halved', label: 'Privacy' },
  ];

  const accentColors = [
    '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'
  ];

  const handleReset = () => {
    localStorage.removeItem('streamvault_settings');
    localStorage.removeItem('streamvault_history');
    window.location.reload();
  };

  return (
    <>
      <Head>
        <title>Settings - {siteConfig.name}</title>
        <meta name="description" content="Customize your experience" />
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        {/* Header */}
        <header style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
              <h1 style={{ fontSize: 24, fontWeight: 700 }}>
                <i className="fas fa-cloud-arrow-down" style={{ color: 'var(--accent)', marginRight: 12 }}></i>
                {siteConfig.name}
              </h1>
            </Link>
            <nav style={{ display: 'flex', gap: 24 }}>
              <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                <i className="fas fa-home" style={{ marginRight: 6 }}></i>Home
              </Link>
              <Link href="/bulk" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                <i className="fas fa-layer-group" style={{ marginRight: 6 }}></i>Bulk
              </Link>
              <Link href="/history" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                <i className="fas fa-clock-rotate-left" style={{ marginRight: 6 }}></i>History
              </Link>
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              <i className="fas fa-gear" style={{ color: 'var(--accent)', marginRight: 12 }}></i>
              Settings
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
              Customize your experience. All settings are saved locally.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* Sidebar Navigation */}
            <div style={{
              width: 220,
              flexShrink: 0,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 12,
              height: 'fit-content',
              position: 'sticky',
              top: 100,
            }}>
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  style={{
                    width: '100%',
                    background: activeSection === section.id ? 'var(--bg-tertiary)' : 'transparent',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 14,
                    fontWeight: 600,
                    color: activeSection === section.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    marginBottom: 4,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <i className={`fas ${section.icon}`} style={{ width: 20, textAlign: 'center', color: activeSection === section.id ? 'var(--accent)' : 'var(--text-tertiary)' }}></i>
                  {section.label}
                </button>
              ))}
            </div>

            {/* Settings Content */}
            <div style={{ flex: 1, minWidth: 300 }}>
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 32,
              }}>
                {/* Appearance */}
                {activeSection === 'appearance' && (
                  <div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
                      <i className="fas fa-palette" style={{ color: 'var(--accent)', marginRight: 10 }}></i>
                      Appearance
                    </h3>

                    <div style={{ marginBottom: 24 }}>
                      <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, display: 'block' }}>
                        Theme
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['light', 'dark', 'system'].map(theme => (
                          <button
                            key={theme}
                            onClick={() => updateSettings({ theme })}
                            style={{
                              flex: 1,
                              background: settings.theme === theme ? 'var(--accent)' : 'var(--bg-tertiary)',
                              color: settings.theme === theme ? '#fff' : 'var(--text-secondary)',
                              border: `1px solid ${settings.theme === theme ? 'var(--accent)' : 'var(--border)'}`,
                              borderRadius: 10,
                              padding: '12px',
                              cursor: 'pointer',
                              fontSize: 14,
                              fontWeight: 600,
                              textTransform: 'capitalize',
                              transition: 'all 0.2s',
                            }}
                          >
                            <i className={`fas fa-${theme === 'light' ? 'sun' : theme === 'dark' ? 'moon' : 'circle-half-stroke'}`} style={{ marginRight: 6 }}></i>
                            {theme}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, display: 'block' }}>
                        Accent Color
                      </label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {accentColors.map(color => (
                          <button
                            key={color}
                            onClick={() => updateSettings({ accentColor: color })}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: color,
                              border: settings.accentColor === color ? '3px solid var(--text-primary)' : '3px solid transparent',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              transform: settings.accentColor === color ? 'scale(1.15)' : 'scale(1)',
                            }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, display: 'block' }}>
                        Font Size
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['default', 'large'].map(size => (
                          <button
                            key={size}
                            onClick={() => updateSettings({ fontSize: size })}
                            style={{
                              flex: 1,
                              background: settings.fontSize === size ? 'var(--accent)' : 'var(--bg-tertiary)',
                              color: settings.fontSize === size ? '#fff' : 'var(--text-secondary)',
                              border: `1px solid ${settings.fontSize === size ? 'var(--accent)' : 'var(--border)'}`,
                              borderRadius: 10,
                              padding: '12px',
                              cursor: 'pointer',
                              fontSize: 14,
                              fontWeight: 600,
                              textTransform: 'capitalize',
                              transition: 'all 0.2s',
                            }}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { key: 'reducedMotion', label: 'Reduce Motion', icon: 'fa-person-walking' },
                        { key: 'compactMode', label: 'Compact Mode', icon: 'fa-compress' },
                        { key: 'highContrast', label: 'High Contrast', icon: 'fa-circle-half-stroke' },
                      ].map(toggle => (
                        <div key={toggle.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className={`fas ${toggle.icon}`} style={{ color: 'var(--text-tertiary)', width: 20 }}></i>
                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{toggle.label}</span>
                          </div>
                          <button
                            onClick={() => updateSettings({ [toggle.key]: !settings[toggle.key] })}
                            style={{
                              width: 48,
                              height: 28,
                              borderRadius: 14,
                              border: 'none',
                              background: settings[toggle.key] ? 'var(--accent)' : 'var(--bg-tertiary)',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'background 0.2s',
                            }}
                          >
                            <div style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: '#fff',
                              position: 'absolute',
                              top: 3,
                              left: settings[toggle.key] ? 23 : 3,
                              transition: 'left 0.2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }}></div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Download Settings */}
                {activeSection === 'download' && (
                  <div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
                      <i className="fas fa-download" style={{ color: 'var(--accent)', marginRight: 10 }}></i>
                      Download Preferences
                    </h3>

                    <div style={{ marginBottom: 24 }}>
                      <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, display: 'block' }}>
                        Default Download Type
                      </label>
                      <select
                        value={settings.defaultDownloadType || 'video'}
                        onChange={(e) => updateSettings({ defaultDownloadType: e.target.value })}
                        style={{
                          width: '100%',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '12px',
                          fontSize: 14,
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value="video">Video</option>
                        <option value="audio">Audio</option>
                        <option value="thumbnail">Thumbnail</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, display: 'block' }}>
                        Preferred Quality
                      </label>
                      <select
                        value={settings.preferredQuality || 'highest'}
                        onChange={(e) => updateSettings({ preferredQuality: e.target.value })}
                        style={{
                          width: '100%',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '12px',
                          fontSize: 14,
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value="highest">Highest Available</option>
                        <option value="recommended">Recommended</option>
                        <option value="lowest">Lowest</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { key: 'autoDownload', label: 'Auto Download After Selection', icon: 'fa-bolt' },
                        { key: 'confirmBeforeDownload', label: 'Confirm Before Download', icon: 'fa-circle-question' },
                        { key: 'rememberLastSelection', label: 'Remember Last Format Selection', icon: 'fa-memory' },
                        { key: 'autoRetryFailed', label: 'Auto Retry Failed Downloads', icon: 'fa-rotate' },
                      ].map(toggle => (
                        <div key={toggle.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className={`fas ${toggle.icon}`} style={{ color: 'var(--text-tertiary)', width: 20 }}></i>
                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{toggle.label}</span>
                          </div>
                          <button
                            onClick={() => updateSettings({ [toggle.key]: !settings[toggle.key] })}
                            style={{
                              width: 48,
                              height: 28,
                              borderRadius: 14,
                              border: 'none',
                              background: settings[toggle.key] ? 'var(--accent)' : 'var(--bg-tertiary)',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'background 0.2s',
                            }}
                          >
                            <div style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: '#fff',
                              position: 'absolute',
                              top: 3,
                              left: settings[toggle.key] ? 23 : 3,
                              transition: 'left 0.2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }}></div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bulk Settings */}
                {activeSection === 'bulk' && (
                  <div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
                      <i className="fas fa-layer-group" style={{ color: 'var(--accent)', marginRight: 10 }}></i>
                      Bulk Download Settings
                    </h3>

                    <div style={{ marginBottom: 24 }}>
                      <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, display: 'block' }}>
                        Concurrent Downloads
                      </label>
                      <select
                        value={settings.concurrentDownloads || 2}
                        onChange={(e) => updateSettings({ concurrentDownloads: parseInt(e.target.value) })}
                        style={{
                          width: '100%',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '12px',
                          fontSize: 14,
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value={1}>1 (Slow but stable)</option>
                        <option value={2}>2 (Recommended)</option>
                        <option value={3}>3 (Faster)</option>
                        <option value={4}>4 (Maximum speed)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { key: 'retryFailedBulk', label: 'Retry Failed Downloads', icon: 'fa-rotate' },
                        { key: 'skipExisting', label: 'Skip Already Downloaded URLs', icon: 'fa-forward-step' },
                        { key: 'autoRemoveCompleted', label: 'Auto Remove Completed Items', icon: 'fa-check-double' },
                      ].map(toggle => (
                        <div key={toggle.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className={`fas ${toggle.icon}`} style={{ color: 'var(--text-tertiary)', width: 20 }}></i>
                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{toggle.label}</span>
                          </div>
                          <button
                            onClick={() => updateSettings({ [toggle.key]: !settings[toggle.key] })}
                            style={{
                              width: 48,
                              height: 28,
                              borderRadius: 14,
                              border: 'none',
                              background: settings[toggle.key] ? 'var(--accent)' : 'var(--bg-tertiary)',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'background 0.2s',
                            }}
                          >
                            <div style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: '#fff',
                              position: 'absolute',
                              top: 3,
                              left: settings[toggle.key] ? 23 : 3,
                              transition: 'left 0.2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }}></div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* History Settings */}
                {activeSection === 'history' && (
                  <div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
                      <i className="fas fa-clock-rotate-left" style={{ color: 'var(--accent)', marginRight: 10 }}></i>
                      History Settings
                    </h3>

                    <div style={{ marginBottom: 24 }}>
                      <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, display: 'block' }}>
                        Maximum History Items
                      </label>
                      <select
                        value={settings.maxHistory || 100}
                        onChange={(e) => updateSettings({ maxHistory: parseInt(e.target.value) })}
                        style={{
                          width: '100%',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '12px',
                          fontSize: 14,
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value={25}>25 items</option>
                        <option value={50}>50 items</option>
                        <option value={100}>100 items</option>
                        <option value={200}>200 items</option>
                        <option value={500}>500 items</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <i className="fas fa-trash-can" style={{ color: 'var(--text-tertiary)', width: 20 }}></i>
                          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Auto Delete Old Records</span>
                        </div>
                        <button
                          onClick={() => updateSettings({ autoDeleteOld: !settings.autoDeleteOld })}
                          style={{
                            width: 48,
                            height: 28,
                            borderRadius: 14,
                            border: 'none',
                            background: settings.autoDeleteOld ? 'var(--accent)' : 'var(--bg-tertiary)',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background 0.2s',
                          }}
                        >
                          <div style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#fff',
                            position: 'absolute',
                            top: 3,
                            left: settings.autoDeleteOld ? 23 : 3,
                            transition: 'left 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }}></div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Accessibility */}
                {activeSection === 'accessibility' && (
                  <div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
                      <i className="fas fa-universal-access" style={{ color: 'var(--accent)', marginRight: 10 }}></i>
                      Accessibility
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { key: 'keyboardNavigation', label: 'Keyboard Navigation', icon: 'fa-keyboard' },
                        { key: 'reducedMotion', label: 'Reduced Motion', icon: 'fa-person-walking' },
                        { key: 'largeButtons', label: 'Large Touch Targets', icon: 'fa-hand-pointer' },
                        { key: 'highContrast', label: 'High Contrast Mode', icon: 'fa-circle-half-stroke' },
                        { key: 'enhancedFocusRing', label: 'Enhanced Focus Indicators', icon: 'fa-bullseye' },
                      ].map(toggle => (
                        <div key={toggle.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className={`fas ${toggle.icon}`} style={{ color: 'var(--text-tertiary)', width: 20 }}></i>
                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{toggle.label}</span>
                          </div>
                          <button
                            onClick={() => updateSettings({ [toggle.key]: !settings[toggle.key] })}
                            style={{
                              width: 48,
                              height: 28,
                              borderRadius: 14,
                              border: 'none',
                              background: settings[toggle.key] ? 'var(--accent)' : 'var(--bg-tertiary)',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'background 0.2s',
                            }}
                          >
                            <div style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: '#fff',
                              position: 'absolute',
                              top: 3,
                              left: settings[toggle.key] ? 23 : 3,
                              transition: 'left 0.2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }}></div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Privacy */}
                {activeSection === 'privacy' && (
                  <div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
                      <i className="fas fa-shield-halved" style={{ color: 'var(--accent)', marginRight: 10 }}></i>
                      Privacy & Storage
                    </h3>

                    <div style={{ marginBottom: 24, padding: 20, background: 'var(--bg-tertiary)', borderRadius: 12 }}>
                      <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        <i className="fas fa-info-circle" style={{ color: 'var(--accent)', marginRight: 6 }}></i>
                        All data is stored locally on your device. Nothing is sent to our servers except download requests.
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                        Local storage used: ~{Math.round(JSON.stringify(localStorage).length / 1024)} KB
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <button
                        onClick={() => {
                          localStorage.removeItem('streamvault_history');
                          showToast('History cleared', 'success');
                        }}
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '14px',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <i className="fas fa-trash" style={{ color: '#ef4444' }}></i>
                        Clear Download History
                      </button>

                      <button
                        onClick={() => {
                          localStorage.removeItem('streamvault_settings');
                          showToast('Preferences reset', 'success');
                          setTimeout(() => window.location.reload(), 500);
                        }}
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '14px',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <i className="fas fa-rotate-left" style={{ color: 'var(--accent)' }}></i>
                        Reset Preferences
                      </button>

                      <button
                        onClick={() => setShowResetModal(true)}
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: '1px solid #ef4444',
                          borderRadius: 10,
                          padding: '14px',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#ef4444',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <i className="fas fa-triangle-exclamation"></i>
                        Reset Everything
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Reset Modal */}
        {showResetModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 24,
            }}
            onClick={() => setShowResetModal(false)}
          >
            <div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 18,
                padding: 32,
                maxWidth: 400,
                width: '100%',
                boxShadow: 'var(--shadow-lg)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: 40, color: '#ef4444', marginBottom: 16, textAlign: 'center' }}>
                <i className="fas fa-triangle-exclamation"></i>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 8 }}>
                Reset Everything?
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 24 }}>
                This will clear all settings, history, and preferences. This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setShowResetModal(false)}
                  style={{
                    flex: 1,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '12px',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  style={{
                    flex: 1,
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
