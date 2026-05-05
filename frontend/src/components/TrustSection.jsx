import { motion } from 'framer-motion'

export default function TrustSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
      className="glass-card rounded-2xl p-12 md:p-20 text-center relative overflow-hidden"
    >
      {/* Top glow line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30" />

      <div className="max-w-3xl mx-auto relative z-10">
        <span className="material-symbols-outlined text-primary text-5xl mb-6 block">shield_lock</span>
        <h2 className="text-4xl font-headline font-bold mb-6">Gizliliğiniz Bizim Manifestomuz</h2>
        <p className="text-on-surface-variant text-lg leading-relaxed mb-10">
          Analiz süreci sırasında verileriniz sunucumuzda sadece RAM'de işlenir. 
          Hiçbir mesajınız kalıcı olarak kaydedilmez ve üçüncü partilerle paylaşılmaz.
        </p>
        <div className="flex flex-wrap justify-center gap-8">
          {[
            { icon: 'temp_preferences_custom', text: 'Geçici İşleme' },
            { icon: 'visibility_off', text: 'Anonim İşleme' },
            { icon: 'security', text: 'Uçtan Uca Güvenli' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2 text-primary font-label text-sm">
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
