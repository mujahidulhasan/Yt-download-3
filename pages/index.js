import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import siteConfig from '../site.config';
import { useToast, useAppSettings } from './_app';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

  useEffect(() => {
    fetchPlatforms();
    loadHistory();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/platforms`);
      const data = await res.json();
      setPlatforms(data);
    } catch (error) {
      console.error('Failed to fetch platforms:', error);
    }
  };

  const loadHistory = () => {
    const stored = localStorage.getItem('streamvault_history');
    if (stored) {
      try {
        setHistory(JSON.parse(stored).slice(0, 5));
      } catch (e) {
        console.error('History parse error:', e);
      }
    }
  };

  const detectPlatform = (inputUrl) => {
    if (!inputUrl) {
      setDetectedPlatform(null);
      return;
    }
    const platformPatterns = {
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
    };

    for (const [platform, pattern] of Object.entries(platformPatterns)) {
      if (pattern.test(inputUrl)) {
        setDetectedPlatform(platform);
        return;
      }
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
        const error = await res.json();
        throw new Error(error.message || 'Extraction failed');
      }
      
      const data = await res.json();
      setMetadata(data.metadata);
      setFormats(data.formats);
      showToast('Media analyzed successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to analyze URL', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredFormats = formats.filter(f => {
    if (activeTab === 'video') return f.type === 'video';
    if (activeTab === 'audio') return f.type === 'audio';
    if (activeTab === 'thumbnail') return f.type === 'thumbnail';
    return true;
  }).sort((a, b) => {
    const aRes = parseInt(a.resolution) || 0;
    const bRes = parseInt(b.resolution) || 0;
    return bRes - aRes;
  });

  const handleDownload = async () => {
    if (!selectedFormat || !url) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, format_id: selectedFormat.id }),
      });
      
      if (!res.ok) throw new Error('Download failed');
      
      const { job_id } = await res.json();
      setDownloadJob({ id: job_id, status: 'preparing', progress: 0 });
      pollProgress(job_id);
    } catch (error) {
      showToast(error.message || 'Download failed', 'error');
    }
  };

  const pollProgress = async (jobId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/progress/${jobId}`);
        const job = await res.json();
        
        setDownloadJob(job);
        
        if (job.status === 'completed') {
          clearInterval(interval);
          downloadFile(jobId);
        } else if (job.status === 'failed' || job.status === 'cancelled') {
          clearInterval(interval);
          showToast(`Download ${job.status}`, 'error');
        }
      } catch (error) {
        clearInterval(interval);
        showToast('Progress check failed', 'error');
      }
    }, 1000);
  };

  const downloadFile = async (jobId) => {
    try {
      const res = await fetch(`${API_BASE}/api/file/${jobId}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `streamvault_${jobId}.mp4`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      saveToHistory();
      showToast('Download completed', 'success');
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
      platform: detectedPlatform || 'unknown',
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      type: activeTab,
      resolution: selectedFormat?.resolution,
      filename: `${metadata.title}.${selectedFormat?.extension || 'mp4'}`,
      status: 'completed',
    };
    
    const updated = [item, ...history].slice(0, 100);
    setHistory(updated);
    localStorage.setItem('streamvault_history', JSON.stringify(updated));
  };

  return (
    <>
      <Head>
        <title>{siteConfig.name} - Video Downloader</title>
        <meta name="description" content={siteConfig.description} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": siteConfig.name,
            "applicationCategory": "MultimediaApplication",
            "operatingSystem": "Web",
            "description": siteConfig.description,
          })}
        </script>
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
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
              <i className="fas fa-cloud-arrow-down" style={{ color: 'var(--accent)', marginRight: 12 }}></i>
              {siteConfig.name}
            </h1>
            <nav style={{ display: 'flex', gap: 24 }}>
              <a href="/bulk" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                <i className="fas fa-layer-group" style={{ marginRight: 6 }}></i>Bulk
              </a>
              <a href="/history" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                <i className="fas fa-clock-rotate-left" style={{ marginRight: 6 }}></i>History
              </a>
              <a href="/settings" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                <i className="fas fa-gear" style={{ marginRight: 6 }}></i>Settings
              </a>
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 48, fontWeight: 800, marginBottom: 16, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              Download Videos From Any Platform
            </h2>
            <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
              Fast, secure, and free video downloader. Support for multiple platforms with original quality.
            </p>
          </div>

          {/* URL Input */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              background: 'var(--bg-secondary)',
              border: '2px solid var(--border)',
              borderRadius: '14px',
              padding: '8px',
              display: 'flex',
              gap: 8,
              transition: 'border-color 0.2s',
              boxShadow: 'var(--shadow-md)',
            }}>
              {detectedPlatform && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  color: 'var(--accent)',
                  fontSize: 20,
                }}>
                  <i className={`fab fa-${detectedPlatform}`}></i>
                </div>
              )}
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  detectPlatform(e.target.value);
                }}
                placeholder="Paste video URL here..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 16,
                  color: 'var(--text-primary)',
                  padding: '12px 8px',
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />
              {url && (
                <button
                  onClick={() => { setUrl(''); setDetectedPlatform(null); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: '0 8px',
                    fontSize: 16,
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
              <button
                onClick={handlePaste}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: 14,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                <i className="fas fa-paste" style={{ marginRight: 6 }}></i>Paste
              </button>
              <button
                onClick={handleAnalyze}
                disabled={!url || loading}
                style={{
                  background: !url || loading ? 'var(--bg-tertiary)' : 'var(--accent)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  cursor: !url || loading ? 'not-allowed' : 'pointer',
                  color: !url || loading ? 'var(--text-tertiary)' : '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                {loading ? (
                  <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>Analyzing</>
                ) : (
                  <><i className="fas fa-magnifying-glass" style={{ marginRight: 6 }}></i>Analyze</>
                )}
              </button>
            </div>
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
                <div className="skeleton" style={{ width: 200, height: 120, borderRadius: 14 }}></div>
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 24, width: '70%', marginBottom: 12 }}></div>
                  <div className="skeleton" style={{ height: 16, width: '50%', marginBottom: 8 }}></div>
                  <div className="skeleton" style={{ height: 16, width: '40%' }}></div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }}></div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata & Formats */}
          {metadata && !loading && (
            <div style={{ animation: 'slideUp 0.3s' }}>
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '14px',
                padding: 24,
                marginBottom: 24,
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {metadata.thumbnail && (
                    <img
                      src={metadata.thumbnail}
                      alt={metadata.title}
                      style={{
                        width: 200,
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 14,
                      }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 250 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{
                        background: 'var(--accent)',
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}>
                        {metadata.platform || detectedPlatform}
                      </span>
                      {metadata.isPlaylist && (
                        <span style={{
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 500,
                        }}>
                          <i className="fas fa-list" style={{ marginRight: 4 }}></i>
                          Playlist ({metadata.playlistCount || 0})
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                      {metadata.title}
                    </h3>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: 13 }}>
                      {metadata.uploader && <span><i className="fas fa-user" style={{ marginRight: 4 }}></i>{metadata.uploader}</span>}
                      {metadata.duration && <span><i className="fas fa-clock" style={{ marginRight: 4 }}></i>{metadata.duration}</span>}
                      {metadata.views && <span><i className="fas fa-eye" style={{ marginRight: 4 }}></i>{metadata.views}</span>}
                      {metadata.uploadDate && <span><i className="fas fa-calendar" style={{ marginRight: 4 }}></i>{metadata.uploadDate}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Download Tabs */}
              <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                {['video', 'audio', 'thumbnail'].map(tab => {
                  const hasFormats = formats.some(f => f.type === tab);
                  if (!hasFormats) return null;
                  return (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setSelectedFormat(null); }}
                      style={{
                        background: activeTab === tab ? 'var(--accent)' : 'var(--bg-secondary)',
                        color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '10px 20px',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        transition: 'all 0.2s',
                      }}
                    >
                      <i className={`fas fa-${tab === 'video' ? 'video' : tab === 'audio' ? 'music' : 'image'}`} style={{ marginRight: 6 }}></i>
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Format Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: 12,
                marginBottom: 24,
              }}>
                {filteredFormats.map(format => (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format)}
                    style={{
                      background: selectedFormat?.id === format.id ? 'var(--accent)' : 'var(--bg-secondary)',
                      color: selectedFormat?.id === format.id ? '#fff' : 'var(--text-primary)',
                      border: `1px solid ${selectedFormat?.id === format.id ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 12,
                      padding: 16,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>
                        {format.resolution}
                        {format.hdr && <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--accent)' }}>HDR</span>}
                      </span>
                      {format.recommended && (
                        <span style={{
                          background: 'var(--bg-tertiary)',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 600,
                        }}>
                          <i className="fas fa-star" style={{ marginRight: 3 }}></i>Best
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: selectedFormat?.id === format.id ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)' }}>
                      <span>{format.extension.toUpperCase()}</span>
                      {format.codec && <span> • {format.codec}</span>}
                      {format.size && <span> • {format.size}</span>}
                    </div>
                  </button>
                ))}
              </div>

              {/* Download Button */}
              <button
                onClick={handleDownload}
                disabled={!selectedFormat || (downloadJob && downloadJob.status === 'downloading')}
                style={{
                  width: '100%',
                  background: !selectedFormat ? 'var(--bg-tertiary)' : 'var(--accent)',
                  color: !selectedFormat ? 'var(--text-tertiary)' : '#fff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '16px 24px',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: !selectedFormat ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {downloadJob && downloadJob.status === 'downloading' ? (
                  <><i className="fas fa-spinner fa-spin"></i> Downloading... {downloadJob.progress}%</>
                ) : (
                  <>
                    <i className="fas fa-download"></i>
                    {selectedFormat ? `Download ${selectedFormat.extension.toUpperCase()} • ${selectedFormat.resolution}` : 'Select a format to download'}
                  </>
                )}
              </button>

              {/* Progress Bar */}
              {downloadJob && downloadJob.status === 'downloading' && (
                <div style={{ marginTop: 16 }}>
                  <div style={{
                    height: 6,
                    background: 'var(--bg-tertiary)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${downloadJob.progress}%`,
                      background: 'var(--accent)',
                      transition: 'width 0.3s',
                      borderRadius: 3,
                    }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span>{downloadJob.progress}%</span>
                    {downloadJob.speed && <span>{downloadJob.speed}</span>}
                    {downloadJob.eta && <span>ETA: {downloadJob.eta}</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Supported Platforms */}
          <div style={{ marginTop: 64, marginBottom: 48 }}>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, textAlign: 'center', color: 'var(--text-primary)' }}>
              Supported Platforms
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 16,
            }}>
              {platforms.map(platform => (
                <div
                  key={platform.id || platform.name}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 20,
                    textAlign: 'center',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8, color: 'var(--accent)' }}>
                    <i className={`fab fa-${platform.id || platform.name.toLowerCase()}`}></i>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {platform.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Downloads */}
          {history.length > 0 && (
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Recent Downloads
                </h3>
                <a href="/history" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                  View All <i className="fas fa-arrow-right" style={{ marginLeft: 4 }}></i>
                </a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {history.map(item => (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 16,
                      display: 'flex',
                      gap: 12,
                    }}
                  >
                    {item.thumbnail && (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8 }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {item.platform} • {item.resolution || item.type}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                        {new Date(item.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features */}
          <div style={{ marginBottom: 48 }}>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, textAlign: 'center', color: 'var(--text-primary)' }}>
              Why Choose {siteConfig.name}?
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
              {[
                { icon: 'fa-bolt', title: 'Fast Extraction', desc: 'Lightning-fast video analysis and extraction' },
                { icon: 'fa-shield-halved', title: 'Secure Downloads', desc: 'Your privacy and security is our priority' },
                { icon: 'fa-expand', title: 'Multi Platform', desc: 'Support for all major video platforms' },
                { icon: 'fa-database', title: 'Original Quality', desc: 'Download in the highest available quality' },
              ].map((feature, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 24,
                  }}
                >
                  <div style={{ fontSize: 28, color: 'var(--accent)', marginBottom: 12 }}>
                    <i className={`fas ${feature.icon}`}></i>
                  </div>
                  <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                    {feature.title}
                  </h4>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div style={{ marginBottom: 48 }}>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, textAlign: 'center', color: 'var(--text-primary)' }}>
              Frequently Asked Questions
            </h3>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              {[
                { q: 'Is this downloader free to use?', a: 'Yes, StreamVault is completely free to use with no limitations.' },
                { q: 'Which platforms are supported?', a: 'We support YouTube, Facebook, Instagram, TikTok, Twitter, Reddit, Vimeo, and many more.' },
                { q: 'Can I download in original quality?', a: 'Yes, you can download videos in the highest available quality including 4K and HDR.' },
              ].map((faq, i) => (
                <details
                  key={i}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    marginBottom: 12,
                    overflow: 'hidden',
                  }}
                >
                  <summary style={{
                    padding: '16px 20px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 15,
                    color: 'var(--text-primary)',
                    listStyle: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    {faq.q}
                    <i className="fas fa-chevron-down" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}></i>
                  </summary>
                  <p style={{ padding: '0 20px 16px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer style={{
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)',
          padding: '32px 24px',
          marginTop: 64,
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
              <i className="fas fa-cloud-arrow-down" style={{ color: 'var(--accent)', marginRight: 8 }}></i>
              {siteConfig.name}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16, flexWrap: 'wrap' }}>
              {siteConfig.footerLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14 }}
                >
                  {link.name}
                </a>
              ))}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
              {siteConfig.copyright}
            </p>
          </div>
        </footer>
      </div>
    </>
  );
          }
