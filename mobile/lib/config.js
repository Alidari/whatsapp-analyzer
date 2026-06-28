/**
 * Anatomi — Uygulama Yapılandırması
 *
 * ⚠️  GÜVENLİK NOTU:
 * Bu dosyadaki API_KEY istemci tarafında tutulmaktadır ve APK decompile
 * edildiğinde görülebilir. Bu yalnızca temel bir rate-limit anahtarıdır.
 * Hassas işlemler için backend tarafında token-based auth kullanılmalıdır.
 *
 * Gelecekte bu değer bir ortam değişkeni veya expo-secure-store'dan
 * okunmalıdır.
 */

// ── API Base URL ──
// Geliştirme: bilgisayarın LAN IP'si
// Üretim: gerçek domain
export const API_BASE_URL = 'https://anatomi-api.alidari.dev'
// export const API_BASE_URL = 'http://192.168.1.38:8000'

// ── API Key ──
// TODO: Bu anahtarı ortam değişkeni veya secure storage'a taşı
export const API_KEY = 'AnatomiSecureKey2026!'
