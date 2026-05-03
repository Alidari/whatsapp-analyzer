import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const MOOD_ICONS = {
  Romantic: '💕',
  Toxic: '🔥',
  Neutral: '⚖️',
  Chaotic: '🌪️',
  Chill: '☕',
  Balanced: '⚖️',
}

const MOOD_COLORS = {
  Romantic: 'from-pink-500/20 to-purple-500/20',
  Toxic: 'from-red-500/20 to-orange-500/20',
  Neutral: 'from-gray-500/20 to-slate-500/20',
  Chaotic: 'from-yellow-500/20 to-red-500/20',
  Chill: 'from-teal-500/20 to-blue-500/20',
  Balanced: 'from-emerald-500/20 to-cyan-500/20',
}

function formatDate(isoStr) {
  if (!isoStr) return '—'
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return isoStr.split('T')[0]
  }
}

function formatCreatedAt(isoStr) {
  if (!isoStr) return '—'
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return isoStr
  }
}

export default function AnalysisHistory({ clientId, onSelectAnalysis, onNewAnalysis }) {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(null)

  const fetchHistory = useCallback(async () => {
    try {
      const resp = await fetch('/api/history', {
        headers: { 
          'X-Client-ID': clientId,
          'X-API-Key': 'AnatomiSecureKey2026!'
        },
      })
      if (resp.ok) {
        const data = await resp.json()
        setAnalyses(data.analyses || [])
      }
    } catch (err) {
      console.error('History fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleDelete = async (id) => {
    try {
      const resp = await fetch(`/api/history/${id}`, {
        method: 'DELETE',
        headers: { 
          'X-Client-ID': clientId,
          'X-API-Key': 'AnatomiSecureKey2026!'
        },
      })
      if (resp.ok) {
        setAnalyses(prev => prev.filter(a => a.id !== id))
      }
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeleteConfirm(null)
    }
  }

  const handleRename = async (id) => {
    if (!editName.trim()) return
    try {
      const resp = await fetch(`/api/history/${id}/rename`, {
        method: 'PATCH',
        headers: {
          'X-Client-ID': clientId,
          'X-API-Key': 'AnatomiSecureKey2026!',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (resp.ok) {
        setAnalyses(prev =>
          prev.map(a => a.id === id ? { ...a, chat_name: editName.trim() } : a)
        )
      }
    } catch (err) {
      console.error('Rename error:', err)
    } finally {
      setEditingId(null)
      setEditName('')
    }
  }

  const handleSelect = async (id) => {
    setLoadingDetail(id)
    try {
      const resp = await fetch(`/api/history/${id}`, {
        headers: { 
          'X-Client-ID': clientId,
          'X-API-Key': 'AnatomiSecureKey2026!'
        },
      })
      if (resp.ok) {
        const data = await resp.json()
        onSelectAnalysis(data.result)
      }
    } catch (err) {
      console.error('Detail fetch error:', err)
    } finally {
      setLoadingDetail(null)
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center pt-24"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-on-surface-variant font-label text-sm">Geçmiş yükleniyor...</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="w-full pt-28 pb-32"
    >
      <div className="wrapper">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-headline font-black text-on-background tracking-tight">
              Geçmiş Analizler
            </h1>
            <p className="text-on-surface-variant text-sm mt-2 font-label">
              {analyses.length} analiz kaydedildi — sohbet içerikleri saklanmaz, yalnızca istatistikler.
            </p>
          </div>
          <button
            onClick={onNewAnalysis}
            className="editorial-gradient text-on-primary font-headline font-bold py-3 px-8 rounded-2xl text-sm hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 shrink-0"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Yeni Analiz
          </button>
        </div>

        {/* Empty State */}
        {analyses.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-3xl p-12 text-center"
          >
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-headline font-bold text-on-background mb-2">
              Henüz analiz yok
            </h3>
            <p className="text-on-surface-variant font-label text-sm mb-6">
              İlk WhatsApp sohbet dosyanı yükleyerek başla!
            </p>
            <button
              onClick={onNewAnalysis}
              className="editorial-gradient text-on-primary font-headline font-bold py-3 px-8 rounded-2xl text-sm hover:opacity-90 transition-opacity"
            >
              Analiz Başlat
            </button>
          </motion.div>
        )}

        {/* Analysis Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence>
            {analyses.map((analysis, i) => {
              const moodIcon = MOOD_ICONS[analysis.overall_mood] || '📊'
              const moodGradient = MOOD_COLORS[analysis.overall_mood] || 'from-gray-500/20 to-slate-500/20'
              const isDeleting = deleteConfirm === analysis.id
              const isEditing = editingId === analysis.id
              const isLoading = loadingDetail === analysis.id

              return (
                <motion.div
                  key={analysis.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className={`glass-card rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 ${
                    isLoading ? 'ring-2 ring-primary/50' : ''
                  }`}
                  onClick={() => !isDeleting && !isEditing && handleSelect(analysis.id)}
                >
                  {/* Mood Strip */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${moodGradient}`} />

                  <div className="p-5">
                    {/* Top Row: Name + Mood */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleRename(analysis.id)}
                              autoFocus
                              className="bg-surface-container-high border border-outline-variant/30 rounded-lg px-3 py-1.5 text-sm font-headline font-bold text-on-background w-full focus:outline-none focus:border-primary"
                            />
                            <button
                              onClick={() => handleRename(analysis.id)}
                              className="text-primary hover:text-primary-fixed transition-colors shrink-0"
                            >
                              <span className="material-symbols-outlined text-lg">check</span>
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setEditName('') }}
                              className="text-on-surface-variant hover:text-error transition-colors shrink-0"
                            >
                              <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                          </div>
                        ) : (
                          <h3 className="text-base font-headline font-bold text-on-background truncate">
                            {analysis.chat_name || 'İsimsiz Analiz'}
                          </h3>
                        )}
                      </div>
                      <div className="text-2xl shrink-0" title={analysis.mood_label}>
                        {moodIcon}
                      </div>
                    </div>

                    {/* Senders */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(analysis.sender_names || []).slice(0, 4).map((name, j) => (
                        <span
                          key={j}
                          className="bg-surface-container-high text-on-surface-variant text-xs font-label px-2.5 py-1 rounded-full"
                        >
                          {name}
                        </span>
                      ))}
                      {(analysis.sender_names || []).length > 4 && (
                        <span className="text-xs text-on-surface-variant font-label px-2 py-1">
                          +{analysis.sender_names.length - 4}
                        </span>
                      )}
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 text-xs text-on-surface-variant font-label mb-3">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">chat_bubble</span>
                        {(analysis.total_messages || 0).toLocaleString('tr-TR')} mesaj
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">date_range</span>
                        {formatDate(analysis.date_range_start)} — {formatDate(analysis.date_range_end)}
                      </div>
                    </div>

                    {/* Mood Label */}
                    {analysis.mood_label && (
                      <div className="text-xs font-label text-on-surface-variant/80 mb-3">
                        Genel Vibe: <span className="text-on-background font-medium">{analysis.mood_label}</span>
                      </div>
                    )}

                    {/* Bottom Row: Created At + Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                      <span className="text-[11px] text-on-surface-variant/60 font-label">
                        {formatCreatedAt(analysis.created_at)}
                      </span>

                      <div
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => { setEditingId(analysis.id); setEditName(analysis.chat_name || '') }}
                          className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors"
                          title="Yeniden adlandır"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>

                        {isDeleting ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(analysis.id)}
                              className="p-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors text-xs font-bold font-headline px-3"
                            >
                              Sil
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">close</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(analysis.id)}
                            className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors"
                            title="Sil"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Loading overlay */}
                    {isLoading && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
