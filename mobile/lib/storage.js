import AsyncStorage from '@react-native-async-storage/async-storage'

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
  let id = await AsyncStorage.getItem(CLIENT_ID_KEY)
  if (!id) {
    id = generateUUID()
    await AsyncStorage.setItem(CLIENT_ID_KEY, id)
  }
  return id
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
