import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const LOADER_MESSAGES = [
  { text: 'Mesajlarınız okunuyor...', icon: 'chat' },
  { text: "Gece 3'teki dertleşmeler analiz ediliyor...", icon: 'dark_mode' },
  { text: 'Kim daha çok trip atmış hesaplanıyor...', icon: 'mood_bad' },
  { text: 'Emojiler sayılıyor... 😍🔥😂', icon: 'mood' },
  { text: 'Yapay Zeka (NLP) modeli yükleniyor...', icon: 'smart_toy' },
  { text: 'Duygu transferleri haritalandırılıyor...', icon: 'psychology' },
  { text: 'Ghosting süreleri ölçülüyor...', icon: 'visibility_off' },
  { text: 'Roman yazarı belirleniyor...', icon: 'history_edu' },
  { text: 'Buzdolabı tespiti yapılıyor... 🧊', icon: 'ac_unit' },
  { text: 'Metinlerin ardındaki asıl niyet çözülüyor...', icon: 'policy' },
]

export default function LoadingOverlay() {
  const [currentMsg, setCurrentMsg] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMsg((prev) => (prev + 1) % LOADER_MESSAGES.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  const msg = LOADER_MESSAGES[currentMsg]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center"
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[120px]"
          animate={{
            x: [0, 100, -50, 0],
            y: [0, -80, 50, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-tertiary/10 blur-[100px]"
          animate={{
            x: [0, -60, 80, 0],
            y: [0, 60, -40, 0],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Pulsing logo */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-4xl font-headline font-black text-primary tracking-tighter"
        >
          Anatomi
        </motion.div>

        {/* Spinning ring */}
        <div className="relative w-24 h-24">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-t-2 border-primary"
            animate={{ rotate: -360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentMsg}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.3 }}
                className="material-symbols-outlined material-symbols-filled text-primary text-3xl"
              >
                {msg.icon}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Rotating text */}
        <AnimatePresence mode="wait">
          <motion.p
            key={currentMsg}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-xl font-headline font-bold text-on-background text-center max-w-md"
          >
            {msg.text}
          </motion.p>
        </AnimatePresence>

        {/* Info label for ML wait time */}
        <div className="text-on-background/50 text-sm font-label mt-2">
          (Yapay Zeka analiz süreci dosya boyutuna göre 1-2 dakika sürebilir)
        </div>

        {/* Shimmer bar */}
        <div className="w-64 h-1 rounded-full overflow-hidden bg-surface-container-high">
          <motion.div
            className="h-full w-2/5 rounded-full editorial-gradient"
            animate={{ x: ['-100%', '250%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </motion.div>
  )
}
