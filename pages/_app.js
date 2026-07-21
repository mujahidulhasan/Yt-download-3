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
  autoDownload: false,
  confirmBeforeDownload: true,
  rememberLastSelection: true,
  maxHistory: 100,
  autoDeleteOld: true,
};

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [toasts, setToasts] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('clipvault_settings');
    if (stored) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      } catch (e) {
        console.error('Settings parse error:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    const isDark = settings.theme === 'dark' || 
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.toggle('dark', isDark);
    root.style.setProperty('--accent', settings.accentColor);
    root.style.setProperty('--accent-light', settings.accentColor + 'cc');
    root.style.setProperty('--accent-dark', settings.accentColor + 'dd');
    root.style.setProperty('--accent-glow', settings.accentColor + '33');
    
    localStorage.setItem('clipvault_settings', JSON.stringify(settings));
  }, [settings, mounted]);

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

  if (!mounted) return null;

  return (
    <>
      <Head>
        <title>{siteConfig.seo.title}</title>
        <meta name="description" content={siteConfig.seo.description} />
        <meta name="keywords" content={siteConfig.seo.keywords} />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content={settings.accentColor} />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Head>

      <SettingsContext.Provider value={{ settings, updateSettings }}>
        <ToastContext.Provider value={showToast}>
          <Component {...pageProps} />
          
          <div style={{ 
            position: 'fixed', 
            bottom: 'calc(20px + env(safe-area-inset-bottom))', 
            right: 20, 
            zIndex: 9999, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 8,
            maxWidth: 'calc(100vw - 40px)',
          }}>
            {toasts.map((toast, index) => (
              <div
                key={toast.id}
                className="glass-card"
                style={{
                  background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 
                              toast.type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 
                              'var(--bg-glass)',
                  color: toast.type === 'error' || toast.type === 'success' ? '#fff' : 'var(--text-primary)',
                  padding: '14px 20px',
                  borderRadius: 16,
                  fontSize: 14,
                  fontWeight: 500,
                  animation: `fadeInUp 0.3s ease forwards`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.2)',
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
