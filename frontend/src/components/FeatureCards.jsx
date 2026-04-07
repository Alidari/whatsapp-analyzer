import { motion } from 'framer-motion'

const features = [
  {
    icon: 'dark_mode',
    title: 'Gece Kuşu',
    description: 'Gece 00:00 - 04:00 arası en çok mesaj atan siz misiniz? Uykusuz sohbetlerin liderini belirliyoruz.',
    label: 'AKTİVİTE ANALİZİ',
    labelIcon: 'trending_up',
    bgClass: 'bg-amber-300/10',
    textClass: 'text-amber-300',
  },
  {
    icon: 'history_edu',
    title: 'Roman Yazarı',
    description: 'Tek seferde en uzun mesajı kim yazdı? Kelime sayınızla bir roman oluşturabilir miydiniz?',
    label: 'DERİNLİK ANALİZİ',
    labelIcon: 'auto_stories',
    bgClass: 'bg-primary/10',
    textClass: 'text-primary',
  },
  {
    icon: 'volunteer_activism',
    title: 'Barış Elçisi',
    description: 'Sohbeti başlatan, buzları eriten ve en çok pozitif emoji kullanan taraf kim? Duygu analizi vakti.',
    label: 'SOSYAL DİNAMİKLER',
    labelIcon: 'favorite',
    bgClass: 'bg-tertiary/10',
    textClass: 'text-tertiary',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

export default function FeatureCards() {
  return (
    <section className="w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
        <div className="max-w-xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-headline font-bold tracking-tight mb-3"
          >
            Analizlerde Seni Ne Bekliyor?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-on-surface-variant text-sm"
          >
            Sıradan grafiklerin ötesine geçin. Sohbet dinamiklerinizi eğlenceli kişilik kartlarıyla tanımlıyoruz.
          </motion.p>
        </div>

        <div className="flex gap-2">
          <div className="w-10 h-10 rounded-full border border-outline-variant/20 flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </div>
          <div className="w-10 h-10 rounded-full border border-primary/40 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </div>
        </div>
      </div>

      {/* Cards */}
      <motion.div
        className="w-full grid grid-cols-1 md:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        {features.map((f) => (
          <motion.div
            key={f.title}
            variants={cardVariants}
            className="w-full glass-card rounded-2xl p-8 flex flex-col gap-5 relative overflow-hidden"
          >
            {/* Ambient glow */}
            <div className={`absolute -right-8 -top-8 w-32 h-32 ${f.bgClass} rounded-full blur-3xl opacity-30`} />

            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl ${f.bgClass} flex items-center justify-center`}>
              <span className={`material-symbols-outlined material-symbols-filled ${f.textClass} text-2xl`}>
                {f.icon}
              </span>
            </div>

            {/* Content */}
            <div>
              <h4 className="text-xl font-headline font-bold mb-2">{f.title}</h4>
              <p className="text-on-surface-variant text-sm leading-relaxed">{f.description}</p>
            </div>

            {/* Footer */}
            <div className={`mt-auto pt-4 flex items-center justify-between border-t border-outline-variant/10 text-[10px] font-label uppercase tracking-widest ${f.textClass}`}>
              {f.label}
              <span className="material-symbols-outlined text-sm">{f.labelIcon}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
