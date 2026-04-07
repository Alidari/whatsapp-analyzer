import { motion } from 'framer-motion'

export default function ExportGuide() {
  const steps = {
    ios: [
      { id: 1, text: "WhatsApp'ı açın ve ilgili sohbeti seçin." },
      { id: 2, text: "Kişi adına dokunarak 'Sohbeti Dışa Aktar'ı seçin." },
      { id: 3, text: "'Medyasız' seçeneğine tıklayın." },
      { id: 4, text: "Dosyayı telefonunuza kaydedin veya buraya yükleyin." }
    ],
    android: [
      { id: 1, text: "Sohbet ekranında sağ üstteki üç noktaya (⋮) dokunun." },
      { id: 2, text: "'Diğer' > 'Sohbeti dışa aktar'ı seçin." },
      { id: 3, text: "'Medya olmadan' seçeneğine tıklayın." },
      { id: 4, text: "Dosyayı telefonunuza kaydedin veya buraya yükleyin." }
    ]
  }

  return (
    <section id="how-to-export" className="py-20 px-4">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-label uppercase tracking-widest mb-4 inline-block"
        >
          Kullanım Rehberi
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight mb-6"
        >
          Sohbetinizi <span className="text-primary italic">Nasıl Dışa Aktarırsınız?</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-on-surface-variant max-w-2xl mx-auto font-label"
        >
          Anatomi, sadece metin tabanlı .txt dosyalarını analiz eder. Mesajlarınız uçtan uca şifrelidir ve asla sunucularımızda saklanmaz.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* iOS Card */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-3xl p-8 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
              <svg 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="w-8 h-8"
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .76-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
            </div>
            <h3 className="text-2xl font-headline font-bold">iOS (iPhone)</h3>
          </div>
          <div className="space-y-6">
            {steps.ios.map((step, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {step.id}
                </div>
                <p className="text-on-surface-variant font-label pt-1">{step.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Android Card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-3xl p-8 hover:border-tertiary/30 transition-colors"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-tertiary/20 flex items-center justify-center text-tertiary">
              <svg 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="w-8 h-8"
              >
                <path d="M17.523 15.3414C17.5109 15.7001 17.5458 16.0592 17.6258 16.4116C17.7057 16.7641 17.8282 17.102 17.9866 17.4087L18.8953 19.1672C19.0069 19.3831 19.0203 19.6337 18.9329 19.8631C18.8456 20.0924 18.6644 20.2801 18.4287 20.3845C18.193 20.4889 17.922 20.4939 17.6833 20.398C17.4447 20.3021 17.2561 20.1144 17.1593 19.877L16.29 18.1983C15.698 18.5772 15.0211 18.8105 14.3129 18.9192C13.5658 19.0346 12.8028 19.0346 12.0558 18.9192C11.3476 18.8105 10.6706 18.5772 10.0786 18.1983L9.20935 19.877C9.11195 20.0655 8.95674 20.22 8.76189 20.3226C8.56705 20.4251 8.34143 20.4712 8.11132 20.4556C7.8812 20.44 7.65706 20.3633 7.46513 20.2346C7.27319 20.1058 7.12154 19.9304 7.02804 19.7291C6.91572 19.5135 6.90161 19.263 6.98822 19.0336C7.07484 18.8041 7.25501 18.6163 7.48935 18.5113L8.40668 17.4087C8.56511 17.102 8.68761 16.7641 8.76755 16.4116C8.84749 16.0592 8.88236 15.7001 8.87035 15.3414V7.52504H17.523V15.3414ZM11.4117 11.2381C11.6669 11.2381 11.9116 11.1367 12.0921 10.9562C12.2725 10.7756 12.3739 10.531 12.3739 10.2757C12.3739 10.0205 12.2725 9.77587 12.0921 9.59533C11.9116 9.41479 11.6669 9.31337 11.4117 9.31337C11.1565 9.31337 10.9118 9.41479 10.7313 9.59533C10.5507 9.77587 10.4493 10.0205 10.4493 10.2757C10.4493 10.531 10.5507 10.7756 10.7313 10.9562C10.9118 11.1367 11.1565 11.2381 11.4117 11.2381ZM15.0047 11.2381C15.2599 11.2381 15.5046 11.1367 15.6851 10.9562C15.8656 10.7756 15.967 10.531 15.967 10.2757C15.967 10.0205 15.8656 9.77587 15.6851 9.59533C15.5046 9.41479 15.2599 9.31337 15.0047 9.31337C14.7495 9.31337 14.5048 9.41479 14.3243 9.59533C14.1438 9.77587 14.0423 10.0205 14.0423 10.2757C14.0423 10.531 14.1438 10.7756 14.3243 10.9562C14.5048 11.1367 14.7495 11.2381 15.0047 11.2381ZM16.8904 5.37877L18.156 3.18664C18.2325 3.05342 18.2618 2.89667 18.2393 2.74175C18.2167 2.58682 18.1438 2.44309 18.0322 2.33385C17.9205 2.2246 17.7771 2.15643 17.6253 2.14041C17.4735 2.1244 17.3226 2.16147 17.1973 2.24557C17.1471 2.27987 17.1023 2.32185 17.0647 2.37L15.7487 4.65004C14.8646 4.25471 13.9105 4.05067 12.9463 4.05337C11.9822 4.05067 11.0281 4.25471 10.1439 4.65004L8.82735 2.37C8.78972 2.32185 8.7449 2.27987 8.69468 2.24557C8.56942 2.16147 8.41846 2.1244 8.26663 2.14041C8.11479 2.15643 7.97136 2.2246 7.85969 2.33385C7.74801 2.44309 7.67512 2.58682 7.65261 2.74175C7.6301 2.89667 7.65939 3.05342 7.73599 3.18664L9.00168 5.37877C8.10626 5.92644 7.37563 6.67104 6.87968 7.55071H19.0124C18.5164 6.67104 17.7858 5.92644 16.8904 5.37877Z" />
              </svg>
            </div>
            <h3 className="text-2xl font-headline font-bold">Android</h3>
          </div>
          <div className="space-y-6">
            {steps.android.map((step, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {step.id}
                </div>
                <p className="text-on-surface-variant font-label pt-1">{step.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-12 text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-highest text-warning font-label text-sm">
          <span className="material-symbols-outlined text-lg">info</span>
          Dosyayı yüklemeden önce "Medya olmadan" seçeneğini seçtiğinizden emin olun.
        </div>
      </motion.div>
    </section>
  )
}
