# Google Play Pre-Launch Checklist

Bu dosya, uygulamanın Google Play Store'a yüklenmeden önce tamamlanması gereken adımları takip etmek amacıyla oluşturulmuştur.

## 🚨 Zorunlu Adımlar (Mandatory)
- [x] **Test Reklamlarını Kapatın**: `Ads.jsx` içerisindeki `FORCE_TEST_ADS` ayarı `false` yapıldı. (Üretim ortamında gerçek reklamlar gösterilecek).
- [x] **Google Play Veri Silme Linki**: Google Play'in yeni politikası gereğince web sitesinde `/delete-data` sayfası oluşturuldu ve kullanıcılara verilerini nasıl silebilecekleri anlatıldı.
- [x] **Eksik AdMob ID'si**: Geçiş reklamları (Interstitial) için geçici `TestIds.INTERSTITIAL` kullanılıyor. Eğer bu reklam türü kullanılacaksa, AdMob panelinden gerçek ID alınarak `Ads.jsx` dosyasına eklenmeli. *(Geçiş reklamı kullanılmadığı için atlandı).*
- [x] **Version Code Güncellemesi**: Daha önce test sürümü yüklendiyse, `app.json` içerisindeki `versionCode` değeri (örneğin 2) artırılmalıdır. *(Uygulama henüz v1 sürecinde olduğu için atlandı).*

## ⚠️ Şiddetle Tavsiye Edilenler (Highly Recommended)
- [x] **Çelişen Versiyon Numaraları**: `mobile/app/settings.jsx` dosyasında versiyon `1.0.0` yapılarak `app.json` ile eşitlendi. İki sürüm numarasının aynı olması kafa karışıklığını önler.
- [ ] **API Key Güvenliği**: `mobile/lib/api.js` içerisindeki `X-API-Key` gizlenmeli veya `.env` üzerinden yönetilmelidir.
- [ ] **Abonelik Backend Güvenliği**: Backend sunucusunda `google-service-key.json` eksikse her doğrulama başarılı döner. Sunucuda bu dosyanın olduğundan emin olunmalıdır.
- [x] **İzin Açıklamaları (Data Safety)**: Gereksiz olan `READ_EXTERNAL_STORAGE` ve `WRITE_EXTERNAL_STORAGE` izinleri `app.json` dosyasından tamamen kaldırıldı. Expo'nun dosya seçicisi (Document Picker) modern Android sürümlerinde bu izinlere ihtiyaç duymadan güvenli sistem arayüzünü (SAF) kullandığı için, Google Play'de bu izinlerle ilgili form doldurma ve red yeme riskiniz ortadan kaldırıldı!

## 💡 Opsiyonel (Optional)
- [ ] **IAP Hazırlıkları**: Play Console üzerinde ürünlerin ve aboneliklerin onaylanmış olması gerekir.
- [ ] **Yeni Mimari Testi**: `app.json`'da New Architecture aktif edildiği için, üretime çıkmadan önce fiziksel bir Android cihazda uygulamanın tamamen test edilmesi tavsiye edilir.
- [ ] **Gerçek Uygulama İkonları**: `assets` içerisindeki simgelerin Expo varsayılan ikonları yerine markaya ait ikonlarla değiştirildiğinden emin olun.
