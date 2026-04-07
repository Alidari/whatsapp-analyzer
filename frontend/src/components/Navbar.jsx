import { motion } from 'framer-motion'

export default function Navbar({ activeView, onUploadClick, onStoriesClick, onDashboardClick, onHistoryClick }) {
  const isLanding = activeView === 'landing'

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-outline-variant/10"
    >
      <div className="wrapper flex justify-between items-center h-20">
        {/* Logo */}
        <div
          className="text-2xl font-black text-primary tracking-tighter font-headline cursor-pointer"
          onClick={onUploadClick}
        >
          Anatomi
        </div>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-10">
          <button
            onClick={onUploadClick}
            className={`font-headline font-bold text-sm tracking-wide transition-colors ${
              isLanding || activeView === 'dashboard'
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-background'
            }`}
          >
            Analiz
          </button>
          <button
            onClick={onHistoryClick}
            className={`font-headline font-bold text-sm tracking-wide transition-colors flex items-center gap-1.5 ${
              activeView === 'history'
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-background'
            }`}
          >
            <span className="material-symbols-outlined text-base">history</span>
            Geçmiş
          </button>
          <button
            onClick={onStoriesClick}
            disabled={!onStoriesClick}
            className={`font-headline font-bold text-sm tracking-wide transition-colors ${
              activeView === 'stories'
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-background'
            } ${!onStoriesClick ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            Hikayeler
          </button>
          <button
            onClick={onDashboardClick}
            disabled={!onDashboardClick}
            className={`font-headline font-bold text-sm tracking-wide transition-colors text-on-surface-variant hover:text-on-background ${
              !onDashboardClick ? 'opacity-30 cursor-not-allowed' : ''
            }`}
          >
            Panel
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={onUploadClick}
            className="editorial-gradient text-on-primary font-headline font-bold py-2 px-6 rounded-full text-sm hover:opacity-90 transition-opacity"
          >
            Veri Yükle
          </button>
        </div>
      </div>
    </motion.nav>
  )
}
