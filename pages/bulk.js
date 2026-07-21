import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import siteConfig from '../site.config';
import { useToast, useAppSettings } from './_app';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function BulkDownload() {
  const showToast = useToast();
  const { settings } = useAppSettings();
  const [urls, setUrls] = useState('');
  const [queue, setQueue] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({
    defaultType: settings.download?.defaultType || 'video',
    defaultQuality: settings.download?.preferredQuality || 'highest',
    audioFormat: 'mp3',
    concurrent: 2,
    retryFailed: true,
    skipExisting: true,
  });

  const stats = {
    total: queue.length,
    waiting: queue.filter(i => i.status === 'waiting').length,
    extracting: queue.filter(i => i.status === 'extracting').length,
    downloading: queue.filter(i => i.status === 'downloading').length,
    completed: queue.filter(i => i.status === 'completed').length,
    failed: queue.filter(i => i.status === 'failed').length,
  };

  const parseURLs = () => {
    const lines = urls.split('\n').filter(line => line.trim());
    const unique = [...new Set(lines)];
    const valid = unique.filter(u => {
      try {
        new URL(u);
        return true;
      } catch {
        return false;
      }
    });
    
    return { unique, valid, invalid: unique.length - valid.length };
  };

  const handleAnalyzeAll = async () => {
    const { valid } = parseURLs();
    if (valid.length === 0) {
      showToast('No valid URLs found', 'error');
      return;
    }

    const newQueue = valid.map((url, index) => ({
      id: `bulk_${Date.now()}_${index}`,
      url,
      status: 'waiting',
      progress: 0,
      platform: detectPlatformFromURL(url),
      metadata: null,
      formats: [],
      selectedFormat: null,
      downloadType: globalSettings.defaultType,
    }));

    setQueue(newQueue);
    showToast(`${valid.length} URLs added to queue`, 'success');
  };

  const detectPlatformFromURL = (url) => {
    const patterns = {
      youtube: /youtube\.com|youtu\.be/i,
      facebook: /facebook\.com|fb\.watch/i,
      instagram: /instagram\.com/i,
      tiktok: /tiktok\.com/i,
      twitter: /twitter\.com|x\.com/i,
      reddit: /reddit\.com/i,
      vimeo: /vimeo\.com/i,
    };
    for (const [platform, pattern] of Object.entries(patterns)) {
      if (pattern.test(url)) return platform;
    }
    return 'unknown';
  };

  const processQueue = async () => {
    setProcessing(true);
    const processItem = async (item) => {
      if (item.status === 'completed' || item.status === 'failed') return item;

      try {
        // Extract
        updateQueueItem(item.id, { status: 'extracting' });
        const extractRes = await fetch(`${API_BASE}/api/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.url }),
        });
        
        if (!extractRes.ok) throw new Error('Extraction failed');
        const extractData = await extractRes.json();
        
        const formats = extractData.formats.filter(f => f.type === item.downloadType);
        const format = item.downloadType === 'video'
          ? formats.find(f => f.recommended) || formats[0]
          : formats[0];

        if (!format) throw new Error('No format available');

        updateQueueItem(item.id, {
          status: 'preparing',
          metadata: extractData.metadata,
          formats: extractData.formats,
          selectedFormat: format,
        });

        // Download
        updateQueueItem(item.id, { status: 'downloading' });
        const downloadRes = await fetch(`${API_BASE}/api/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.url, format_id: format.id }),
        });

        if (!downloadRes.ok) throw new Error('Download failed');
        const { job_id } = await downloadRes.json();

        // Poll progress
        await new Promise((resolve, reject) => {
          const interval = setInterval(async () => {
            try {
              const progressRes = await fetch(`${API_BASE}/api/progress/${job_id}`);
              const job = await progressRes.json();
              updateQueueItem(item.id, { progress: job.progress || 0 });

              if (job.status === 'completed') {
                clearInterval(interval);
                resolve();
              } else if (job.status === 'failed' || job.status === 'cancelled') {
                clearInterval(interval);
                reject(new Error(`Download ${job.status}`));
              }
            } catch (err) {
              clearInterval(interval);
              reject(err);
            }
          }, 1000);
        });

        // Get file
        const fileRes = await fetch(`${API_BASE}/api/file/${job_id}`);
        const blob = await fileRes.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `streamvault_bulk_${job_id}.${format.extension || 'mp4'}`;
        a.click();
        window.URL.revokeObjectURL(downloadUrl);

        updateQueueItem(item.id, { status: 'completed', progress: 100 });
        return { ...item, status: 'completed' };
      } catch (error) {
        updateQueueItem(item.id, { status: 'failed', progress: 0 });
        return { ...item, status: 'failed' };
      }
    };

    const remaining = queue.filter(i => i.status === 'waiting' || i.status === 'extracting' || i.status === 'preparing');
    const concurrency = globalSettings.concurrent;
    
    for (let i = 0; i < remaining.length; i += concurrency) {
      const batch = remaining.slice(i, i + concurrency);
      await Promise.all(batch.map(processItem));
    }

    setProcessing(false);
    showToast('Bulk download completed', 'success');
  };

  const updateQueueItem = (id, updates) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (id) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const clearCompleted = () => {
    setQueue(prev => prev.filter(item => item.status !== 'completed'));
  };

  const clearAll = () => {
    setQueue([]);
  };

  const retryFailed = () => {
    setQueue(prev => prev.map(item => 
      item.status === 'failed' ? { ...item, status: 'waiting', progress: 0 } : item
    ));
  };

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUrls(event.target.result);
    };
    reader.readAsText(file);
  };

  const updateGlobalSetting = (key, value) => {
    setGlobalSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateItemSetting = (id, key, value) => {
    setQueue(prev => prev.map(item =>
      item.id === id ? { ...item, [key]: value } : item
    ));
  };

  return (
    <>
      <Head>
        <title>Bulk Download - {siteConfig.name}</title>
        <meta name="description" content="Download multiple videos at once with bulk downloader" />
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
            <Link href="/" style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
              <h1 style={{ fontSize: 24, fontWeight: 700 }}>
                <i className="fas fa-cloud-arrow-down" style={{ color: 'var(--accent)', marginRight: 12 }}></i>
                {siteConfig.name}
              </h1>
            </Link>
            <nav style={{ display: 'flex', gap: 24 }}>
              <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                <i className="fas fa-home" style={{ marginRight: 6 }}></i>Home
              </Link>
              <Link href="/history" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                <i className="fas fa-clock-rotate-left" style={{ marginRight: 6 }}></i>History
              </Link>
              <Link href="/settings" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                <i className="fas fa-gear" style={{ marginRight: 6 }}></i>Settings
              </Link>
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              <i className="fas fa-layer-group" style={{ color: 'var(--accent)', marginRight: 12 }}></i>
              Bulk Downloader
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
              Download multiple videos at once. Paste URLs or import a text file.
            </p>
          </div>

          {/* URL Input Area */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 24,
            marginBottom: 24,
          }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
                Video URLs (one per line)
              </label>
              <textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="https://youtube.com/watch?v=...&#10;https://instagram.com/p/...&#10;https://tiktok.com/@user/video/..."
                rows={6}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                  fontFamily: 'monospace',
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={handleAnalyzeAll}
                disabled={!urls.trim() || processing}
                style={{
                  background: !urls.trim() || processing ? 'var(--bg-tertiary)' : 'var(--accent)',
                  color: !urls.trim() || processing ? 'var(--text-tertiary)' : '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 24px',
                  cursor: !urls.trim() || processing ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <i className="fas fa-plus" style={{ marginRight: 6 }}></i>Add to Queue
              </button>
              
              <label style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 24px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}>
                <i className="fas fa-file-import" style={{ marginRight: 6 }}></i>Import TXT
                <input type="file" accept=".txt" onChange={handleFileImport} style={{ display: 'none' }} />
              </label>

              {urls.trim() && (
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                  {parseURLs().valid} valid URLs
                </span>
              )}
            </div>
          </div>

          {/* Global Settings */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 24,
            marginBottom: 24,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
              <i className="fas fa-sliders" style={{ color: 'var(--accent)', marginRight: 8 }}></i>
              Queue Settings
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  Download Type
                </label>
                <select
                  value={globalSettings.defaultType}
                  onChange={(e) => updateGlobalSetting('defaultType', e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="thumbnail">Thumbnail</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  Quality
                </label>
                <select
                  value={globalSettings.defaultQuality}
                  onChange={(e) => updateGlobalSetting('defaultQuality', e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="highest">Highest</option>
                  <option value="recommended">Recommended</option>
                  <option value="lowest">Lowest</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  Concurrent Downloads
                </label>
                <select
                  value={globalSettings.concurrent}
                  onChange={(e) => updateGlobalSetting('concurrent', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>

              {globalSettings.defaultType === 'audio' && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                    Audio Format
                  </label>
                  <select
                    value={globalSettings.audioFormat}
                    onChange={(e) => updateGlobalSetting('audioFormat', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      fontSize: 14,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="mp3">MP3</option>
                    <option value="m4a">M4A</option>
                    <option value="original">Original</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Queue Stats */}
          {queue.length > 0 && (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 20,
              marginBottom: 24,
              display: 'flex',
              gap: 24,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Total: <strong style={{ color: 'var(--text-primary)' }}>{stats.total}</strong>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Completed: <strong style={{ color: '#10b981' }}>{stats.completed}</strong>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Failed: <strong style={{ color: '#ef4444' }}>{stats.failed}</strong>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Progress: <strong style={{ color: 'var(--accent)' }}>
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                </strong>
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {queue.some(i => i.status === 'waiting') && (
                  <button
                    onClick={processQueue}
                    disabled={processing}
                    style={{
                      background: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 20px',
                      cursor: processing ? 'not-allowed' : 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <i className="fas fa-play" style={{ marginRight: 6 }}></i>
                    {processing ? 'Processing...' : 'Start Queue'}
                  </button>
                )}
                {queue.some(i => i.status === 'failed') && (
                  <button
                    onClick={retryFailed}
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '10px 20px',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <i className="fas fa-rotate" style={{ marginRight: 6 }}></i>Retry Failed
                  </button>
                )}
                {queue.some(i => i.status === 'completed') && (
                  <button
                    onClick={clearCompleted}
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '10px 20px',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <i className="fas fa-check-double" style={{ marginRight: 6 }}></i>Clear Done
                  </button>
                )}
                <button
                  onClick={clearAll}
                  style={{
                    background: 'transparent',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                    borderRadius: 10,
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <i className="fas fa-trash" style={{ marginRight: 6 }}></i>Clear All
                </button>
              </div>
            </div>
          )}

          {/* Queue List */}
          {queue.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {queue.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${
                      item.status === 'completed' ? '#10b981' :
                      item.status === 'failed' ? '#ef4444' :
                      item.status === 'downloading' ? 'var(--accent)' :
                      'var(--border)'
                    }`,
                    borderRadius: 12,
                    padding: 16,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 20, width: 24, textAlign: 'center', color: 'var(--accent)' }}>
                      <i className={`fab fa-${item.platform}`}></i>
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {item.metadata ? (
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.metadata.title}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                          {item.url}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, textTransform: 'capitalize' }}>
                        {item.status}
                        {item.selectedFormat && ` • ${item.selectedFormat.resolution} ${item.selectedFormat.extension}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {item.status === 'downloading' && (
                        <div style={{ width: 100 }}>
                          <div style={{
                            height: 4,
                            background: 'var(--bg-tertiary)',
                            borderRadius: 2,
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${item.progress}%`,
                              background: 'var(--accent)',
                              transition: 'width 0.3s',
                            }}></div>
                          </div>
                        </div>
                      )}
                      
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: item.status === 'completed' ? '#10b981' : 
                               item.status === 'failed' ? '#ef4444' : 
                               'var(--text-secondary)',
                      }}>
                        {item.status === 'completed' && <i className="fas fa-check-circle"></i>}
                        {item.status === 'failed' && <i className="fas fa-times-circle"></i>}
                        {item.status === 'downloading' && `${item.progress}%`}
                      </span>

                      <button
                        onClick={() => removeItem(item.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          padding: 4,
                          fontSize: 14,
                        }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: 60,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 14,
            }}>
              <div style={{ fontSize: 48, marginBottom: 16, color: 'var(--text-tertiary)' }}>
                <i className="fas fa-layer-group"></i>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                No URLs in Queue
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Paste multiple video URLs above to start bulk downloading
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
