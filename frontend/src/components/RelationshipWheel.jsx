import { useState, useEffect } from 'react'
import { motion, useAnimation, AnimatePresence } from 'framer-motion'

const RELATIONSHIP_TYPES = [
  { id: 'romantic', label: 'Sevgi Dolu', icon: 'favorite', color: '#59dcb5', description: 'Gözlerinizden kalpler fışkırıyor! 💕' },
  { id: 'toxic', label: 'Toksik', icon: 'fire_repository', iconFallback: 'local_fire_department', color: '#ffb4ab', description: 'Biraz yakıcı bir aşk, dikkat! 🔥' },
  { id: 'tense', label: 'Gergin', icon: 'thunderstorm', color: '#bbc3ff', description: 'Şimşekler çakıyor, sakinleşme vakti. ⛈️' },
  { id: 'friendly', label: 'Arkadaşçıl', icon: 'group', color: '#f8acff', description: 'Sarsılmaz bir dostluk bağı! 🤝' },
  { id: 'neutral', label: 'Nötr', icon: 'balance', color: '#bec9c5', description: 'Dengeli ve sakin bir iletişim. ⚖️' },
  { id: 'chaotic', label: 'Kaotik', icon: 'cyclone', color: '#ffb4ab', description: 'Deli dolu, ne olacağı belli değil! 🌪️' },
]

export default function RelationshipWheel({ data, onFinish }) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const controls = useAnimation()

  const calculateResult = () => {
    const m = data.metrics
    const mood = m.vibe_check.overall_mood // Romantic, Toxic, Chaotic, Chill, Balanced
    const tension = m.argument_score.tension_index

    if (mood === 'Romantic' && tension < 40) return 'romantic'
    if (mood === 'Toxic' || (mood === 'Romantic' && tension >= 50)) return 'toxic'
    if (tension > 60) return 'tense'
    if (mood === 'Chill' || mood === 'Balanced') return 'friendly'
    if (mood === 'Chaotic') return 'chaotic'
    return 'neutral'
  }

  const spinWheel = async () => {
    if (isSpinning) return
    setIsSpinning(true)

    const targetId = calculateResult()
    const targetIndex = RELATIONSHIP_TYPES.findIndex(t => t.id === targetId)
    
    // Each segment is 360 / length
    const segmentAngle = 360 / RELATIONSHIP_TYPES.length
    // Target angle: multiple full rotations + offset for the segment
    // We want the arrow to point at the center of the segment
    const randomRotations = 5 + Math.floor(Math.random() * 5)
    // Result is at 12 o'clock, which is 0 degrees.
    // Our wheel segments are placed around 0.
    const targetAngle = (randomRotations * 360) - (targetIndex * segmentAngle)

    await controls.start({
      rotate: targetAngle,
      transition: { duration: 5, ease: [0.12, 0.8, 0.3, 1] }
    })

    setResult(RELATIONSHIP_TYPES[targetIndex])
    setIsSpinning(false)
    setShowResult(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="max-w-md w-full">
        <motion.h2
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl font-headline font-black mb-2"
        >
          İlişki <span className="text-primary">Anatomisi</span>
        </motion.h2>
        <p className="text-on-surface-variant font-label text-sm mb-12">
          Verileriniz incelendi. Bakalım aranızdaki bağ hangi türden?
        </p>

        <div className="relative w-72 h-72 md:w-80 md:h-80 mx-auto mb-16">
          {/* Arrow Indicator */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 w-8 h-8 text-primary drop-shadow-glow">
             <span className="material-symbols-outlined text-4xl leading-none">arrow_drop_down</span>
          </div>

          {/* Wheel */}
          <motion.div
            animate={controls}
            className="w-full h-full rounded-full border-8 border-surface-container-highest shadow-2xl relative overflow-hidden bg-surface-container-low"
            style={{ rotate: 0 }}
          >
            {RELATIONSHIP_TYPES.map((type, i) => {
              const rotation = i * (360 / RELATIONSHIP_TYPES.length)
              return (
                <div
                  key={type.id}
                  className="absolute top-0 left-1/2 -ml-[1px] w-[2px] h-1/2 origin-bottom flex flex-col items-center"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    height: '50%',
                  }}
                >
                  <div 
                    className="absolute top-4 flex flex-col items-center gap-1"
                    style={{ transform: `rotate(${-rotation}deg)` }} // Counter-rotate icons
                  >
                    <span className="material-symbols-outlined text-2xl" style={{ color: type.color }}>
                      {type.icon === 'fire_repository' ? type.iconFallback : type.icon}
                    </span>
                  </div>
                  {/* Segment dividers */}
                  <div className="w-[1px] h-full bg-surface-container-highest origin-bottom" style={{ transform: `rotate(${360 / RELATIONSHIP_TYPES.length / 2}deg)` }} />
                </div>
              )
            })}
          </motion.div>

          {/* Center Center */}
          <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-surface-container-highest border-4 border-background flex items-center justify-center shadow-lg">
             <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.button
              key="spin-btn"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={spinWheel}
              disabled={isSpinning}
              className="editorial-gradient text-on-primary font-headline font-bold py-4 px-12 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
            >
              {isSpinning ? 'Analiz Ediliyor...' : 'Çarkı Çevir! ✨'}
            </motion.button>
          ) : (
            <motion.div
              key="result"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="space-y-4"
            >
              <div className="p-6 rounded-3xl bg-surface-container-high border border-outline-variant/20 shadow-2xl">
                <div className="text-5xl mb-2" style={{ color: result.color }}>
                   <span className="material-symbols-outlined text-6xl material-symbols-filled">
                    {result.icon === 'fire_repository' ? result.iconFallback : result.icon}
                   </span>
                </div>
                <h3 className="text-3xl font-headline font-black mb-1">{result.label}</h3>
                <p className="text-on-surface-variant font-label text-sm">{result.description}</p>
              </div>

              <button
                onClick={onFinish}
                className="w-full bg-surface-container-highest text-on-surface font-headline font-bold py-4 px-8 rounded-2xl hover:bg-surface-container-lowest transition-all"
              >
                Tüm Detayları Gör
                <span className="material-symbols-outlined ml-2 text-sm">arrow_forward</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
