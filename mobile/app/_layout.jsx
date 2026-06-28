import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, Platform } from 'react-native'
import { useEffect, useRef } from 'react'
import { Colors } from '../lib/colors'
import { SubscriptionProvider } from '../components/SubscriptionContext'
import ErrorBoundary from '../components/ErrorBoundary'
import UpdateChecker from '../components/UpdateChecker'
import { CustomAlertRoot, customAlertRef } from '../components/CustomAlert'
import * as Notifications from 'expo-notifications'
import { registerPushToken } from '../lib/api'

// Bildirimleri ön planda da göster
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

async function setupPushNotifications() {
  if (Platform.OS === 'web') return null
  try {
    const isAvailable = await Notifications.isAvailableAsync().catch(() => false)
    if (!isAvailable) return null

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    // Eğer henüz izin istenmemişse, önce açıklama yap (Google Play kuralı)
    if (existingStatus === 'undetermined' || finalStatus === 'denied') {
      const alertShown = await new Promise((resolve) => {
        if (customAlertRef.current) {
          customAlertRef.current.alert(
            "Bildirim İzni 🔔",
            "Sohbet analizleriniz arka planda işlenirken bittiğinde size haber verebilmek için bildirim iznine ihtiyaç duyuyoruz. Bildirimleri sadece analiz durumu için kullanıyoruz.",
            [
              { text: "Şimdi Değil", style: "cancel", onPress: () => resolve(false) },
              { text: "Anladım", onPress: () => resolve(true) }
            ]
          )
        } else {
          // Ref hazır değilse bekletme, direkt devam et
          resolve(true)
        }
      })
      
      // Eğer kullanıcı "Anladım" dediyse veya ref yoksa sistem iznini iste
      if (alertShown) {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }
    }

    if (finalStatus !== 'granted') return null

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'fc720731-13a1-4b23-b498-938587705665',
    })
    const token = tokenData.data
    console.log('📲 Expo Push Token:', token)
    registerPushToken(token).catch(() => {})
    return token
  } catch (e) {
    console.log('💡 Push notification setup skipped (Native module missing or Expo Go)')
    return null
  }
}

export default function RootLayout() {
  const router = useRouter()
  const notifListenerRef = useRef(null)

  useEffect(() => {
    // Push token kur — customAlertRef'in mount olması için kısa gecikme
    const pushTimer = setTimeout(() => {
      setupPushNotifications()
    }, 1000)

    // Bildirime tıklama — loading ekranına yönlendir
    notifListenerRef.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data
      if (data?.screen === 'loading' || data?.job_id) {
        router.push('/loading')
      }
    })

    return () => {
      clearTimeout(pushTimer)
      if (notifListenerRef.current) {
        Notifications.removeNotificationSubscription(notifListenerRef.current)
      }
    }
  }, [])

  return (
    <ErrorBoundary>
      <SubscriptionProvider>
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
              animation: 'fade',
            }}
          />
          <UpdateChecker />
          <CustomAlertRoot ref={customAlertRef} />
        </View>
      </SubscriptionProvider>
    </ErrorBoundary>
  )
}
