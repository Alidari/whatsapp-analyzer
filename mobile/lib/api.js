/**
 * Anatomi — Backend API Client (React Native)
 *
 * Geliştirme: bilgisayarın LAN IP'si
 * Üretim: gerçek domain
 */
import * as FileSystem from 'expo-file-system/legacy'
import { getClientId } from './storage'

// ── Geliştirme sırasında bilgisayarının LAN IP'sini yaz ──
// Android emülatör için: 10.0.2.2
// iOS simülatör için: localhost
// Fiziksel cihaz için: bilgisayarın LAN IP'si (ör. 192.168.1.x)
const BASE_URL = __DEV__
  ? 'http://di4lk8fj11h9v512miuiq5ye.213.199.57.168.sslip.io'
  : 'http://di4lk8fj11h9v512miuiq5ye.213.199.57.168.sslip.io'

async function headers() {
  const clientId = await getClientId()
  return {
    'X-Client-ID': clientId,
    'X-API-Key': 'AnatomiSecureKey2026!',
  }
}

// ──────────────────────────────────────────────
//  Dosya Yükleme
// ──────────────────────────────────────────────

import { Platform } from 'react-native'

export async function uploadFile(fileUri, fileName, fileObj = null, resolvedMimeType = null) {
  const clientId = await getClientId()

  if (Platform.OS === 'web') {
    const formData = new FormData()
    if (fileObj) {
      formData.append('file', fileObj)
    } else {
      const res = await fetch(fileUri)
      const blob = await res.blob()
      formData.append('file', new File([blob], fileName || 'chat.txt', { type: 'text/plain' }))
    }

    const resp = await fetch(`${BASE_URL}/api/analyze`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Client-ID': clientId,
        'X-API-Key': 'AnatomiSecureKey2026!'
      },
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(err.detail || `Sunucu hatası (${resp.status})`)
    }
    return resp.json()
  }

  // Drive'dan gelen dosyalarda uzantı olmayabilir, MIME tipini elle belirliyoruz
  const nameLower = (fileName || '').toLowerCase()
  const mimeType = resolvedMimeType || (nameLower.endsWith('.zip') ? 'application/zip' : 'text/plain')
  // Dosya adının uzantısı yoksa backend'in doğru parse etmesi için ekleyelim
  const safeFileName = fileName
    ? fileName
    : mimeType === 'application/zip' ? 'chat.zip' : 'chat.txt'

  // Native upload
  const result = await FileSystem.uploadAsync(
    `${BASE_URL}/api/analyze`,
    fileUri,
    {
      fieldName: 'file',
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType?.MULTIPART ?? 1,
      headers: {
        'X-Client-ID': clientId,
        'X-API-Key': 'AnatomiSecureKey2026!'
      },
      mimeType: mimeType,
      parameters: {},
    }
  )

  if (result.status !== 202) {
    console.error('SERVER RESPONDED WITH ERROR: ', result.status, result.body)
    const err = JSON.parse(result.body || '{}')
    throw new Error(err.detail || `Sunucu hatası (${result.status})`)
  }

  return JSON.parse(result.body)
}

// ──────────────────────────────────────────────
//  Job Status Polling
// ──────────────────────────────────────────────

export async function checkJobStatus(jobId) {
  const resp = await fetch(`${BASE_URL}/api/status/${jobId}`, {
    headers: { 'X-API-Key': 'AnatomiSecureKey2026!' }
  })
  if (!resp.ok) {
    if (resp.status === 404) return { status: 'not_found' }
    throw new Error('Durum kontrolü başarısız.')
  }
  return resp.json()
}

// ──────────────────────────────────────────────
//  Health Check
// ──────────────────────────────────────────────

export async function healthCheck() {
  try {
    const resp = await fetch(`${BASE_URL}/api/health`, { timeout: 5000 })
    return resp.ok
  } catch {
    return false
  }
}

// ──────────────────────────────────────────────
//  History
// ──────────────────────────────────────────────

export async function hasHistory() {
  const h = await headers()
  const resp = await fetch(`${BASE_URL}/api/has-history`, { headers: h })
  if (!resp.ok) return false
  const data = await resp.json()
  return data.has_history
}

export async function getHistory() {
  const h = await headers()
  const resp = await fetch(`${BASE_URL}/api/history`, { headers: h })
  if (!resp.ok) throw new Error('Geçmiş yüklenemedi.')
  const data = await resp.json()
  return data.analyses || []
}

export async function getHistoryDetail(analysisId) {
  const h = await headers()
  const resp = await fetch(`${BASE_URL}/api/history/${analysisId}`, { headers: h })
  if (!resp.ok) throw new Error('Analiz detayı yüklenemedi.')
  return resp.json()
}

export async function deleteHistoryItem(analysisId) {
  const h = await headers()
  const resp = await fetch(`${BASE_URL}/api/history/${analysisId}`, {
    method: 'DELETE',
    headers: h,
  })
  return resp.ok
}

export async function renameHistoryItem(analysisId, newName) {
  const h = await headers()
  h['Content-Type'] = 'application/json'
  const resp = await fetch(`${BASE_URL}/api/history/${analysisId}/rename`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({ name: newName }),
  })
  return resp.ok
}

export async function deleteUserData() {
  const h = await headers()
  const resp = await fetch(`${BASE_URL}/api/user/data`, {
    method: 'DELETE',
    headers: h,
  })
  return resp.ok
}

// ──────────────────────────────────────────────
//  Ad & Quota Endpoints
// ──────────────────────────────────────────────

export async function earnQuota() {
  const h = await headers()
  const resp = await fetch(`${BASE_URL}/api/earn-quota`, {
    method: 'POST',
    headers: h,
  })
  return resp.ok
}

export async function unlockHistory(analysisId) {
  const h = await headers()
  const resp = await fetch(`${BASE_URL}/api/unlock-history/${analysisId}`, {
    method: 'POST',
    headers: h,
  })
  return resp.ok
}

export async function getSubscriptionStatus() {
  const h = await headers()
  const resp = await fetch(`${BASE_URL}/api/subscription-status`, { headers: h })
  if (!resp.ok) return { is_subscribed: false }
  return resp.json()
}

export async function verifySubscription(purchaseToken, productId) {
  const h = await headers()
  h['Content-Type'] = 'application/json'
  const resp = await fetch(`${BASE_URL}/api/verify-subscription`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ purchaseToken, productId }),
  })
  return resp.json()
}
