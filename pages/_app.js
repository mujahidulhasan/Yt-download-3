import { useState, useEffect, createContext, useContext } from 'react';
import Head from 'next/head';
import siteConfig from '../site.config';
import '../styles/globals.css';

const ToastContext = createContext();
const SettingsContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function useAppSettings() {
  return useContext(SettingsContext);
}

const defaultSettings = {
  theme: 'system',
  accentColor: '#f97316',
  reduceMotion: false,
  toastEnabled: true,
  rememberMode: false,
  lastMode: 'video',
};

export default function App({ Component, pageProps }) {
  const [toasts, setToasts] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('clipvault_settings');
    if (stored) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      } catch (e) {}
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    const isDark = settings.theme === 'dark' || 
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.toggle('dark', isDark);
    root.style.setProperty('--accent', settings.accentColor);
    root.style.setProperty('--accent-light', settings.accentColor + 'cc');
    root.style.setProperty('--accent-glow', settings.accentColor + '33');
    
    if (settings.reduceMotion) {
      root.setAttribute('data-reduce-motion', 'true');
    } else {
      root.removeAttribute('data-reduce-motion');
    }
    
    localStorage.setItem('clipvault_settings', JSON.stringify(settings));
  }, [settings, ready]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (settings.theme === 'system') {
        document.documentElement.classList.toggle('dark', mediaQuery.matches);
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [settings.theme]);

  const showToast = (message, type = 'info') => {
    if (!settings.toastEnabled && type !== 'error') return;
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  if (!ready) return null;

  return (
    <>
      <Head>
        <title>{siteConfig.seo.title}</title>
        <meta name="description" content={siteConfig.seo.description} />
        <meta name="keywords" content={siteConfig.seo.keywords} />
        <meta name="author" content={siteConfig.seo.author} />
        <link rel="icon" href={siteConfig.favicon} />
        <meta name="theme-color" content={settings.accentColor} />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta property="og:title" content={siteConfig.seo.title} />
        <meta property="og:description" content={siteConfig.seo.description} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script src="https://kit.fontawesome.com/66ce5ae449.js" crossOrigin="anonymous" defer></script>
      </Head>

      <SettingsContext.Provider value={{ settings, updateSettings }}>
        <ToastContext.Provider value={showToast}>
          <Component {...pageProps} />
          
          <div style={{ 
            position: 'fixed', 
            bottom: 'calc(20px + env(safe-area-inset-bottom))', 
            right: 16, 
            zIndex: 9999, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 8,
            maxWidth: 'calc(100vw - 32px)',
            pointerEvents: 'none',
          }}>
            {toasts.map(toast => (
              <div
                key={toast.id}
                style={{
                  background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 
                              toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 
                              'var(--bg-card)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  color: toast.type === 'error' || toast.type === 'success' ? '#fff' : 'var(--text-primary)',
                  padding: '14px 18px',
                  borderRadius: 16,
                  fontSize: 14,
                  fontWeight: 500,
                  animation: 'fadeInUp 0.3s ease forwards',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: '1px solid var(--border-glass)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  pointerEvents: 'auto',
                  maxWidth: 360,
                }}
              >
                <i className={`fas fa-${toast.type === 'error' ? 'circle-exclamation' : toast.type === 'success' ? 'circle-check' : 'circle-info'}`} 
                   style={{ fontSize: 16 }}></i>
                <span style={{ flex: 1 }}>{toast.message}</span>
              </div>
            ))}
          </div>
        </ToastContext.Provider>
      </SettingsContext.Provider>
    </>
  );
}
