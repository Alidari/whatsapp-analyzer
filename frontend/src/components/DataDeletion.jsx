import React, { useEffect } from 'react'
import { motion } from 'framer-motion'

export default function DataDeletion({ onClose }) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-screen w-full pt-32 pb-24 px-6 md:px-12"
    >
      <div className="max-w-4xl mx-auto bg-surface-container p-8 md:p-12 rounded-[32px] border border-white/5 shadow-2xl">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">
            Hesap ve Veri <span className="text-primary italic">Silme</span>
          </h1>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm font-bold transition-all border border-white/10"
          >
            Kapat
          </button>
        </div>

        <div className="space-y-8 text-on-surface-variant leading-relaxed text-lg">
          <section>
            <p>
              Anatomi uygulaması hesap oluşturmayı gerektirmez ve doğrudan cihaz tabanlı anonim bir sistemle çalışır. Ancak, sunucularımızda saklanmış olabilecek anonim analiz istatistiklerini (geçmiş sonuçlarınızı) ve kota verilerinizi tamamen sildirmek isterseniz bunu kolayca yapabilirsiniz. Google Play mağaza politikaları gereğince, verilerinizi silmeniz için iki yöntem sunuyoruz:
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">Yöntem 1: Uygulama Üzerinden Silme (En Hızlı Yöntem)</h2>
            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
              <ol className="list-decimal pl-6 space-y-2">
                <li>Anatomi mobil uygulamasını açın.</li>
                <li>Sağ üst köşedeki veya menüdeki <strong>Ayarlar (Çark İkonu)</strong> seçeneğine tıklayın.</li>
                <li>Gizlilik ve Veri menüsü altındaki <strong className="text-red-400">Verilerimi Temizle</strong> butonuna tıklayın.</li>
                <li>Karşınıza çıkan uyarı ekranında <strong>Hepsini Sil</strong> butonuna tıklayarak işlemi onaylayın.</li>
              </ol>
              <p className="mt-4 text-sm opacity-80">
                Bu işlem, hem cihazınızdaki tüm geçici verileri hem de sunucularımızdaki size ait olan tüm analiz geçmişini anında kalıcı olarak siler. Uygulama sıfırlanır ve ilk günkü haline döner.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">Yöntem 2: E-Posta İle Silme Talebi</h2>
            <p>
              Eğer uygulamayı cihazınızdan çoktan sildiyseniz veya yeniden yüklemek istemiyorsanız, veri silme işleminizi e-posta yoluyla da talep edebilirsiniz.
            </p>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 mt-4">
              <p className="mb-2">Aşağıdaki adrese bir e-posta göndererek verilerinizin silinmesini talep edebilirsiniz:</p>
              <p className="font-bold text-primary text-xl">bruhrecords1@gmail.com</p>
              <p className="mt-4 text-sm opacity-80">
                Konu kısmına "Veri Silme Talebi - Anatomi" yazmanız yeterlidir. E-posta adresiniz hiçbir pazarlama veya iletişim amacı için kaydedilmeyecek, sadece talebinizi doğrulamak için kullanılacaktır. Gelen talepler 14 gün içerisinde işleme alınarak size ait olabilecek anonim loglar kalıcı olarak temizlenir.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">Silinecek Veriler</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Geçmiş sohbet analizi istatistikleriniz ve kelime bulutları (Orijinal sohbetleriniz zaten <strong>asla</strong> saklanmaz).</li>
              <li>Reklam izleyerek kazandığınız analiz hakları (kotalar).</li>
              <li>Cihazınıza atanan anonim "Client ID" bağlantısı.</li>
            </ul>
            <p className="mt-4 text-red-400 text-sm font-bold">
              Uyarı: Veri silme işlemi geri alınamaz ve silinen analiz raporları kurtarılamaz.
            </p>
          </section>
        </div>
      </div>
    </motion.div>
  )
}
