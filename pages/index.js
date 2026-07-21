import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import siteConfig from '../site.config';
import { useToast, useAppSettings } from './_app';

const API_BASE = 'https://ohyah-ytback.hf.space';

export default function Home() {
  const showToast = useToast();
  const { settings } = useAppSettings();
  const [url, setUrl] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [detectedPlatform, setDetectedPlatform] = useState(null);
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [formats, setFormats] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [activeTab, setActiveTab] = useState('video');
  const [downloadJob, setDownloadJob] = useState(null);
  const [history, setHistory] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchPlatforms();
    loadHistory();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/platforms`);
      const data = await res.json();
      setPlatforms(Array.isArray(data) ? data : data.platforms || []);
    } catch (error) {
      console.error('Failed to fetch platforms:', error);
    }
  };

  const loadHistory = () => {
    const stored = localStorage.getItem('clipvault_history');
    if (stored) {
      try {
        setHistory(JSON.parse(stored).slice(0, 4));
      } catch (e) {}
    }
  };

  const detectPlatform = (inputUrl) => {
    if (!inputUrl) { setDetectedPlatform(null); return; }
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
    };
    for (const [platform, pattern] of Object.entries(patterns)) {
      if (pattern.test(inputUrl)) { setDetectedPlatform(platform); return; }
    }
    setDetectedPlatform(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      detectPlatform(text);
      showToast('URL pasted from clipboard', 'success');
    } catch (error) {
      showToast('Failed to access clipboard', 'error');
    }
  };

  const handleAnalyze = async () => {
    if (!url || loading) return;
    setLoading(true);
    setMetadata(null);
    setFormats([]);
    setSelectedFormat(null);
    
    try {
      const res = await fetch(`${API_BASE}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail?.[0]?.msg || error.message || 'Extraction failed');
      }
      
      const data = await res.json();
      setMetadata(data.metadata);
      setFormats(data.formats || []);
      showToast('Media analyzed successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to analyze URL', 'error');
    } finally {
      setLoading(false);
    }
  };

  const videoFormats = formats.filter(f => f.has_video || (f.ext === 'mp4' && f.resolution));
  const audioFormats = formats.filter(f => f.has_audio || f.ext === 'm4a' || f.ext === 'mp3');

  const filteredFormats = (activeTab === 'video' ? videoFormats : audioFormats)
    .filter(f => f.format_id && !['sd', 'hd'].includes(f.format_id))
    .sort((a, b) => (b.tbr || 0) - (a.tbr || 0));

  const handleDownload = async () => {
    if (!selectedFormat || !url) return;
    try {
      const res = await fetch(`${API_BASE}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, format_id: selectedFormat.format_id }),
      });
      
      if (!res.ok) throw new Error('Download failed');
      const { job_id } = await res.json();
      setDownloadJob({ id: job_id, status: 'downloading', progress: 0 });
      pollProgress(job_id);
    } catch (error) {
      showToast(error.message || 'Download failed', 'error');
    }
  };

  const pollProgress = (jobId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/progress/${jobId}`);
        const job = await res.json();
        setDownloadJob(job);
        
        if (job.status === 'completed') {
          clearInterval(interval);
          downloadFile(jobId);
        } else if (job.status === 'failed') {
          clearInterval(interval);
          showToast('Download failed', 'error');
          setDownloadJob(null);
        }
      } catch (error) {
        clearInterval(interval);
      }
    }, 1000);
  };

  const downloadFile = async (jobId) => {
    try {
      const res = await fetch(`${API_BASE}/api/file/${jobId}`);
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `clipvault_${jobId}.${selectedFormat?.ext || 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      
      saveToHistory();
      showToast('Download completed!', 'success');
      setDownloadJob(null);
    } catch (error) {
      showToast('File download failed', 'error');
    }
  };

  const saveToHistory = () => {
    if (!metadata) return;
    const item = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      url,
      platform: detectedPlatform || metadata.platform || 'unknown',
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      type: activeTab,
      resolution: selectedFormat?.resolution,
      filename: `${metadata.title?.slice(0, 50)}.${selectedFormat?.ext || 'mp4'}`,
      status: 'completed',
    };
    const updated = [item, ...history].slice(0, 100);
    setHistory(updated.slice(0, 4));
    localStorage.setItem('clipvault_history', JSON.stringify(updated));
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views) => {
    if (!views) return '';
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views.toString();
  };

  return (
    <>
      <Head>
        <title>{siteConfig.name} - Video Downloader</title>
        <meta name="description" content={siteConfig.description} />
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        {/* Header */}
        <header className="glass" style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-glass)',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={siteConfig.logo} alt={siteConfig.name} style={{ height: 36, width: 36, borderRadius: 10 }} />
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {siteConfig.name}
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Link href="/bulk" style={navLinkStyle}>
                <i className="fas fa-layer-group"></i> <span className="nav-text">Bulk</span>
              </Link>
              <Link href="/history" style={navLinkStyle}>
                <i className="fas fa-clock-rotate-left"></i> <span className="nav-text">History</span>
              </Link>
              <Link href="/settings" style={navLinkStyle}>
                <i className="fas fa-gear"></i> <span className="nav-text">Settings</span>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: 'none',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '8px 12px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontSize: 18,
              }}
              className="mobile-menu-btn"
            >
              <i className={`fas fa-${mobileMenuOpen ? 'times' : 'bars'}`}></i>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div style={{
              marginTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }} className="mobile-menu">
              <Link href="/bulk" style={mobileNavStyle} onClick={() => setMobileMenuOpen(false)}>
                <i className="fas fa-layer-group" style={{ width: 24 }}></i> Bulk Download
              </Link>
              <Link href="/history" style={mobileNavStyle} onClick={() => setMobileMenuOpen(false)}>
                <i className="fas fa-clock-rotate-left" style={{ width: 24 }}></i> History
              </Link>
              <Link href="/settings" style={mobileNavStyle} onClick={() => setMobileMenuOpen(false)}>
                <i className="fas fa-gear" style={{ width: 24 }}></i> Settings
              </Link>
            </div>
          )}
        </header>

        <main style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 60px' }}>
          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 32, animation: 'fadeInUp 0.5s ease' }}>
            <h1 style={{ 
              fontSize: 'clamp(28px, 6vw, 44px)', 
              fontWeight: 900, 
              marginBottom: 12,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}>
              Download Videos From
              <br />
              <span className="gradient-text">Any Platform</span>
            </h1>
            <p style={{ 
              fontSize: 'clamp(14px, 2.5vw, 17px)', 
              color: 'var(--text-secondary)', 
              maxWidth: 500, 
              margin: '0 auto',
              lineHeight: 1.5,
            }}>
              Fast, secure, free. Paste your link and download in seconds.
            </p>
          </div>

          {/* URL Input Card */}
          <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)', marginBottom: 24 }}>
            <div style={{ 
              display: 'flex', 
              gap: 8, 
              background: 'var(--bg-tertiary)',
              borderRadius: 16,
              padding: 6,
              border: '1px solid var(--border)',
              flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 200 }}>
                {detectedPlatform && (
                  <i className={`fab fa-${detectedPlatform}`} style={{ 
                    fontSize: 20, 
                    color: 'var(--accent)',
                    marginLeft: 8,
                  }}></i>
                )}
                <input
                  type="text"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); detectPlatform(e.target.value); }}
                  placeholder="Paste video URL here..."
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 15,
                    color: 'var(--text-primary)',
                    padding: '12px 4px',
                    minWidth: 0,
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                />
                {url && (
                  <button onClick={() => { setUrl(''); setDetectedPlatform(null); }}
                    style={iconBtnStyle}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handlePaste} style={secondaryBtnStyle}>
                  <i className="fas fa-paste"></i> <span className="btn-text">Paste</span>
                </button>
                <button onClick={handleAnalyze} disabled={!url || loading}
                  style={{
                    ...primaryBtnStyle,
                    opacity: !url || loading ? 0.5 : 1,
                    cursor: !url || loading ? 'not-allowed' : 'pointer',
                  }}>
                  {loading ? (
                    <><i className="fas fa-spinner fa-spin"></i> <span className="btn-text">Analyzing</span></>
                  ) : (
                    <><i className="fas fa-magnifying-glass"></i> <span className="btn-text">Analyze</span></>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="glass-card" style={{ padding: 24, animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div className="skeleton" style={{ width: 160, height: 100, borderRadius: 12 }}></div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div className="skeleton" style={{ height: 20, width: '80%', marginBottom: 10 }}></div>
                  <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 8 }}></div>
                  <div className="skeleton" style={{ height: 14, width: '30%' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Metadata & Downloads */}
          {metadata && !loading && (
            <div style={{ animation: 'fadeInUp 0.4s ease' }}>
              {/* Metadata Card */}
              <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {metadata.thumbnail && (
                    <img src={metadata.thumbnail} alt={metadata.title}
                      style={{
                        width: '100%',
                        maxWidth: 280,
                        aspectRatio: '16/10',
                        objectFit: 'cover',
                        borderRadius: 14,
                        flexShrink: 0,
                      }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span style={badgeStyle}>
                        <i className={`fab fa-${detectedPlatform || metadata.platform?.toLowerCase()}`} style={{ marginRight: 4 }}></i>
                        {metadata.platform || detectedPlatform}
                      </span>
                      {metadata.is_playlist && (
                        <span style={{ ...badgeStyle, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                          <i className="fas fa-list"></i> Playlist
                        </span>
                      )}
                    </div>
                    <h3 style={{ 
                      fontSize: 'clamp(15px, 2.5vw, 18px)', 
                      fontWeight: 700, 
                      marginBottom: 10,
                      color: 'var(--text-primary)',
                      wordBreak: 'break-word',
                      lineHeight: 1.4,
                    }}>
                      {metadata.title}
                    </h3>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {metadata.uploader && <span><i className="fas fa-user" style={{ marginRight: 4, color: 'var(--accent)' }}></i>{metadata.uploader}</span>}
                      {metadata.duration && <span><i className="fas fa-clock" style={{ marginRight: 4, color: 'var(--accent)' }}></i>{formatDuration(metadata.duration)}</span>}
                      {metadata.view_count > 0 && <span><i className="fas fa-eye" style={{ marginRight: 4, color: 'var(--accent)' }}></i>{formatViews(metadata.view_count)}</span>}
                      {metadata.upload_date && <span><i className="fas fa-calendar" style={{ marginRight: 4, color: 'var(--accent)' }}></i>{metadata.upload_date}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Format Tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {videoFormats.length > 0 && (
                  <button onClick={() => { setActiveTab('video'); setSelectedFormat(null); }}
                    style={tabStyle(activeTab === 'video')}>
                    <i className="fas fa-video"></i> Video
                  </button>
                )}
                {audioFormats.length > 0 && (
                  <button onClick={() => { setActiveTab('audio'); setSelectedFormat(null); }}
                    style={tabStyle(activeTab === 'audio')}>
                    <i className="fas fa-music"></i> Audio
                  </button>
                )}
              </div>

              {/* Format List */}
              {filteredFormats.length > 0 && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                  gap: 10,
                  marginBottom: 20,
                }}>
                  {filteredFormats.map(format => (
                    <button key={format.format_id} onClick={() => setSelectedFormat(format)}
                      style={formatCardStyle(selectedFormat?.format_id === format.format_id)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>
                          {format.resolution || format.ext.toUpperCase()}
                        </span>
                        {format.tbr && (
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                            {Math.round(format.tbr)}kbps
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {format.ext}
                        {format.vcodec && format.vcodec !== 'none' && ` • ${format.vcodec.split('.')[0]}`}
                        {format.acodec && format.acodec !== 'none' && ' • Audio'}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Download Button */}
              <button onClick={handleDownload}
                disabled={!selectedFormat || downloadJob}
                style={{
                  ...primaryBtnStyle,
                  width: '100%',
                  padding: '16px 24px',
                  fontSize: 16,
                  fontWeight: 700,
                  opacity: !selectedFormat || downloadJob ? 0.5 : 1,
                  cursor: !selectedFormat || downloadJob ? 'not-allowed' : 'pointer',
                }}>
                {downloadJob ? (
                  <><i className="fas fa-spinner fa-spin"></i> Downloading {downloadJob.progress}%</>
                ) : selectedFormat ? (
                  <><i className="fas fa-download"></i> Download {selectedFormat.ext.toUpperCase()} • {selectedFormat.resolution || 'Audio'}</>
                ) : (
                  <><i className="fas fa-hand-pointer"></i> Select a format to download</>
                )}
              </button>

              {/* Progress Bar */}
              {downloadJob && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${downloadJob.progress || 0}%`,
                      background: 'var(--accent)',
                      borderRadius: 3,
                      transition: 'width 0.3s ease',
                    }}></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Platforms Grid */}
          <div style={{ marginTop: 40, marginBottom: 32 }}>
            <h3 style={{ textAlign: 'center', fontSize: 20, fontWeight: 800, marginBottom: 20, color: 'var(--text-primary)' }}>
              Supported Platforms
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
              gap: 10,
            }}>
              {platforms.slice(0, 12).map((platform, i) => (
                <div key={i} className="glass-card"
                  style={{ padding: 16, textAlign: 'center', cursor: 'default' }}>
                  <div style={{ fontSize: 28, marginBottom: 6, color: 'var(--accent)' }}>
                    <i className={`fab fa-${(platform.id || platform.name || '').toLowerCase()}`}></i>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {platform.name || platform}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent History */}
          {history.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Recent Downloads</h3>
                <Link href="/history" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                  View All <i className="fas fa-arrow-right" style={{ marginLeft: 4 }}></i>
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                {history.map(item => (
                  <div key={item.id} className="glass-card" style={{ padding: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
                    {item.thumbnail && (
                      <img src={item.thumbnail} alt="" style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 8 }}
                        onError={(e) => { e.target.style.display = 'none'; }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {item.platform} • {item.resolution || item.type}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ textAlign: 'center', fontSize: 20, fontWeight: 800, marginBottom: 20, color: 'var(--text-primary)' }}>
              Why {siteConfig.name}?
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { icon: 'fa-bolt', title: 'Fast', desc: 'Lightning quick extraction' },
                { icon: 'fa-shield-halved', title: 'Secure', desc: 'Privacy first approach' },
                { icon: 'fa-globe', title: 'Multi-Platform', desc: 'All major sites supported' },
                { icon: 'fa-gem', title: 'HD Quality', desc: 'Best quality available' },
              ].map((f, i) => (
                <div key={i} className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 30, marginBottom: 8, color: 'var(--accent)' }}>
                    <i className={`fas ${f.icon}`}></i>
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{f.title}</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer style={{ textAlign: 'center', padding: '24px 0', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              <img src={siteConfig.logo} alt="" style={{ height: 28 }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{siteConfig.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
              {siteConfig.footerLinks.map(link => (
                <Link key={link.href} href={link.href} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13 }}>
                  {link.name}
                </Link>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{siteConfig.copyright}</p>
          </footer>
        </main>
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          .mobile-menu-btn { display: block !important; }
          .nav-text { display: none; }
          .btn-text { display: none; }
        }
        @media (min-width: 641px) {
          .mobile-menu { display: none !important; }
        }
      `}</style>
    </>
  );
}

const navLinkStyle = {
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 600,
  padding: '8px 14px',
  borderRadius: 10,
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: 'transparent',
};

const mobileNavStyle = {
  color: 'var(--text-primary)',
  textDecoration: 'none',
  fontSize: 15,
  fontWeight: 600,
  padding: '12px 16px',
  borderRadius: 12,
  background: 'var(--bg-tertiary)',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const primaryBtnStyle = {
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: '10px 18px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  whiteSpace: 'nowrap',
};

const secondaryBtnStyle = {
  background: 'var(--bg-secondary)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '10px 18px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  whiteSpace: 'nowrap',
};

const iconBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-tertiary)',
  cursor: 'pointer',
  padding: 8,
  fontSize: 16,
};

const badgeStyle = {
  background: 'var(--accent)',
  color: '#fff',
  padding: '4px 10px',
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
};

const tabStyle = (active) => ({
  background: active ? 'var(--accent)' : 'var(--bg-secondary)',
  color: active ? '#fff' : 'var(--text-secondary)',
  border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
  borderRadius: 10,
  padding: '10px 18px',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
});

const formatCardStyle = (selected) => ({
  background: selected ? 'var(--accent)' : 'var(--bg-secondary)',
  color: selected ? '#fff' : 'var(--text-primary)',
  border: '1px solid ' + (selected ? 'var(--accent)' : 'var(--border)'),
  borderRadius: 12,
  padding: 14,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.2s',
  width: '100%',
});
