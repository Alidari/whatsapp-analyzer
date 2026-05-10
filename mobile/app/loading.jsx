import { useEffect, useState, useRef } from 'react'
import { Alert, View, Text, StyleSheet, Animated } from 'react-native'
import { useRouter } from 'expo-router'
import { Colors } from '../lib/colors'
import { checkJobStatus, unlockHistory } from '../lib/api'
import { getJobId, clearJobId } from '../lib/storage'
import { showRewardedAsync, loadRewarded } from '../components/Ads'
import { useSubscription } from '../components/SubscriptionContext'

const MESSAGES = [
  { text: 'Mesajlarınız okunuyor...', icon: '💬' },
  { text: "Gece 3'teki dertleşmeler analiz ediliyor...", icon: '🌙' },
  { text: 'Kim daha çok trip atmış hesaplanıyor...', icon: '😤' },
  { text: 'Emojiler sayılıyor...', icon: '😍' },
  { text: 'Yapay Zeka modeli yükleniyor...', icon: '🤖' },
  { text: 'Duygu transferleri haritalandırılıyor...', icon: '🧠' },
  { text: 'Ghosting süreleri ölçülüyor...', icon: '👻' },
  { text: 'Roman yazarı belirleniyor...', icon: '✍️' },
  { text: 'Küfür raporu hazırlanıyor...', icon: '🤬' },
]

export default function LoadingScreen() {
  const router = useRouter()
  const [msgIndex, setMsgIndex] = useState(0)
  const spinAnim = useRef(new Animated.Value(0)).current
  const [pulseAnim] = useState(new Animated.Value(1))
  const [waitingForAd, setWaitingForAd] = useState(false)
  const { isSubscribed } = useSubscription()

  useEffect(() => {
    loadRewarded()
  }, [])

  // Rotating messages
  useEffect(() => {
    const interval = setInterval(() => {
      if (!waitingForAd) setMsgIndex((prev) => (prev + 1) % MESSAGES.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [waitingForAd])

  // Spin animation
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start()
  }, [])

  // Pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  // Job polling
  useEffect(() => {
    let active = true

    const poll = async () => {
      const jobId = await getJobId()
      if (!jobId) {
        if (!waitingForAd) router.replace('/')
        return
      }

      const interval = setInterval(async () => {
        if (!active || waitingForAd) return
        try {
          const data = await checkJobStatus(jobId)

          if (data.status === 'completed' && data.result) {
            clearInterval(interval)
            await clearJobId()
            setWaitingForAd(true)
            
            const proceed = () => {
              if (isSubscribed) {
                // Premium user: directly go to stories
                router.replace({
                  pathname: '/stories',
                  params: { data: JSON.stringify(data.result) },
                })
                return
              }

              // Show alert for Rewarded Ad
              Alert.alert(
                "Analiz Tamamlandı! 🎉",
                "Sohbet hikayeniz ve Wrapped sonuçlarınız hazır. Özelleştirilmiş raporunuzu şimdi görüntüleyebilirsiniz.",
                [
                  { 
                    text: 'Daha Sonra Sakla', 
                    style: 'cancel',
                    onPress: () => router.replace('/history') 
                  },
                  { 
                    text: 'Sonuçları Gör', 
                    onPress: async () => {
                      try {
                        const completed = await showRewardedAsync()
                        if (completed) {
                          await unlockHistory(data.result.analysis_id)
                          router.replace({
                            pathname: '/stories',
                            params: { data: JSON.stringify(data.result) },
                          })
                        } else {
                          router.replace('/history')
                        }
                      } catch (e) {
                        Alert.alert('Hata', e.message)
                        router.replace('/history')
                      }
                    } 
                  }
                ]
              )
            }

            const senders = data.result.parse_summary?.senders || [];
            if (senders.length === 2) {
              Alert.alert(
                "Sohbetteki Tarafını Seç",
                "Örnek sohbet gösterimlerinde doğru tarafı göstermemiz için hangisi olduğunu seçer misin?",
                [
                  { text: senders[0], onPress: () => { data.result.user_sender = senders[0]; proceed(); } },
                  { text: senders[1], onPress: () => { data.result.user_sender = senders[1]; proceed(); } }
                ],
                { cancelable: false }
              )
            } else {
              proceed()
            }
          } else if (data.status === 'error' || data.status === 'not_found') {
            clearInterval(interval)
            await clearJobId()
            if (data.error_detail) {
              Alert.alert('Analiz Başarısız', data.error_detail, [{ text: 'Tamam', onPress: () => router.replace('/') }])
            } else {
              router.replace('/')
            }
          }
        } catch (e) {
          // Ignore network blips
        }
      }, 3000)

      return () => clearInterval(interval)
    }
    
    if (!waitingForAd) poll()

    return () => { active = false }
  }, [waitingForAd])

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <View style={styles.container}>
      {/* Pulsing Logo */}
      <Animated.Text style={[styles.logo, { transform: [{ scale: pulseAnim }] }]}>
        Anatomi
      </Animated.Text>

      {/* Spinner */}
      <View style={styles.spinnerWrap}>
        <Animated.View style={[styles.spinnerRing, { transform: [{ rotate: spin }] }]} />
        <Text style={styles.spinnerIcon}>{MESSAGES[msgIndex].icon}</Text>
      </View>

      {/* Message */}
      <Text style={styles.message}>{MESSAGES[msgIndex].text}</Text>

      <Text style={styles.hint}>
        Yapay zeka analizi dosya boyutuna göre 1-2 dakika sürebilir
      </Text>

      {/* Shimmer bar */}
      <View style={styles.shimmerTrack}>
        <Animated.View style={styles.shimmerFill} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -1,
    marginBottom: 40,
  },
  spinnerWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  spinnerRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: Colors.primary + '30',
    borderTopColor: Colors.primary,
  },
  spinnerIcon: {
    fontSize: 36,
  },
  message: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: Colors.onSurfaceVariant + '80',
    textAlign: 'center',
    marginBottom: 32,
  },
  shimmerTrack: {
    width: 200,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  shimmerFill: {
    width: '40%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
})
