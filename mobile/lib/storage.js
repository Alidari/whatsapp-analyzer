import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import * as Application from 'expo-application'

const CLIENT_ID_KEY = 'anatomi_client_id'
const JOB_ID_KEY = 'anatomi_job_id'

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function getClientId() {
  if (Platform.OS === 'web') {
    let id = await AsyncStorage.getItem(CLIENT_ID_KEY)
    if (!id) {
      id = generateUUID()
      await AsyncStorage.setItem(CLIENT_ID_KEY, id)
    }
    return id
  }

  // Native: Kalıcı Cihaz Kimliği (SecureStore'da saklanır)
  // Not: Application.androidId Expo managed workflow'da null dönebilir,
  // bu yüzden her cihaza benzersiz UUID üretip kalıcı olarak saklıyoruz.
  try {
    let storedId = await SecureStore.getItemAsync(CLIENT_ID_KEY)
    if (!storedId) {
      // Android'de önce androidId'yi dene, yoksa UUID üret
      if (Platform.OS === 'android') {
        storedId = Application.androidId || null
      } else if (Platform.OS === 'ios') {
        storedId = await Application.getIosIdForVendorAsync()
      }
      // Hiçbiri yoksa güvenli UUID üret
      if (!storedId) storedId = generateUUID()
      await SecureStore.setItemAsync(CLIENT_ID_KEY, storedId)
    }
    return storedId
  } catch (e) {
    // SecureStore erişilemezse AsyncStorage'a düş
    console.warn('SecureStore erişilemedi, AsyncStorage kullanılıyor:', e)
    let id = await AsyncStorage.getItem(CLIENT_ID_KEY)
    if (!id) {
      id = generateUUID()
      await AsyncStorage.setItem(CLIENT_ID_KEY, id)
    }
    return id
  }
}

export async function getJobId() {
  return AsyncStorage.getItem(JOB_ID_KEY)
}

export async function setJobId(jobId) {
  return AsyncStorage.setItem(JOB_ID_KEY, jobId)
}

export async function clearJobId() {
  return AsyncStorage.removeItem(JOB_ID_KEY)
}

const ONBOARDING_KEY = 'anatomi_onboarding_done'

export async function hasSeenOnboarding() {
  const val = await AsyncStorage.getItem(ONBOARDING_KEY)
  return val === 'true'
}

export async function markOnboardingDone() {
  return AsyncStorage.setItem(ONBOARDING_KEY, 'true')
}

export async function clearAllData() {
  const keys = await AsyncStorage.getAllKeys()
  await AsyncStorage.multiRemove(keys)
  if (Platform.OS !== 'web') {
    try { await SecureStore.deleteItemAsync(CLIENT_ID_KEY) } catch {}
  }
}
