import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import siteConfig from '../site.config';
import { useToast, useAppSettings } from './_app';

const API_BASE = 'https://ohyah-ytback.hf.space';

function detectPlatformFromURL(url) {
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
  for (const [id, pattern] of Object.entries(patterns)) {
    if (pattern.test(url)) return id;
  }
  return 'unknown';
}

export default function Bulk() {
  const showToast = useToast();
  const { settings } = useAppSettings();
  const [urls, setUrls] = useState('');
  const [queue, setQueue] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({
    defaultType: 'video',
    concurrent: 2,
    retryFailed: true,
  });

  const stats = {
    total: queue.length,
    waiting: queue.filter(i => i.status === 'waiting').length,
    downloading: queue.filter(i => i.status === 'downloading').length,
    completed: queue.filter(i => i.status === 'completed').length,
    failed: queue.filter(i => i.status === 'failed').length,
  };

  const parseURLs = () => {
    const lines = urls.split('\n').filter(line => line.trim());
    const unique = [...new Set(lines)];
    const valid = unique.filter(u => {
      try { new URL(u); return true; } catch { return false; }
    });
    return { unique, valid, invalid: unique.length - valid.length };
  };

  const handleAddToQueue = () => {
    const { valid } = parseURLs();
    if (valid.length === 0) {
      showToast('No valid URLs found', 'error');
      return;
    }

    const newItems = valid.map((url, index) => ({
      id: `bulk_${Date.now()}_${index}`,
      url,
      status: 'waiting',
      progress: 0,
      platform: detectPlatformFromURL(url),
      metadata: null,
      selectedFormat: null,
      downloadType: globalSettings.defaultType,
    }));

    setQueue(prev => [...prev, ...newItems]);
    showToast(`${valid.length} URLs added to queue`, 'success');
  };

  const updateQueueItem = (id, updates) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const processQueue = async () => {
    setProcessing(true);
    const pending = queue.filter(i => i.status === 'waiting');
    const concurrency = globalSettings.concurrent;

    const processItem = async (item) => {
      try {
        updateQueueItem(item.id, { status: 'extracting' });
        const extractRes = await fetch(`${API_BASE}/api/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.url }),
        });

        if (!extractRes.ok) throw new Error('Extraction failed');
        const data = await extractRes.json();

        const formats = item.downloadType === 'video'
          ? data.formats.filter(f => f.has_video && f.format_id && !['sd', 'hd'].includes(f.format_id))
          : data.formats.filter(f => f.has_audio && !f.has_video && f.format_id);

        if (formats.length === 0) throw new Error('No format available');
        const bestFormat = formats.reduce((a, b) => (b.tbr || b.abr || 0) > (a.tbr || a.abr || 0) ? b : a);

        updateQueueItem(item.id, {
          status: 'downloading',
          metadata: data.metadata,
          selectedFormat: bestFormat,
        });

        const downloadRes = await fetch(`${API_BASE}/api/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.url, format_id: bestFormat.format_id }),
        });

        if (!downloadRes.ok) throw new Error('Download failed');
        const { job_id } = await downloadRes.json();

        await new Promise((resolve, reject) => {
          const interval = setInterval(async () => {
            try {
              const progressRes = await fetch(`${API_BASE}/api/progress/${job_id}`);
              const job = await progressRes.json();
              updateQueueItem(item.id, { progress: job.progress || 0 });

              if (job.status === 'completed') {
                clearInterval(interval);
                resolve();
              } else if (job.status === 'failed') {
                clearInterval(interval);
                reject(new Error('Download failed'));
              }
            } catch (err) {
              clearInterval(interval);
              reject(err);
            }
          }, 1000);
        });

        const fileRes = await fetch(`${API_BASE}/api/file/${job_id}`);
        const blob = await fileRes.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `clipvault_bulk_${job_id}.${bestFormat.ext || 'mp4'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);

        updateQueueItem(item.id, { status: 'completed', progress: 100 });
      } catch (error) {
        updateQueueItem(item.id, { status: 'failed', progress: 0 });
      }
    };

    for (let i = 0; i < pending.length; i += concurrency) {
      const batch = pending.slice(i, i + concurrency);
      await Promise.all(batch.map(processItem));
    }

    setProcessing(false);
    showToast('Bulk download completed', 'success');
  };

  const removeItem = (id) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const clearCompleted = () => {
    setQueue(prev => prev.filter(item => item.status !== 'completed'));
  };

  const clearAll = () => {
    setQueue([]);
    showToast('Queue cleared', 'success');
  };

  const retryFailed = () => {
    setQueue(prev => prev.map(item =>
      item.status === 'failed' ? { ...item, status: 'waiting', progress: 0 } : item
    ));
    showToast('Failed items re-queued', 'success');
  };

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUrls(event.target.result);
      showToast('File imported', 'success');
    };
    reader.readAsText(file);
  };

  return (
    <>
      <Head>
        <title>Bulk Download - {siteConfig.name}</title>
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <header className="glass" style={{
          position: 'sticky', top: 0, zIndex: 100,
          padding: '10px 16px', borderBottom: '1px solid var(--border-glass)',
        }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fas fa-arrow-left" style={{ color: 'var(--text-secondary)' }}></i>
              <img src={siteConfig.logo} alt="" style={{ height: 30, width: 30, borderRadius: 8 }} />
              <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{siteConfig.name}</span>
            </Link>
            <nav className="hide-mobile" style={{ display: 'flex', gap: 4 }}>
              <Link href="/history" className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }}>
                <i className="fas fa-clock-rotate-left"></i> History
              </Link>
              <Link href="/settings" className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }}>
                <i className="fas fa-gear"></i> Settings
              </Link>
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 60px' }}>
          <div className="animate-fade-up" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'var(--accent)', opacity: 0.1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)', fontSize: 20,
              }}>
                <i className="fas fa-layer-group"></i>
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Bulk Downloader
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Download multiple videos at once
                </p>
              </div>
            </div>
          </div>

          {/* URL Input */}
          <div className="glass-card" style={{ padding: 'clamp(14px, 3vw, 20px)', marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
              Video URLs (one per line)
            </label>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://youtube.com/watch?v=...&#10;https://instagram.com/p/...&#10;https://tiktok.com/@user/video/..."
              rows={5}
              className="glass-input"
              style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13, marginBottom: 12 }}
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={handleAddToQueue} disabled={!urls.trim()} className="btn-primary">
                <i className="fas fa-plus"></i> Add to Queue
              </button>

              <label className="btn-secondary" style={{ cursor: 'pointer' }}>
                <i className="fas fa-file-import"></i> Import TXT
                <input type="file" accept=".txt" onChange={handleFileImport} style={{ display: 'none' }} />
              </label>

              {urls.trim() && (
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                  {parseURLs().valid} valid URLs
                </span>
              )}
            </div>
          </div>

          {/* Global Settings */}
          <div className="glass-card" style={{ padding: 'clamp(14px, 3vw, 18px)', marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
              <i className="fas fa-sliders" style={{ color: 'var(--accent)', marginRight: 6 }}></i> Queue Settings
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                  Download Type
                </label>
                <select
                  value={globalSettings.defaultType}
                  onChange={(e) => setGlobalSettings(prev => ({ ...prev, defaultType: e.target.value }))}
                  className="glass-input"
                  style={{ padding: '8px 12px', fontSize: 13 }}
                >
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                  Concurrent
                </label>
                <select
                  value={globalSettings.concurrent}
                  onChange={(e) => setGlobalSettings(prev => ({ ...prev, concurrent: parseInt(e.target.value) }))}
                  className="glass-input"
                  style={{ padding: '8px 12px', fontSize: 13 }}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>
            </div>
          </div>
{/* Stats Bar */}
          {queue.length > 0 && (
            <div className="glass-card" style={{
              padding: 14, marginBottom: 16,
              display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Total: <strong style={{ color: 'var(--text-primary)' }}>{stats.total}</strong>
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Done: <strong style={{ color: '#10b981' }}>{stats.completed}</strong>
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Failed: <strong style={{ color: '#ef4444' }}>{stats.failed}</strong>
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Progress: <strong style={{ color: 'var(--accent)' }}>
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                </strong>
              </span>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {stats.waiting > 0 && (
                  <button onClick={processQueue} disabled={processing} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                    <i className="fas fa-play"></i> {processing ? 'Running...' : 'Start'}
                  </button>
                )}
                {stats.failed > 0 && (
                  <button onClick={retryFailed} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
                    <i className="fas fa-rotate"></i> Retry
                  </button>
                )}
                {stats.completed > 0 && (
                  <button onClick={clearCompleted} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
                    <i className="fas fa-check-double"></i> Clear Done
                  </button>
                )}
                <button onClick={clearAll} className="btn-icon" style={{ color: '#ef4444', padding: '8px 12px' }}>
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          )}

          {/* Queue List */}
          {queue.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {queue.map(item => (
                <div key={item.id} className="glass-card" style={{
                  padding: 14,
                  borderLeft: `3px solid ${
                    item.status === 'completed' ? '#10b981' :
                    item.status === 'failed' ? '#ef4444' :
                    item.status === 'downloading' ? 'var(--accent)' :
                    'transparent'
                  }`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--bg-tertiary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, flexShrink: 0,
                    }}>
                      <i className={`fab fa-${item.platform}`} style={{ color: 'var(--accent)' }}></i>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {item.metadata ? (
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.metadata.title}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                          {item.url}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, textTransform: 'capitalize' }}>
                        {item.status}
                        {item.selectedFormat && ` • ${item.selectedFormat.resolution || item.selectedFormat.ext}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {item.status === 'downloading' && (
                        <div style={{ width: 80, height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${item.progress}%`, background: 'var(--accent)', transition: 'width 0.3s' }}></div>
                        </div>
                      )}

                      <span style={{
                        fontSize: 18,
                        color: item.status === 'completed' ? '#10b981' :
                               item.status === 'failed' ? '#ef4444' :
                               item.status === 'downloading' ? 'var(--accent)' :
                               'var(--text-tertiary)',
                      }}>
                        {item.status === 'completed' && <i className="fas fa-circle-check"></i>}
                        {item.status === 'failed' && <i className="fas fa-circle-xmark"></i>}
                        {item.status === 'extracting' && <i className="fas fa-spinner fa-spin"></i>}
                        {item.status === 'waiting' && <i className="fas fa-circle"></i>}
                        {item.status === 'downloading' && `${item.progress}%`}
                      </span>

                      <button onClick={() => removeItem(item.id)} className="btn-icon" style={{ fontSize: 13 }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 50, textAlign: 'center' }}>
              <div style={{ fontSize: 50, color: 'var(--text-tertiary)', opacity: 0.3, marginBottom: 14 }}>
                <i className="fas fa-layer-group"></i>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Queue is Empty
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Paste video URLs above to start bulk downloading
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
                        }
