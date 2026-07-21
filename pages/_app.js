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
  reducedMotion: false,
  defaultDownloadType: 'video',
  preferredQuality: 'highest',
};

export default function App({ Component, pageProps }) {
  const [toasts, setToasts] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('clipvault_settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
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
    root.style.setProperty('--accent-dark', settings.accentColor + 'dd');
    root.style.setProperty('--accent-glow', settings.accentColor + '33');
    
    localStorage.setItem('clipvault_settings', JSON.stringify(settings));
  }, [settings, ready]);

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
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
        <meta name="theme-color" content="#f97316" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      <SettingsContext.Provider value={{ settings, updateSettings }}>
        <ToastContext.Provider value={showToast}>
          {ready && <Component {...pageProps} />}
          
          <div style={{ 
            position: 'fixed', 
            bottom: 20, 
            right: 20, 
            zIndex: 9999, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 8,
            maxWidth: 'calc(100vw - 40px)',
          }}>
            {toasts.map(toast => (
              <div
                key={toast.id}
                style={{
                  background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 
                              toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 
                              'rgba(28, 28, 30, 0.9)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  color: '#fff',
                  padding: '14px 20px',
                  borderRadius: 16,
                  fontSize: 14,
                  fontWeight: 500,
                  animation: 'fadeInUp 0.3s ease forwards',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                }}
              >
                <i className={`fas fa-${toast.type === 'error' ? 'circle-exclamation' : toast.type === 'success' ? 'circle-check' : 'circle-info'}`}></i>
                {toast.message}
              </div>
            ))}
          </div>
        </ToastContext.Provider>
      </SettingsContext.Provider>
    </>
  );
}
