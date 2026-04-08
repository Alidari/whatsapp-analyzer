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

  // Native: Kalıcı Cihaz Kimliği
  if (Platform.OS === 'android') {
    return Application.androidId || 'unknown-android-id'
  }
  
  if (Platform.OS === 'ios') {
    let storedId = await SecureStore.getItemAsync(CLIENT_ID_KEY)
    if (!storedId) {
      storedId = await Application.getIosIdForVendorAsync()
      if (!storedId) storedId = generateUUID()
      await SecureStore.setItemAsync(CLIENT_ID_KEY, storedId)
    }
    return storedId
  }
  
  return generateUUID()
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
