import React, { useEffect } from 'react'
import { motion } from 'framer-motion'

export default function PrivacyPolicy({ onClose }) {
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
            Gizlilik <span className="text-primary italic">Politikası</span>
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
            <h2 className="text-2xl font-bold text-on-surface mb-4">1. Giriş</h2>
            <p>
              Anatomi ("biz", "tarafımızca" veya "uygulama"), kullanıcılarımızın gizliliğine son derece önem vermektedir. 
              Bu Gizlilik Politikası, WhatsApp Sohbet Analizi hizmetimizi kullanırken verilerinizin nasıl işlendiğini, 
              hangi verilerin toplandığını (ve toplanmadığını) açıklar. Google Play Store ve web standartlarına tam uyumlu olarak hazırlanmıştır.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">2. Veri İşleme Prensibi: %100 Yerel ve Geçici</h2>
            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
              <p className="font-bold text-primary mb-2 italic">En Kritik Kuralımız:</p>
              <p>
                Yüklediğiniz WhatsApp sohbet metinleri (.txt veya .zip) sunucularımızda **ASLA kalıcı olarak saklanmaz.** 
                Dosyanız sunucuya ulaştığında yalnızca analiz edilmek üzere belleğe (RAM) alınır ve analiz tamamlandığı anda 
                (veya bir hata oluştuğunda) sistemden tamamen silinir.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">3. Toplanan Veriler</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>İstatistiksel Metrikler:</strong> Analiz sonucunda oluşan sayısal veriler (mesaj sayıları, kelime frekansları, duygu skorları) geçmişinizi görebilmeniz için veritabanımızda saklanır.</li>
              <li><strong>Cihaz Tanımlayıcı (Client ID):</strong> Geçmiş analizlerinize sadece sizin cihazınızdan erişilebilmesi için anonim bir cihaz kimliği kullanılır. Bu veri kişisel kimlik bilgilerinizle (isim, e-posta, telefon) eşleştirilmez.</li>
              <li><strong>Log Kayıtları:</strong> Uygulama performansını iyileştirmek için anonim hata logları ve kullanım istatistikleri toplanabilir.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">4. Reklamlar ve Üçüncü Taraflar</h2>
            <p>
              Uygulamamız Google AdMob reklam ağını kullanmaktadır. Reklam gösterimi sırasında Google, ilgi alanınıza yönelik 
              reklamlar sunmak için cihazınızın reklam kimliğini (Advertising ID) kullanabilir. Bu işlem Google'ın kendi 
              gizlilik politikasına tabidir.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">5. Veri Güvenliği</h2>
            <p>
              Verileriniz endüstri standardı olan SSL/TLS şifreleme ile iletilir. Sunucularımız düzenli olarak güncellenmekte 
              ve güvenlik taramalarından geçirilmektedir. Orijinal sohbet metinleriniz kaydedilmediği için olası bir veri 
              sızıntısında kişisel yazışmalarınızın risk altında olması teknik olarak mümkün değildir.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">6. Çocukların Gizliliği</h2>
            <p>
              Hizmetimiz 13 yaş altındaki çocuklara yönelik değildir. Bilerek 13 yaş altındaki çocuklardan veri toplamıyoruz. 
              Eğer bir çocuğun bize veri gönderdiğini fark ederseniz lütfen bizimle iletişime geçin.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">7. İletişim</h2>
            <p>
              Bu politika hakkında sorularınız için bizimle şu adresten iletişime geçebilirsiniz: <br />
              <span className="text-primary font-bold">destek@anatomi.app</span>
            </p>
          </section>

          <div className="pt-12 border-t border-white/5 text-sm opacity-50">
            Son Güncelleme: 4 Mayıs 2026
          </div>
        </div>
      </div>
    </motion.div>
  )
}
