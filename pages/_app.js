import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
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
  accentColor: siteConfig.accentColor,
  reducedMotion: false,
  defaultDownloadType: 'video',
  preferredQuality: 'highest',
};

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [toasts, setToasts] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    const stored = localStorage.getItem('streamvault_settings');
    if (stored) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      } catch (e) {
        console.error('Settings parse error:', e);
      }
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = settings.theme === 'dark' || 
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.toggle('dark', isDark);
    root.style.setProperty('--accent', settings.accentColor);
    root.style.setProperty('--accent-light', settings.accentColor + 'cc');
    root.style.setProperty('--accent-dark', settings.accentColor + 'dd');
    
    localStorage.setItem('streamvault_settings', JSON.stringify(settings));
  }, [settings]);

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <>
      <Head>
        <title>{siteConfig.seo.title}</title>
        <meta name="description" content={siteConfig.seo.description} />
        <meta name="keywords" content={siteConfig.seo.keywords} />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content={settings.accentColor} />
      </Head>

      <SettingsContext.Provider value={{ settings, updateSettings }}>
        <ToastContext.Provider value={showToast}>
          <Component {...pageProps} />
          
          <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {toasts.map(toast => (
              <div
                key={toast.id}
                style={{
                  background: toast.type === 'error' ? '#ef4444' : toast.type === 'success' ? '#10b981' : 'var(--bg-secondary)',
                  color: toast.type === 'error' || toast.type === 'success' ? '#fff' : 'var(--text-primary)',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-lg)',
                  fontSize: '14px',
                  fontWeight: 500,
                  animation: 'slideUp 0.25s ease-out',
                  border: '1px solid var(--border)',
                }}
              >
                {toast.type === 'success' && '✓ '}
                {toast.type === 'error' && '✕ '}
                {toast.message}
              </div>
            ))}
          </div>
        </ToastContext.Provider>
      </SettingsContext.Provider>
    </>
  );
  }
