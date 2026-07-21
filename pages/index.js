import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import siteConfig from '../site.config';
import { useToast, useAppSettings } from './_app';

const API_BASE = 'https://ohyah-ytback.hf.space';

const PLATFORMS = [
  { id: 'youtube', icon: 'fa-youtube', label: 'YouTube', accent: '#ff0000' },
  { id: 'facebook', icon: 'fa-facebook', label: 'Facebook', accent: '#1877f2' },
  { id: 'instagram', icon: 'fa-instagram', label: 'Instagram', accent: '#e4405f' },
  { id: 'tiktok', icon: 'fa-tiktok', label: 'TikTok', accent: '#000000' },
  { id: 'twitter', icon: 'fa-x-twitter', label: 'X / Twitter', accent: '#1da1f2' },
  { id: 'reddit', icon: 'fa-reddit', label: 'Reddit', accent: '#ff4500' },
  { id: 'vimeo', icon: 'fa-vimeo', label: 'Vimeo', accent: '#1ab7ea' },
  { id: 'pinterest', icon: 'fa-pinterest', label: 'Pinterest', accent: '#bd081c' },
  { id: 'twitch', icon: 'fa-twitch', label: 'Twitch', accent: '#9146ff' },
  { id: 'soundcloud', icon: 'fa-soundcloud', label: 'SoundCloud', accent: '#ff3300' },
  { id: 'dailymotion', icon: 'fa-dailymotion', label: 'Dailymotion', accent: '#0066dc' },
  { id: 'threads', icon: 'fa-threads', label: 'Threads', accent: '#000000' },
];

function detectPlatform(url) {
  if (!url) return null;
  const patterns = {
    youtube: /youtube\.com|youtu\.be/i,
    facebook: /facebook\.com|fb\.watch/i,
    instagram: /instagram\.com/i,
    tiktok: /tiktok\.com/i,
    twitter: /twitter\.com|x\.com/i,
    reddit: /reddit\.com/i,
    vimeo: /vimeo\.com/i,
    pinterest: /pinterest\.com/i,
    twitch: /twitch\.tv/i,
    soundcloud: /soundcloud\.com/i,
    dailymotion: /dailymotion\.com/i,
    threads: /threads\.net/i,
  };
  for (const [id, pattern] of Object.entries(patterns)) {
    if (pattern.test(url)) return PLATFORMS.find(p => p.id === id) || null;
  }
  return null;
}

function formatDuration(secs) {
  if (!secs || secs <= 0) return '';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatViews(n) {
  if (!n) return '';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M views';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K views';
  return n + ' views';
}

export default function Home() {
  const router = useRouter();
  const showToast = useToast();
  const { settings } = useAppSettings();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('clipvault_history');
    if (stored) {
      try {
        setHistory(JSON.parse(stored).slice(0, 3));
      } catch (e) {}
    }
  }, []);

  const handleExtract = () => {
    if (url.trim()) {
      router.push(`/download?url=${encodeURIComponent(url.trim())}`);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      showToast('URL pasted', 'success');
    } catch {
      showToast('Clipboard access denied', 'error');
    }
  };

  const platform = detectPlatform(url);
  const heroWords = siteConfig.heroTitle.trim().split(/\s+/);
  const heroHighlight = heroWords.pop() || '';
  const heroRest = heroWords.join(' ');

  return (
    <>
      <Head>
        <title>{siteConfig.name} - Video Downloader</title>
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        {/* Header */}
        <header className="glass" style={{
          position: 'sticky', top: 0, zIndex: 100,
          padding: '10px 16px', borderBottom: '1px solid var(--border-glass)',
        }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={siteConfig.logo} alt="" style={{ height: 34, width: 34, borderRadius: 9 }} />
              <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {siteConfig.name}
              </span>
            </Link>

            <nav className="hide-mobile" style={{ display: 'flex', gap: 4 }}>
              <Link href="/bulk" className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }}>
                <i className="fas fa-layer-group"></i> Bulk
              </Link>
              <Link href="/history" className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }}>
                <i className="fas fa-clock-rotate-left"></i> History
              </Link>
              <Link href="/settings" className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }}>
                <i className="fas fa-gear"></i> Settings
              </Link>
            </nav>

            <button className="show-mobile hide-desktop btn-secondary"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ padding: '8px 12px', fontSize: 18, display: 'none' }}>
              <i className={`fas fa-${mobileMenuOpen ? 'times' : 'bars'}`}></i>
            </button>
          </div>

          {mobileMenuOpen && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Link href="/bulk" className="btn-secondary" style={{ justifyContent: 'flex-start' }}
                onClick={() => setMobileMenuOpen(false)}>
                <i className="fas fa-layer-group" style={{ width: 22 }}></i> Bulk Download
              </Link>
              <Link href="/history" className="btn-secondary" style={{ justifyContent: 'flex-start' }}
                onClick={() => setMobileMenuOpen(false)}>
                <i className="fas fa-clock-rotate-left" style={{ width: 22 }}></i> History
              </Link>
              <Link href="/settings" className="btn-secondary" style={{ justifyContent: 'flex-start' }}
                onClick={() => setMobileMenuOpen(false)}>
                <i className="fas fa-gear" style={{ width: 22 }}></i> Settings
              </Link>
            </div>
          )}
        </header>

        <main style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px 60px' }}>
          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 28 }} className="animate-fade-up">
            <h1 style={{ 
              fontSize: 'clamp(28px, 6vw, 44px)', 
              fontWeight: 900, 
              lineHeight: 1.1,
              marginBottom: 10,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
            }}>
              {heroRest}{' '}
              <span className="gradient-text">{heroHighlight}</span>
            </h1>
            <p style={{ 
              fontSize: 'clamp(14px, 2.5vw, 16px)', 
              color: 'var(--text-secondary)',
              maxWidth: 500, margin: '0 auto',
            }}>
              {siteConfig.heroSubtitle}
            </p>
          </div>

          {/* URL Input */}
          <div className="glass-card" style={{ padding: 'clamp(14px, 3vw, 20px)', marginBottom: 24 }}>
            <div style={{ 
              display: 'flex', gap: 6, 
              background: 'var(--bg-input)',
              borderRadius: 16, padding: 5,
              border: '1px solid var(--border)',
              flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
                {platform && (
                  <i className={`fab ${platform.icon}`} style={{ 
                    fontSize: 20, color: platform.accent, marginLeft: 8 
                  }}></i>
                )}
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste video URL here..."
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    background: 'transparent', fontSize: 15,
                    color: 'var(--text-primary)', padding: '12px 4px',
                    minWidth: 0,
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
                />
                {url && (
                  <button onClick={() => setUrl('')} className="btn-icon">
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handlePaste} className="btn-secondary hide-mobile">
                  <i className="fas fa-paste"></i> Paste
                </button>
                <button onClick={handleExtract} disabled={!url.trim() || loading} className="btn-primary">
                  {loading ? (
                    <><i className="fas fa-spinner fa-spin"></i> Analyzing</>
                  ) : (
                    <><i className="fas fa-magnifying-glass"></i> Analyze</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Platform Marquee */}
          <div style={{ marginBottom: 28, overflow: 'hidden' }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Supported Platforms
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: 50, background: 'linear-gradient(to right, var(--bg-primary), transparent)',
                zIndex: 10, pointerEvents: 'none',
              }}></div>
              <div style={{
                position: 'absolute', right: 0, top: 0, bottom: 0,
                width: 50, background: 'linear-gradient(to left, var(--bg-primary), transparent)',
                zIndex: 10, pointerEvents: 'none',
              }}></div>
              <div className="marquee-track">
                {[...PLATFORMS, ...PLATFORMS].map((p, i) => (
                  <div key={`${p.id}-${i}`} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 14px', flexShrink: 0,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--bg-tertiary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={`fab ${p.icon}`} style={{ color: p.accent, fontSize: 16 }}></i>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {p.label}
                    </span>
                    <div style={{ width: 1, height: 20, background: 'var(--border)', marginLeft: 4 }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
