import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import siteConfig from '../site.config';
import { useToast, useAppSettings } from './_app';

const ACCENT_COLORS = [
  { value: '#f97316', label: 'Orange' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ef4444', label: 'Red' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f59e0b', label: 'Amber' },
];

export default function Settings() {
  const showToast = useToast();
  const { settings, updateSettings } = useAppSettings();
  const [showResetModal, setShowResetModal] = useState(false);

  const handleReset = () => {
    localStorage.removeItem('clipvault_settings');
    localStorage.removeItem('clipvault_history');
    window.location.reload();
  };

  const toggleSetting = (key) => {
    updateSettings({ [key]: !settings[key] });
    showToast('Setting updated', 'success');
  };

  const storageUsage = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length * 2;
      }
    }
    return Math.round(total / 1024);
  };

  return (
    <>
      <Head>
        <title>Settings - {siteConfig.name}</title>
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <header className="glass" style={{
          position: 'sticky', top: 0, zIndex: 100,
          padding: '10px 16px', borderBottom: '1px solid var(--border-glass)',
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fas fa-arrow-left" style={{ color: 'var(--text-secondary)' }}></i>
              <img src={siteConfig.logo} alt="" style={{ height: 30, width: 30, borderRadius: 8 }} />
              <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{siteConfig.name}</span>
            </Link>
            <nav className="hide-mobile" style={{ display: 'flex', gap: 4 }}>
              <Link href="/bulk" className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }}>
                <i className="fas fa-layer-group"></i> Bulk
              </Link>
              <Link href="/history" className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }}>
                <i className="fas fa-clock-rotate-left"></i> History
              </Link>
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px 60px' }}>
          <div className="animate-fade-up" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'var(--accent)', opacity: 0.1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)', fontSize: 20,
              }}>
                <i className="fas fa-gear"></i>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                Settings
              </h1>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 56 }}>
              Preferences saved locally in your browser
            </p>
          </div>

          {/* Appearance */}
          <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 22px)', marginBottom: 16 }}>
            <h3 style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 16,
            }}>
              <i className="fas fa-palette" style={{ marginRight: 6 }}></i> Appearance
            </h3>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
                Theme
              </label>
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-tertiary)', borderRadius: 12, padding: 4 }}>
                {['light', 'dark', 'system'].map(theme => (
                  <button
                    key={theme}
                    onClick={() => updateSettings({ theme })}
                    style={{
                      flex: 1, border: 'none', borderRadius: 10,
                      padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: settings.theme === theme ? 'var(--bg-card)' : 'transparent',
                      color: settings.theme === theme ? 'var(--text-primary)' : 'var(--text-secondary)',
                      textTransform: 'capitalize', transition: 'all 0.2s',
                      boxShadow: settings.theme === theme ? 'var(--shadow-sm)' : 'none',
                    }}
                  >
                    <i className={`fas fa-${theme === 'light' ? 'sun' : theme === 'dark' ? 'moon' : 'circle-half-stroke'}`} style={{ marginRight: 6 }}></i>
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
                Accent Color
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ACCENT_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => { updateSettings({ accentColor: c.value }); showToast(`Accent: ${c.label}`, 'success'); }}
                    title={c.label}
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: c.value, border: settings.accentColor === c.value ? '3px solid var(--text-primary)' : '3px solid transparent',
                      cursor: 'pointer', transition: 'all 0.2s',
                      transform: settings.accentColor === c.value ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Download Preferences */}
          <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 22px)', marginBottom: 16 }}>
            <h3 style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 16,
            }}>
              <i className="fas fa-download" style={{ marginRight: 6 }}></i> Downloads
            </h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'block' }}>
                Default Type
              </label>
              <select
                value={settings.defaultDownloadType || 'video'}
                onChange={(e) => updateSettings({ defaultDownloadType: e.target.value })}
                className="glass-input"
                style={{ padding: '10px 14px', fontSize: 13 }}
              >
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="thumbnail">Thumbnail</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'block' }}>
                Preferred Quality
              </label>
              <select
                value={settings.preferredQuality || 'highest'}
                onChange={(e) => updateSettings({ preferredQuality: e.target.value })}
                className="glass-input"
                style={{ padding: '10px 14px', fontSize: 13 }}
              >
                <option value="highest">Highest Available</option>
                <option value="recommended">Recommended</option>
                <option value="lowest">Lowest</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { key: 'autoDownload', label: 'Auto-download after selection', icon: 'fa-bolt' },
                { key: 'confirmBeforeDownload', label: 'Confirm before download', icon: 'fa-circle-question' },
                { key: 'rememberLastSelection', label: 'Remember format selection', icon: 'fa-memory' },
              ].map(toggle => (
                <div key={toggle.key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className={`fas ${toggle.icon}`} style={{ color: 'var(--text-tertiary)', fontSize: 13, width: 18 }}></i>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{toggle.label}</span>
                  </div>
                  <button
                    role="switch"
                    aria-checked={settings[toggle.key] || false}
                    onClick={() => toggleSetting(toggle.key)}
                    style={{
                      width: 44, height: 26, borderRadius: 13, border: 'none',
                      background: settings[toggle.key] ? 'var(--accent)' : 'var(--bg-tertiary)',
                      cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3,
                      left: settings[toggle.key] ? 21 : 3,
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    }}></div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 22px)', marginBottom: 16 }}>
            <h3 style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 16,
            }}>
              <i className="fas fa-bell" style={{ marginRight: 6 }}></i> Notifications
            </h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-message" style={{ color: 'var(--text-tertiary)', fontSize: 13, width: 18 }}></i>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Toast Notifications</span>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Show alerts for downloads</p>
                </div>
              </div>
              <button
                role="switch"
                aria-checked={settings.toastEnabled !== false}
                onClick={() => toggleSetting('toastEnabled')}
                style={{
                  width: 44, height: 26, borderRadius: 13, border: 'none',
                  background: settings.toastEnabled !== false ? 'var(--accent)' : 'var(--bg-tertiary)',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: settings.toastEnabled !== false ? 21 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}></div>
              </button>
            </div>
          </div>

          {/* Accessibility */}
          <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 22px)', marginBottom: 16 }}>
            <h3 style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 16,
            }}>
              <i className="fas fa-universal-access" style={{ marginRight: 6 }}></i> Accessibility
            </h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-person-walking" style={{ color: 'var(--text-tertiary)', fontSize: 13, width: 18 }}></i>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Reduce Motion</span>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Minimize animations</p>
                </div>
              </div>
              <button
                role="switch"
                aria-checked={settings.reduceMotion || false}
                onClick={() => toggleSetting('reduceMotion')}
                style={{
                  width: 44, height: 26, borderRadius: 13, border: 'none',
                  background: settings.reduceMotion ? 'var(--accent)' : 'var(--bg-tertiary)',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: settings.reduceMotion ? 21 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}></div>
              </button>
            </div>
          </div>

          {/* Privacy & Storage */}
          <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 22px)', marginBottom: 16 }}>
            <h3 style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 16,
            }}>
              <i className="fas fa-shield-halved" style={{ marginRight: 6 }}></i> Privacy & Storage
            </h3>

            <div style={{
              padding: 14, borderRadius: 12,
              background: 'var(--bg-tertiary)', marginBottom: 14,
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                <i className="fas fa-info-circle" style={{ color: 'var(--accent)', marginRight: 6 }}></i>
                All data stored locally. Nothing sent to servers except download requests.
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                Local storage: ~{storageUsage()} KB
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => {
                  localStorage.removeItem('clipvault_history');
                  showToast('History cleared', 'success');
                }}
                className="btn-secondary"
                style={{ justifyContent: 'flex-start', width: '100%' }}
              >
                <i className="fas fa-trash" style={{ color: '#ef4444' }}></i> Clear Download History
              </button>

              <button
                onClick={() => {
                  localStorage.removeItem('clipvault_settings');
                  showToast('Preferences reset', 'success');
                  setTimeout(() => window.location.reload(), 500);
                }}
                className="btn-secondary"
                style={{ justifyContent: 'flex-start', width: '100%' }}
              >
                <i className="fas fa-rotate-left"></i> Reset Preferences
              </button>

              <button
                onClick={() => setShowResetModal(true)}
                style={{
                  background: 'transparent', border: '1px solid #ef4444',
                  borderRadius: 14, padding: '12px 18px', fontSize: 14,
                  fontWeight: 600, cursor: 'pointer', color: '#ef4444',
                  display: 'flex', alignItems: 'center', gap: 8,
                  justifyContent: 'flex-start', width: '100%',
                }}
              >
                <i className="fas fa-triangle-exclamation"></i> Reset Everything
              </button>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)' }}>
            Preferences stored locally in your browser. Never sent to a server.
          </p>
        </main>

        {/* Reset Modal */}
        {showResetModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 24,
          }} onClick={() => setShowResetModal(false)}>
            <div className="glass-card" style={{
              padding: 28, maxWidth: 380, width: '100%',
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 36, color: '#ef4444', textAlign: 'center', marginBottom: 12 }}>
                <i className="fas fa-triangle-exclamation"></i>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 6, color: 'var(--text-primary)' }}>
                Reset Everything?
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 20 }}>
                This clears all settings, history, and preferences. Cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowResetModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </button>
                <button onClick={handleReset} style={{
                  flex: 1, background: '#ef4444', color: '#fff', border: 'none',
                  borderRadius: 14, padding: '12px', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                }}>
                  Reset All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
