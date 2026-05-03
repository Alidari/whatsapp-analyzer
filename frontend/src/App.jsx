import { useState, useCallback, useEffect, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import FeatureCards from './components/FeatureCards'
import VisualPreview from './components/VisualPreview'
import TrustSection from './components/TrustSection'
import Footer from './components/Footer'
import MobileNav from './components/MobileNav'
import LoadingOverlay from './components/LoadingOverlay'
import Dashboard from './components/Dashboard'
import StoryMode from './components/StoryMode'
import ExportGuide from './components/ExportGuide'
import RelationshipWheel from './components/RelationshipWheel'
import AnimatedBackground from './components/AnimatedBackground'
import AnalysisHistory from './components/AnalysisHistory'
import AdminPanel from './components/AdminPanel'

// ──────────────────────────────────────────────
//  Client ID — Anonim UUID yönetimi
// ──────────────────────────────────────────────
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // HTTPS olmayan (secure context dışı) ortamlarda fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function getClientId() {
  let id = localStorage.getItem('anatomi_client_id')
  if (!id) {
    id = generateUUID()
    localStorage.setItem('anatomi_client_id', id)
  }
  return id
}

function App() {
  const clientId = useMemo(() => getClientId(), [])
  const [activeView, setActiveView] = useState('initializing') // start with init
  const [analysisData, setAnalysisData] = useState(null)
  const [error, setError] = useState(null)

  // ──────────────────────────────────────────────
  //  Startup Check: History or Admin
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setActiveView('admin')
      return
    }

    const existingJob = localStorage.getItem('anatomi_job_id')
    if (existingJob) {
      // Resume an existing job
      setActiveView('loading')
      return
    }

    // Check for history
    async function checkHistory() {
      try {
        const resp = await fetch('/api/has-history', {
          headers: { 
            'X-Client-ID': clientId,
            'X-API-Key': 'AnatomiSecureKey2026!'
          },
        })
        if (resp.ok) {
          const data = await resp.json()
          if (data.has_history) {
            setActiveView('history')
            return
          }
        }
      } catch (err) {
        console.error('History check error:', err)
      }
      setActiveView('landing')
    }
    checkHistory()
  }, [clientId])

  // ──────────────────────────────────────────────
  //  Job Polling
  // ──────────────────────────────────────────────
  const checkJobStatus = useCallback(async (jobId) => {
    try {
      const resp = await fetch(`/api/status/${jobId}`, {
        headers: { 'X-API-Key': 'AnatomiSecureKey2026!' }
      })
      if (!resp.ok) {
        if (resp.status === 404) {
          localStorage.removeItem('anatomi_job_id')
          setError('İşlem zaman aşımına uğradı veya bulunamadı.')
          setActiveView('landing')
          return false
        }
        throw new Error('Durum kontrolü başarısız.')
      }

      const data = await resp.json()

      if (data.status === 'completed' && data.result) {
        localStorage.removeItem('anatomi_job_id')
        setAnalysisData(data.result)
        setActiveView('stories')
        return true // Stop polling
      } else if (data.status === 'error') {
        localStorage.removeItem('anatomi_job_id')
        setError(data.error_detail || 'Analiz sırasında sunucu hatası.')
        setActiveView('landing')
        return true
      }
      
      return false // Continue polling
    } catch (err) {
      console.error("Polling error:", err)
      return false // Ignore network blips during polling
    }
  }, [])

  // Auto resume job from local storage
  useEffect(() => {
    const existingJob = localStorage.getItem('anatomi_job_id')
    if (existingJob) {
      setActiveView('loading')
      
      const interval = setInterval(async () => {
        const done = await checkJobStatus(existingJob)
        if (done) clearInterval(interval)
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [checkJobStatus])

  // ──────────────────────────────────────────────
  //  File Upload
  // ──────────────────────────────────────────────
  const handleFileUpload = useCallback(async (file) => {
    setError(null)
    setActiveView('loading')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 
          'X-Client-ID': clientId,
          'X-API-Key': 'AnatomiSecureKey2026!'
        },
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `Sunucu hatası (${response.status})`)
      }

      const data = await response.json()
      if (!data.success || !data.job_id) {
        throw new Error('İşlem kuyruğa alınamadı.')
      }

      const jobId = data.job_id
      localStorage.setItem('anatomi_job_id', jobId)

      // Start polling for this newly created job
      const interval = setInterval(async () => {
        const done = await checkJobStatus(jobId)
        if (done) clearInterval(interval)
      }, 3000)
    } catch (err) {
      setError(err.message)
      setActiveView('landing')
    }
  }, [checkJobStatus, clientId])

  // ──────────────────────────────────────────────
  //  Navigation Handlers
  // ──────────────────────────────────────────────
  const handleBackToLanding = useCallback(() => {
    setActiveView('landing')
    setAnalysisData(null)
    setError(null)
  }, [])

  const handleShowStories = useCallback(() => {
    setActiveView('stories')
  }, [])

  const handleCloseStories = useCallback(() => {
    setActiveView('wheel')
  }, [])

  const handleFinishWheel = useCallback(() => {
    setActiveView('dashboard')
  }, [])

  const handleShowHistory = useCallback(() => {
    setActiveView('history')
  }, [])

  const handleSelectFromHistory = useCallback((result) => {
    setAnalysisData(result)
    setActiveView('dashboard')
  }, [])

  // ──────────────────────────────────────────────
  //  Render
  // ──────────────────────────────────────────────

  // Show nothing while initializing
  if (activeView === 'initializing') {
    return (
      <>
        <AnimatedBackground />
        <div className="min-h-screen w-full bg-transparent" />
      </>
    )
  }

  return (
    <>
      <AnimatedBackground />
      <div className="min-h-screen w-full text-on-background relative z-0 bg-transparent">
        <Navbar
          activeView={activeView}
          onUploadClick={() => {
            if (activeView !== 'landing') handleBackToLanding()
          }}
          onStoriesClick={analysisData ? handleShowStories : undefined}
          onDashboardClick={analysisData ? () => setActiveView('dashboard') : undefined}
          onHistoryClick={handleShowHistory}
        />

      <AnimatePresence mode="wait">
        {activeView === 'admin' && (
          <AdminPanel 
            key="admin" 
            onClose={() => {
              window.history.replaceState(null, '', '/')
              handleBackToLanding()
            }} 
          />
        )}

        {activeView === 'loading' && (
          <LoadingOverlay key="loading" />
        )}

        {activeView === 'history' && (
          <AnalysisHistory
            key="history"
            clientId={clientId}
            onSelectAnalysis={handleSelectFromHistory}
            onNewAnalysis={handleBackToLanding}
          />
        )}

        {activeView === 'landing' && (
          <main key="landing" className="w-full pt-32 pb-24">
            <div className="wrapper flex flex-col">
              <div className="py-16 md:py-24">
                <HeroSection onFileUpload={handleFileUpload} error={error} />
              </div>
              <div className="py-16 md:py-24">
                <FeatureCards />
              </div>
              <div className="py-16 md:py-24">
                <ExportGuide />
              </div>
              <div className="py-16 md:py-24">
                <VisualPreview />
              </div>
              <div className="py-16 md:py-24">
                <TrustSection />
              </div>
            </div>
          </main>
        )}

        {activeView === 'dashboard' && analysisData && (
          <Dashboard
            key="dashboard"
            data={analysisData}
            onShowStories={handleShowStories}
          />
        )}

        {activeView === 'stories' && analysisData && (
          <StoryMode
            key="stories"
            data={analysisData}
            onClose={handleCloseStories}
          />
        )}

        {activeView === 'wheel' && analysisData && (
          <RelationshipWheel
            key="wheel"
            data={analysisData}
            onFinish={handleFinishWheel}
          />
        )}
      </AnimatePresence>

      {activeView !== 'stories' && activeView !== 'wheel' && <Footer />}
      {activeView !== 'stories' && activeView !== 'wheel' && (
        <MobileNav
          activeView={activeView}
          onAnalyze={() => activeView !== 'landing' ? handleBackToLanding() : null}
          onStories={analysisData ? handleShowStories : undefined}
          onDashboard={analysisData ? () => setActiveView('dashboard') : undefined}
          onHistory={handleShowHistory}
        />
      )}
      </div>
    </>
  )
}

export default App
