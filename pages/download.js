import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import siteConfig from '../site.config';
import { useToast, useAppSettings } from './_app';

const API_BASE = 'https://ohyah-ytback.hf.space';

const PLATFORMS = {
  youtube: { icon: 'fa-youtube', label: 'YouTube', accent: '#ff0000' },
  facebook: { icon: 'fa-facebook', label: 'Facebook', accent: '#1877f2' },
  instagram: { icon: 'fa-instagram', label: 'Instagram', accent: '#e4405f' },
  tiktok: { icon: 'fa-tiktok', label: 'TikTok', accent: '#000000' },
  twitter: { icon: 'fa-x-twitter', label: 'X/Twitter', accent: '#1da1f2' },
  reddit: { icon: 'fa-reddit', label: 'Reddit', accent: '#ff4500' },
  vimeo: { icon: 'fa-vimeo', label: 'Vimeo', accent: '#1ab7ea' },
  pinterest: { icon: 'fa-pinterest', label: 'Pinterest', accent: '#bd081c' },
  twitch: { icon: 'fa-twitch', label: 'Twitch', accent: '#9146ff' },
  soundcloud: { icon: 'fa-soundcloud', label: 'SoundCloud', accent: '#ff3300' },
};

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
  };
  for (const [id, pattern] of Object.entries(patterns)) {
    if (pattern.test(url)) return { id, ...PLATFORMS[id] };
  }
  return null;
}

function fmtDuration(secs) {
  if (!secs || secs <= 0) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtViews(n) {
  if (!n) return '';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M views';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K views';
  return n + ' views';
}

function fmtDate(date) {
  if (!date) return '';
  if (/^\d{8}$/.test(date)) {
    const y = date.slice(0, 4);
    const m = parseInt(date.slice(4, 6)) - 1;
    const d = parseInt(date.slice(6, 8));
    return new Date(y, m, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return date;
}

export default function Download() {
  const router = useRouter();
  const showToast = useToast();
  const { settings } = useAppSettings();
  
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('video');
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [downloadJob, setDownloadJob] = useState(null);
  const [thumbnailError, setThumbnailError] = useState(false);

  useEffect(() => {
    const queryUrl = router.query.url;
    if (queryUrl && status === 'idle') {
      setUrl(queryUrl);
      handleExtract(queryUrl);
    }
  }, [router.query.url]);

  const handleExtract = async (extractUrl) => {
    const targetUrl = extractUrl || url;
    if (!targetUrl?.trim()) return;
    
    setStatus('extracting');
    setError(null);
    setData(null);
    setSelectedFormat(null);
    setThumbnailError(false);

    try {
      const res = await fetch(`${API_BASE}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail?.[0]?.msg || 'Extraction failed');
      }

      const result = await res.json();
      setData(result);
      setStatus('success');

      const videoFormats = result.formats?.filter(f => f.has_video && f.format_id && !['sd', 'hd'].includes(f.format_id)) || [];
      if (videoFormats.length > 0) {
        const best = videoFormats.reduce((a, b) => (b.tbr || 0) > (a.tbr || 0) ? b : a);
        setSelectedFormat(best);
        setActiveTab('video');
      } else {
        const audioFormats = result.formats?.filter(f => f.has_audio && !f.has_video) || [];
        if (audioFormats.length > 0) {
          setSelectedFormat(audioFormats[0]);
          setActiveTab('audio');
        }
      }
    } catch (err) {
      setError(err);
      setStatus('error');
      showToast(err.message || 'Failed to analyze', 'error');
    }
  };

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
    } catch (err) {
      showToast(err.message || 'Download failed', 'error');
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
      } catch {
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
      showToast('Download complete!', 'success');
      setDownloadJob(null);
    } catch {
      showToast('File save failed', 'error');
    }
  };

  const saveToHistory = () => {
    if (!data?.metadata) return;
    const item = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      url,
      platform: platform?.id || 'unknown',
      title: data.metadata.title,
      thumbnail: data.metadata.thumbnail,
      type: activeTab,
      resolution: selectedFormat?.resolution,
      filename: `${data.metadata.title?.slice(0, 50)}.${selectedFormat?.ext || 'mp4'}`,
      status: 'completed',
    };
    const stored = localStorage.getItem('clipvault_history');
    const history = stored ? JSON.parse(stored) : [];
    const updated = [item, ...history].slice(0, 100);
    localStorage.setItem('clipvault_history', JSON.stringify(updated));
  };

  const meta = data?.metadata;
  const platform = detectPlatform(url);
  
  const videoFormats = data?.formats?.filter(f => f.has_video && f.format_id && !['sd', 'hd'].includes(f.format_id)) || [];
  const audioFormats = data?.formats?.filter(f => f.has_audio && !f.has_video && f.format_id) || [];
  const hasThumbnail = !!meta?.thumbnail && !thumbnailError;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'video' && videoFormats.length > 0) {
      setSelectedFormat(videoFormats[0]);
    } else if (tab === 'audio' && audioFormats.length > 0) {
      setSelectedFormat(audioFormats[0]);
    } else if (tab === 'thumbnail') {
      setSelectedFormat(null);
    }
  };

  return (
    <>
      <Head>
        <title>{meta?.title ? `${meta.title.slice(0, 60)} - ` : ''}{siteConfig.name}</title>
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        {/* Header */}
        <header className="glass" style={{
          position: 'sticky', top: 0, zIndex: 100,
          padding: '10px 16px', borderBottom: '1px solid var(--border-glass)',
        }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fas fa-arrow-left" style={{ color: 'var(--text-secondary)', fontSize: 16 }}></i>
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

        <main style={{ maxWidth: 800, margin: '0 auto', padding: '16px 16px 60px' }}>
          {/* URL Input */}
          <div className="glass-card" style={{ padding: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste video URL..."
                className="glass-input"
                style={{ flex: 1, minWidth: 180 }}
                onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              />
              <button onClick={() => handleExtract()} disabled={!url.trim() || status === 'extracting'} className="btn-primary">
                {status === 'extracting' ? (
                  <><i className="fas fa-spinner fa-spin"></i> Analyzing</>
                ) : (
                  <><i className="fas fa-magnifying-glass"></i> Analyze</>
                )}
              </button>
            </div>
          </div>

          {/* Loading */}
          {status === 'extracting' && (
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div className="skeleton" style={{ width: 180, height: 110, borderRadius: 12 }}></div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div className="skeleton" style={{ height: 20, width: '80%', marginBottom: 10 }}></div>
                  <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 8 }}></div>
                  <div className="skeleton" style={{ height: 14, width: '35%' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="glass-card" style={{ padding: 30, textAlign: 'center' }}>
              <div style={{ fontSize: 44, color: '#ef4444', marginBottom: 12 }}>
                <i className="fas fa-circle-exclamation"></i>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
                Extraction Failed
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                {error?.message || 'Unknown error occurred'}
              </p>
              <button onClick={() => handleExtract()} className="btn-primary">
                <i className="fas fa-rotate"></i> Retry
              </button>
            </div>
          )}

          {/* Results */}
          {status === 'success' && data && (
            <div className="animate-fade-up">
              {/* Thumbnail */}
              {meta?.thumbnail && !thumbnailError && (
                <div style={{
                  position: 'relative', width: '100%',
                  borderRadius: 18, overflow: 'hidden',
                  marginBottom: 16, background: '#000',
                  maxHeight: 340, aspectRatio: '16/9',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(${meta.thumbnail})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: 'blur(20px)', opacity: 0.3, transform: 'scale(1.1)',
                  }}></div>
                  <img src={meta.thumbnail} alt=""
                    style={{
                      position: 'relative', width: '100%', height: '100%',
                      objectFit: 'contain',
                    }}
                    onError={() => setThumbnailError(true)}
                  />
                  {meta.duration > 0 && (
                    <div style={{
                      position: 'absolute', bottom: 10, right: 10,
                      background: 'rgba(0,0,0,0.75)', color: '#fff',
                      padding: '3px 8px', borderRadius: 6,
                      fontSize: 12, fontWeight: 600,
                      backdropFilter: 'blur(8px)',
                    }}>
                      {fmtDuration(meta.duration)}
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="glass-card" style={{ padding: 'clamp(14px, 3vw, 20px)', marginBottom: 16 }}>
                {platform && (
                  <span className="badge" style={{ marginBottom: 10 }}>
                    <i className={`fab ${platform.icon}`}></i> {platform.label}
                  </span>
                )}
                <h1 style={{
                  fontSize: 'clamp(15px, 2.5vw, 18px)',
                  fontWeight: 700, lineHeight: 1.4,
                  color: 'var(--text-primary)', wordBreak: 'break-word',
                }}>
                  {meta.title || url}
                </h1>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {meta.uploader && <span><i className="fas fa-user" style={{ color: 'var(--accent)', marginRight: 4 }}></i>{meta.uploader}</span>}
                  {meta.view_count > 0 && <span><i className="fas fa-eye" style={{ color: 'var(--accent)', marginRight: 4 }}></i>{fmtViews(meta.view_count)}</span>}
                  {meta.upload_date && <span><i className="fas fa-calendar" style={{ color: 'var(--accent)', marginRight: 4 }}></i>{fmtDate(meta.upload_date)}</span>}
                  {meta.webpage_url && (
                    <a href={meta.webpage_url} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="fas fa-external-link"></i> Original
                    </a>
                  )}
                </div>
              </div>
{/* Mode Tabs */}
              <div style={{ 
                display: 'flex', gap: 4, marginBottom: 16,
                background: 'var(--bg-tertiary)', borderRadius: 16, padding: 4,
              }}>
                <button
                  onClick={() => handleTabChange('video')}
                  disabled={videoFormats.length === 0}
                  className={`tab-btn ${activeTab === 'video' ? 'active' : ''}`}
                >
                  <i className="fas fa-video"></i> Video
                  {videoFormats.length > 0 && (
                    <span style={{ fontSize: 10, opacity: 0.6 }}>({videoFormats.length})</span>
                  )}
                </button>
                <button
                  onClick={() => handleTabChange('audio')}
                  disabled={audioFormats.length === 0}
                  className={`tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
                >
                  <i className="fas fa-music"></i> Audio
                  {audioFormats.length > 0 && (
                    <span style={{ fontSize: 10, opacity: 0.6 }}>({audioFormats.length})</span>
                  )}
                </button>
                <button
                  onClick={() => handleTabChange('thumbnail')}
                  disabled={!hasThumbnail}
                  className={`tab-btn ${activeTab === 'thumbnail' ? 'active' : ''}`}
                >
                  <i className="fas fa-image"></i> Thumbnail
                </button>
              </div>

              {/* Format Cards */}
              {activeTab === 'video' && videoFormats.length > 0 && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                  gap: 8, marginBottom: 16,
                }}>
                  {videoFormats.map(f => (
                    <button
                      key={f.format_id}
                      onClick={() => setSelectedFormat(f)}
                      className={`format-card ${selectedFormat?.format_id === f.format_id ? 'selected' : ''}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{f.resolution || f.ext.toUpperCase()}</span>
                        {f.tbr > 0 && (
                          <span style={{ fontSize: 10, opacity: 0.7 }}>{Math.round(f.tbr)}kbps</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {f.ext} {f.vcodec && f.vcodec !== 'none' ? '• ' + f.vcodec.split('.')[0].toUpperCase() : ''}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'audio' && audioFormats.length > 0 && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                  gap: 8, marginBottom: 16,
                }}>
                  {audioFormats.map(f => (
                    <button
                      key={f.format_id}
                      onClick={() => setSelectedFormat(f)}
                      className={`format-card ${selectedFormat?.format_id === f.format_id ? 'selected' : ''}`}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                        {f.ext.toUpperCase()} Audio
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>
                        {f.abr > 0 ? `${Math.round(f.abr)}kbps` : ''} {f.acodec || ''}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'audio' && audioFormats.length === 0 && (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>
                  <i className="fas fa-music" style={{ fontSize: 40, marginBottom: 10, opacity: 0.3 }}></i>
                  <p>No audio-only formats available. Use Video tab to download with audio included.</p>
                </div>
              )}

              {activeTab === 'thumbnail' && hasThumbnail && (
                <div style={{ marginBottom: 16, borderRadius: 14, overflow: 'hidden' }}>
                  <img src={meta.thumbnail} alt="Thumbnail"
                    style={{ width: '100%', display: 'block' }}
                  />
                </div>
              )}

              {activeTab === 'thumbnail' && !hasThumbnail && (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>
                  <i className="fas fa-image" style={{ fontSize: 40, marginBottom: 10, opacity: 0.3 }}></i>
                  <p>No thumbnail available for this link.</p>
                </div>
              )}

              {/* Download Button */}
              <button
                onClick={handleDownload}
                disabled={(!selectedFormat && activeTab !== 'thumbnail') || downloadJob}
                className="btn-primary"
                style={{
                  width: '100%', padding: '16px 24px', fontSize: 16, fontWeight: 700,
                  borderRadius: 16, justifyContent: 'center',
                }}
              >
                {downloadJob ? (
                  <><i className="fas fa-spinner fa-spin"></i> Downloading {downloadJob.progress}%</>
                ) : activeTab === 'thumbnail' ? (
                  <><i className="fas fa-download"></i> Download Thumbnail</>
                ) : selectedFormat ? (
                  <><i className="fas fa-download"></i> Download {selectedFormat.ext.toUpperCase()} • {selectedFormat.resolution || 'Audio'}</>
                ) : (
                  <><i className="fas fa-hand-pointer"></i> Select a format</>
                )}
              </button>

              {/* Progress Bar */}
              {downloadJob && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ height: 5, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${downloadJob.progress || 0}%`,
                      background: 'var(--accent)', borderRadius: 3,
                      transition: 'width 0.3s',
                    }}></div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 6 }}>
                    {downloadJob.status === 'completed' ? 'Processing file...' : `${downloadJob.progress || 0}%`}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
                    }
