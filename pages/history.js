import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import siteConfig from '../site.config';
import { useToast } from './_app';

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
    const stored = localStorage.getItem('streamvault_history');
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        console.error('History parse error:', e);
      }
    }
  };

  const saveHistory = (newHistory) => {
    localStorage.setItem('streamvault_history', JSON.stringify(newHistory));
    setHistory(newHistory);
  };

  const deleteItem = (id) => {
    const updated = history.filter(item => item.id !== id);
    saveHistory(updated);
    setSelected(prev => prev.filter(s => s !== id));
    showToast('Download removed from history', 'success');
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
    a.download = `streamvault_history_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('History exported', 'success');
  };

  const reDownload = (item) => {
    window.open('/?url=' + encodeURIComponent(item.url), '_self');
  };

  const platforms = [...new Set(history.map(item => item.platform).filter(Boolean))];

  const filteredHistory = history
    .filter(item => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (filterPlatform !== 'all' && item.platform !== filterPlatform) return false;
      if (search) {
        const query = search.toLowerCase();
        return (
          item.title?.toLowerCase().includes(query) ||
          item.url?.toLowerCase().includes(query) ||
          item.platform?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.timestamp - a.timestamp;
      if (sortBy === 'oldest') return a.timestamp - b.timestamp;
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      return 0;
    });

  const stats = {
    total: history.length,
    video: history.filter(i => i.type === 'video').length,
    audio: history.filter(i => i.type === 'audio').length,
    thumbnail: history.filter(i => i.type === 'thumbnail').length,
    today: history.filter(i => {
      const today = new Date();
      const itemDate = new Date(i.timestamp);
      return itemDate.toDateString() === today.toDateString();
    }).length,
  };

  const toggleSelect = (id) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
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
        <meta name="description" content="View your download history" />
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
              <Link href="/bulk" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                <i className="fas fa-layer-group" style={{ marginRight: 6 }}></i>Bulk
              </Link>
              <Link href="/settings" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                <i className="fas fa-gear" style={{ marginRight: 6 }}></i>Settings
              </Link>
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
                <i className="fas fa-clock-rotate-left" style={{ color: 'var(--accent)', marginRight: 12 }}></i>
                Download History
              </h2>
              <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
                {history.length} total downloads
              </p>
            </div>
            {history.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={exportHistory}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <i className="fas fa-file-export" style={{ marginRight: 6 }}></i>Export
                </button>
                {selected.length > 0 && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    style={{
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 20px',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <i className="fas fa-trash" style={{ marginRight: 6 }}></i>
                    Delete ({selected.length})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          {history.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 12,
              marginBottom: 24,
            }}>
              {[
                { label: 'Total', value: stats.total, icon: 'fa-download', color: 'var(--accent)' },
                { label: 'Video', value: stats.video, icon: 'fa-video', color: '#3b82f6' },
                { label: 'Audio', value: stats.audio, icon: 'fa-music', color: '#10b981' },
                { label: 'Today', value: stats.today, icon: 'fa-calendar-day', color: '#8b5cf6' },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: 20, color: stat.color, marginBottom: 8 }}>
                    <i className={`fas ${stat.icon}`}></i>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          {history.length > 0 && (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 20,
              marginBottom: 24,
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-search" style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)',
                    fontSize: 14,
                  }}></i>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search history..."
                    style={{
                      width: '100%',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '10px 12px 10px 36px',
                      fontSize: 14,
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  minWidth: 130,
                }}
              >
                <option value="all">All Types</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="thumbnail">Thumbnail</option>
              </select>

              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  minWidth: 130,
                }}
              >
                <option value="all">All Platforms</option>
                {platforms.map(p => (
                  <option key={p} value={p} style={{ textTransform: 'capitalize' }}>{p}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  minWidth: 130,
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">By Title</option>
              </select>

              <button
                onClick={selectAll}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {selected.length === filteredHistory.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          )}

          {/* History List */}
          {filteredHistory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredHistory.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: selected.includes(item.id) ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    border: `1px solid ${selected.includes(item.id) ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 12,
                    padding: 16,
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleSelect(item.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: `2px solid ${selected.includes(item.id) ? 'var(--accent)' : 'var(--border)'}`,
                      background: selected.includes(item.id) ? 'var(--accent)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.2s',
                    }}>
                      {selected.includes(item.id) && (
                        <i className="fas fa-check" style={{ color: '#fff', fontSize: 10 }}></i>
                      )}
                    </div>

                    {item.thumbnail && (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        style={{
                          width: 80,
                          height: 56,
                          objectFit: 'cover',
                          borderRadius: 8,
                          flexShrink: 0,
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title || 'Untitled'}
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
                        <span style={{ textTransform: 'capitalize' }}>
                          <i className={`fab fa-${item.platform}`} style={{ marginRight: 4 }}></i>
                          {item.platform}
                        </span>
                        <span>
                          <i className={`fas fa-${item.type === 'video' ? 'video' : item.type === 'audio' ? 'music' : 'image'}`} style={{ marginRight: 4 }}></i>
                          {item.type}
                        </span>
                        {item.resolution && <span>{item.resolution}</span>}
                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => reDownload(item)}
                        title="Download Again"
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          color: 'var(--accent)',
                          fontSize: 13,
                        }}
                      >
                        <i className="fas fa-download"></i>
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.url);
                          showToast('URL copied', 'success');
                        }}
                        title="Copy URL"
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          color: 'var(--text-secondary)',
                          fontSize: 13,
                        }}
                      >
                        <i className="fas fa-copy"></i>
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        title="Delete"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          color: '#ef4444',
                          fontSize: 13,
                        }}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: 80,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 14,
            }}>
              <div style={{ fontSize: 64, marginBottom: 16, color: 'var(--text-tertiary)' }}>
                <i className="fas fa-clock-rotate-left"></i>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                No Download History
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
                Downloads will appear here once you start downloading videos
              </p>
              <Link
                href="/"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 24px',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'inline-block',
                }}
              >
                <i className="fas fa-download" style={{ marginRight: 8 }}></i>
                Start Downloading
              </Link>
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
                <i className="fas fa-search"></i>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                No Results Found
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </main>

        {/* Delete Modal */}
        {showDeleteModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 24,
            }}
            onClick={() => setShowDeleteModal(false)}
          >
            <div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 18,
                padding: 32,
                maxWidth: 400,
                width: '100%',
                boxShadow: 'var(--shadow-lg)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: 32, color: '#ef4444', marginBottom: 16, textAlign: 'center' }}>
                <i className="fas fa-triangle-exclamation"></i>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 8 }}>
                Delete {selected.length} item{selected.length > 1 ? 's' : ''}?
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 24 }}>
                This action cannot be undone
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  style={{
                    flex: 1,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '12px',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={deleteSelected}
                  style={{
                    flex: 1,
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
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
