import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import siteConfig from '../site.config';
import { useToast } from './_app';

const PLATFORMS = {
  youtube: { icon: 'fa-youtube', color: '#ff0000' },
  facebook: { icon: 'fa-facebook', color: '#1877f2' },
  instagram: { icon: 'fa-instagram', color: '#e4405f' },
  tiktok: { icon: 'fa-tiktok', color: '#000000' },
  twitter: { icon: 'fa-x-twitter', color: '#1da1f2' },
  reddit: { icon: 'fa-reddit', color: '#ff4500' },
  vimeo: { icon: 'fa-vimeo', color: '#1ab7ea' },
  pinterest: { icon: 'fa-pinterest', color: '#bd081c' },
  twitch: { icon: 'fa-twitch', color: '#9146ff' },
  soundcloud: { icon: 'fa-soundcloud', color: '#ff3300' },
};

export default function History() {
  const showToast = useToast();
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selected, setSelected] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const stored = localStorage.getItem('clipvault_history');
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        console.error('History parse error:', e);
      }
    }
  };

  const saveHistory = (newHistory) => {
    localStorage.setItem('clipvault_history', JSON.stringify(newHistory));
    setHistory(newHistory);
  };

  const deleteItem = (id) => {
    const updated = history.filter(item => item.id !== id);
    saveHistory(updated);
    setSelected(prev => prev.filter(s => s !== id));
    showToast('Removed from history', 'success');
  };

  const deleteSelected = () => {
    const updated = history.filter(item => !selected.includes(item.id));
    saveHistory(updated);
    setSelected([]);
    setShowDeleteModal(false);
    showToast(`${selected.length} items deleted`, 'success');
  };

  const clearHistory = () => {
    saveHistory([]);
    setSelected([]);
    setShowDeleteModal(false);
    showToast('History cleared', 'success');
  };

  const exportHistory = () => {
    const data = JSON.stringify(history, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clipvault_history_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('History exported', 'success');
  };

  const platforms = [...new Set(history.map(item => item.platform).filter(Boolean))];

  const filteredHistory = history
    .filter(item => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (filterPlatform !== 'all' && item.platform !== filterPlatform) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (item.title || '').toLowerCase().includes(q) ||
          item.url?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.timestamp - a.timestamp;
      if (sortBy === 'oldest') return a.timestamp - b.timestamp;
      return 0;
    });

  const stats = {
    total: history.length,
    video: history.filter(i => i.type === 'video').length,
    audio: history.filter(i => i.type === 'audio').length,
    thumbnail: history.filter(i => i.type === 'thumbnail').length,
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selected.length === filteredHistory.length) {
      setSelected([]);
    } else {
      setSelected(filteredHistory.map(i => i.id));
    }
  };

  return (
    <>
      <Head>
        <title>Download History - {siteConfig.name}</title>
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
              <Link href="/bulk" className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }}>
                <i className="fas fa-layer-group"></i> Bulk
              </Link>
              <Link href="/settings" className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }}>
                <i className="fas fa-gear"></i> Settings
              </Link>
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 60px' }}>
          <div className="animate-fade-up" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'var(--accent)', opacity: 0.1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent)', fontSize: 20,
                  }}>
                    <i className="fas fa-clock-rotate-left"></i>
                  </div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Download History
                  </h1>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 56 }}>
                  {history.length} total downloads
                </p>
              </div>
              {history.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={exportHistory} className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }}>
                    <i className="fas fa-file-export"></i> Export
                  </button>
                  {selected.length > 0 && (
                    <button onClick={() => setShowDeleteModal(true)}
                      style={{
                        background: '#ef4444', color: '#fff', border: 'none',
                        borderRadius: 14, padding: '8px 14px', fontSize: 13,
                        fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                      <i className="fas fa-trash"></i> Delete ({selected.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          {history.length > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: 8, marginBottom: 20,
            }}>
              {[
                { label: 'Total', value: stats.total, icon: 'fa-download', color: 'var(--accent)' },
                { label: 'Video', value: stats.video, icon: 'fa-video', color: '#3b82f6' },
                { label: 'Audio', value: stats.audio, icon: 'fa-music', color: '#10b981' },
                { label: 'Images', value: stats.thumbnail, icon: 'fa-image', color: '#8b5cf6' },
              ].map((stat, i) => (
                <div key={i} className="glass-card" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, color: stat.color, marginBottom: 4 }}>
                    <i className={`fas ${stat.icon}`}></i>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          {history.length > 0 && (
            <div className="glass-card" style={{
              padding: 14, marginBottom: 16,
              display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
            }}>
              <div style={{ flex: 1, minWidth: 150, position: 'relative' }}>
                <i className="fas fa-search" style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)', fontSize: 13,
                }}></i>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="glass-input"
                  style={{ padding: '8px 12px 8px 34px', fontSize: 13 }}
                />
              </div>

              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="glass-input" style={{ padding: '8px 12px', fontSize: 13, width: 'auto' }}>
                <option value="all">All Types</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="thumbnail">Thumbnail</option>
              </select>

              <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}
                className="glass-input" style={{ padding: '8px 12px', fontSize: 13, width: 'auto' }}>
                <option value="all">All Platforms</option>
                {platforms.map(p => (
                  <option key={p} value={p} style={{ textTransform: 'capitalize' }}>{p}</option>
                ))}
              </select>

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="glass-input" style={{ padding: '8px 12px', fontSize: 13, width: 'auto' }}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>

              <button onClick={selectAll} className="btn-secondary" style={{ padding: '8px 14px', fontSize: 12 }}>
                {selected.length === filteredHistory.length ? 'Deselect' : 'Select All'}
              </button>
            </div>
          )}

          {/* History List */}
          {filteredHistory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredHistory.map(item => {
                const p = PLATFORMS[item.platform];
                const isSelected = selected.includes(item.id);
                return (
                  <div key={item.id} className="glass-card" style={{
                    padding: 14, cursor: 'pointer',
                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-glass)',
                    background: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-card)',
                  }} onClick={() => toggleSelect(item.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 6,
                        border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        background: isSelected ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.15s',
                      }}>
                        {isSelected && <i className="fas fa-check" style={{ color: '#fff', fontSize: 10 }}></i>}
                      </div>

                      {item.thumbnail && (
                        <img src={item.thumbnail} alt=""
                          style={{
                            width: 60, height: 42, objectFit: 'cover', borderRadius: 8, flexShrink: 0,
                          }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title || 'Untitled'}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {p && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <i className={`fab ${p.icon}`} style={{ color: p.color }}></i> {item.platform}
                            </span>
                          )}
                          <span style={{ textTransform: 'capitalize' }}>{item.type}</span>
                          {item.resolution && <span>{item.resolution}</span>}
                          <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                        <Link href={`/download?url=${encodeURIComponent(item.url)}`}
                          className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}>
                          <i className="fas fa-download"></i>
                        </Link>
                        <button onClick={() => deleteItem(item.id)}
                          className="btn-icon" style={{ color: '#ef4444', padding: '6px 10px', fontSize: 12 }}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : history.length === 0 ? (
            <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 56, color: 'var(--text-tertiary)', opacity: 0.3, marginBottom: 14 }}>
                <i className="fas fa-clock-rotate-left"></i>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                No Download History
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                Downloads will appear here
              </p>
              <Link href="/" className="btn-primary">
                <i className="fas fa-download"></i> Start Downloading
              </Link>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 40, color: 'var(--text-tertiary)', opacity: 0.3, marginBottom: 10 }}>
                <i className="fas fa-search"></i>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No results found</p>
            </div>
          )}
        </main>

        {/* Delete Modal */}
        {showDeleteModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 24,
          }} onClick={() => setShowDeleteModal(false)}>
            <div className="glass-card" style={{
              padding: 28, maxWidth: 380, width: '100%',
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 36, color: '#ef4444', textAlign: 'center', marginBottom: 12 }}>
                <i className="fas fa-triangle-exclamation"></i>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 6, color: 'var(--text-primary)' }}>
                Delete {selected.length} items?
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 20 }}>
                This cannot be undone
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowDeleteModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </button>
                <button onClick={deleteSelected} style={{
                  flex: 1, background: '#ef4444', color: '#fff', border: 'none',
                  borderRadius: 14, padding: '12px', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
