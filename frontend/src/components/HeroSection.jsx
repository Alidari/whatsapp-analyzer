import { useCallback, useState, useRef } from 'react'
import { motion } from 'framer-motion'

export default function HeroSection({ onFileUpload, error }) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].name.endsWith('.txt')) {
      onFileUpload(files[0])
    }
  }, [onFileUpload])

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0]
    if (file) {
      onFileUpload(file)
    }
  }, [onFileUpload])

  return (
    <section className="w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
      {/* Hero Text */}
      <motion.div
        className="w-full lg:w-1/2 text-center lg:text-left"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-highest text-primary font-label text-xs mb-8 border border-outline-variant/15">
          <span className="material-symbols-outlined text-sm material-symbols-filled">
            verified_user
          </span>
          Analiz %100 cihazınızda gerçekleşir.
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-headline font-extrabold tracking-tighter text-on-background leading-none mb-8">
          Sohbetinizin
          <br />
          <span className="text-primary italic">Anatomisi</span>
        </h1>

        <p className="text-lg text-on-surface-variant leading-relaxed max-w-lg mx-auto lg:mx-0">
          WhatsApp geçmişinizi eğlenceli verilerle keşfedin. Dijital hafızanızdaki örüntüleri,
          favori kelimelerinizi ve iletişim karakterinizi bir editör titizliğiyle görselleştiriyoruz.
        </p>
      </motion.div>

      {/* Upload Zone */}
      <motion.div
        className="w-full lg:w-1/2"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={`w-full glass-card rounded-3xl p-12 md:p-20 flex flex-col items-center justify-center text-center border-dashed border-2 min-h-[440px] transition-colors cursor-pointer ${
            isDragging
              ? 'border-primary/80 bg-primary/5'
              : 'border-outline-variant/30 hover:border-primary/40'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">
              {isDragging ? 'download' : 'upload_file'}
            </span>
          </div>

          <h3 className="text-2xl font-headline font-bold mb-2">
            {isDragging ? 'Dosyanı Bırak!' : 'Sohbet Dosyanı Bırak'}
          </h3>
          <p className="text-on-surface-variant mb-8 text-sm max-w-xs">
            WhatsApp'tan dışa aktardığın .txt dosyasını buraya sürükle veya seç.
          </p>

          <button
            className="editorial-gradient text-on-primary font-headline font-bold py-3 px-10 rounded-full text-base hover:opacity-90 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
          >
            Dosya Seç
          </button>

          {error && (
            <div className="mt-6 px-4 py-3 rounded-xl bg-error-container/20 border border-error/30 text-error text-sm max-w-md">
              ⚠️ {error}
            </div>
          )}

          <div className="mt-8 flex items-center gap-4 text-xs font-label text-on-surface-variant/50">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">check_circle</span>
              Uçtan uca güvenli
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">check_circle</span>
              Gizlilik odaklı
            </span>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
