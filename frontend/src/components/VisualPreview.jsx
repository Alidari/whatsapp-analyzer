import { motion } from 'framer-motion'

export default function VisualPreview() {
  const floatingWords = [
    { text: 'Merhaba', x: '20%', y: '20%', size: 'text-lg', rotate: -15, color: 'text-primary/60' },
    { text: 'Tamam', x: '60%', y: '15%', size: 'text-sm', rotate: 10, color: 'text-on-surface-variant/40' },
    { text: 'Haha', x: '75%', y: '40%', size: 'text-2xl', rotate: 5, color: 'text-tertiary/60' },
    { text: 'Naber?', x: '15%', y: '55%', size: 'text-xl', rotate: -5, color: 'text-secondary/60' },
    { text: 'Görüşürüz', x: '50%', y: '75%', size: 'text-xs', rotate: 20, color: 'text-on-surface-variant/30' },
    { text: '🔥', x: '35%', y: '40%', size: 'text-3xl', rotate: 0, color: '' },
    { text: '❤️', x: '65%', y: '60%', size: 'text-2xl', rotate: -10, color: '' },
    { text: 'Süper', x: '25%', y: '80%', size: 'text-sm', rotate: -10, color: 'text-primary/40' },
  ]

  return (
    <section className="w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
      {/* Left Column: Visual Preview Card */}
      <motion.div
        className="relative order-2 lg:order-1"
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Main Preview Card */}
        <div className="w-full aspect-square bg-surface-container-low rounded-[3rem] p-4 border-[12px] border-surface-container shadow-2xl relative overflow-visible">
          {/* Simulated Chart/Visual Content */}
          <div className="w-full h-full bg-background rounded-[2.2rem] p-10 flex flex-col relative overflow-hidden">
            {/* Window Controls */}
            <div className="flex items-center gap-2 mb-10">
              <div className="w-2.5 h-2.5 rounded-full bg-error-container" />
              <div className="w-2.5 h-2.5 rounded-full bg-primary-container" />
              <div className="w-2.5 h-2.5 rounded-full bg-tertiary-container" />
              <div className="ml-4 h-px flex-grow bg-outline-variant/10" />
            </div>

            {/* Data Visualization Area */}
            <div className="flex-grow relative w-full">
              {/* Central Hub */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 blur-xl animate-pulse-glow" />
                <span className="material-symbols-outlined text-primary text-4xl font-black">hub</span>
              </div>

              {/* Connecting Lines (Simulated) */}
              <svg className="absolute inset-0 w-full h-full opacity-10" stroke="currentColor">
                <line x1="20%" y1="20%" x2="50%" y2="50%" strokeDasharray="4 4" />
                <line x1="60%" y1="15%" x2="50%" y2="50%" strokeDasharray="4 4" />
                <line x1="75%" y1="40%" x2="50%" y2="50%" strokeDasharray="4 4" />
                <line x1="15%" y1="55%" x2="50%" y2="50%" strokeDasharray="4 4" />
              </svg>

              {/* Floating Data Words */}
              {floatingWords.map((word, i) => (
                <motion.div
                  key={i}
                  className={`absolute font-headline font-bold ${word.size} ${word.color} whitespace-nowrap`}
                  style={{ top: word.y, left: word.x, rotate: `${word.rotate}deg` }}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 + 0.5, duration: 0.5 }}
                >
                  {word.text}
                </motion.div>
              ))}

              {/* Mini Charts Bottom */}
              <div className="absolute bottom-4 left-0 right-0 flex items-end justify-center gap-1.5 opacity-30">
                {[30, 60, 45, 90, 50, 70, 40].map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-primary rounded-t-full"
                    initial={{ height: 0 }}
                    whileInView={{ height: h }}
                    transition={{ delay: 1, duration: 0.8 }}
                  />
                ))}
              </div>
            </div>
            
            {/* Header Text Area */}
            <div className="mt-8 pt-6 border-t border-outline-variant/5 flex flex-col gap-2">
              <div className="h-2.5 w-32 bg-surface-container-highest rounded-full" />
              <div className="h-2 w-48 bg-surface-container-highest/40 rounded-full" />
            </div>
          </div>

          {/* Floating Insight Capsule */}
          <motion.div
            className="absolute -bottom-8 -right-4 md:right-8 bg-surface-container-highest border border-outline-variant/20 p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-20 max-w-[220px]"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="text-primary text-3xl font-headline font-black mb-1">42,042</div>
            <div className="text-xs text-on-surface-variant font-label leading-relaxed font-semibold">
              Toplam mesaj sayısı. Bu yaklaşık 500 sayfalık bir kitap demek!
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Column: Text Content */}
      <motion.div
        className="order-1 lg:order-2"
        initial={{ opacity: 0, x: 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-headline font-bold tracking-tight mb-12 leading-tight">
          Hikayenizi Verilerle <br />
          <span className="text-tertiary italic">Anlatın</span>
        </h2>

        <div className="flex flex-col gap-10">
          {[
            {
              icon: 'analytics',
              title: 'Detaylı Kelime Bulutu',
              desc: 'En çok kullandığınız 100 kelimeyi estetik bir görsel şölen eşliğinde keşfedin.',
              bg: 'bg-primary/10',
              color: 'text-primary',
            },
            {
              icon: 'schedule',
              title: 'Zaman Çizelgesi',
              desc: 'Yıllar içindeki sohbet yoğunluğunuzu mevsimsel ve aylık grafiklerle takip edin.',
              bg: 'bg-sky-400/10',
              color: 'text-sky-300',
            },
            {
              icon: 'mood',
              title: 'Emoji Karnesi',
              desc: 'En favori emojileriniz ve onların sohbetinize kattığı duygu tonları.',
              bg: 'bg-tertiary/10',
              color: 'text-tertiary',
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-6 group">
              <div className={`w-12 h-12 shrink-0 rounded-full ${item.bg} flex items-center justify-center ${item.color} transition-all group-hover:scale-110 shadow-lg shadow-black/10`}>
                <span className="material-symbols-outlined text-2xl">{item.icon}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <h5 className="text-xl font-headline font-bold text-on-surface">{item.title}</h5>
                <p className="text-on-surface-variant text-base leading-relaxed max-w-sm">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
