import { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, Animated, AppState, TouchableOpacity } from 'react-native'
import { CustomAlert as Alert } from '../components/CustomAlert'
import { useRouter } from 'expo-router'
import { Colors } from '../lib/colors'
import { checkJobStatus, unlockHistory } from '../lib/api'
import { getJobId, clearJobId } from '../lib/storage'
import { showRewardedAsync, loadRewarded } from '../components/Ads'
import { Ionicons } from "@expo/vector-icons"
import { useSubscription } from '../components/SubscriptionContext'

// ── Durum Konfigürasyonları ──
const STATUS_CONFIG = {
  queued: {
    icon: '🟡',
    title: 'Sırada Bekleniyor',
    color: '#F59E0B',
    desc: (pos) => pos > 1
      ? `${pos - 1} kişi önünüzde bekliyor. Sıraya girdiniz!`
      : 'Neredeyse sıranız! Başlamak üzere...',
  },
  processing_parsing: {
    icon: '💬',
    title: 'Mesajlar Okunuyor',
    color: Colors.primary,
    desc: () => 'Sohbet geçmişiniz işleniyor...',
  },
  processing_nlp: {
    icon: '🧠',
    title: 'Yapay Zeka Analiz Ediyor',
    color: '#8B5CF6',
    desc: () => 'Duygu analizi, kelime örüntüleri ve grup dinamikleri hesaplanıyor...',
  },
  completed: {
    icon: '✅',
    title: 'Analiz Tamamlandı!',
    color: '#10B981',
    desc: () => 'Sonuçlarınız hazır!',
  },
  error: {
    icon: '❌',
    title: 'Hata Oluştu',
    color: '#EF4444',
    desc: () => 'Analiz sırasında bir sorun çıktı.',
  },
}

const FUN_MESSAGES = [
  { text: "Gece 3'teki dertleşmeler analiz ediliyor...", icon: '🌙' },
  { text: 'Kim daha çok trip atmış hesaplanıyor...', icon: '😤' },
  { text: 'Emojiler sayılıyor...', icon: '😍' },
  { text: 'Ghosting süreleri ölçülüyor...', icon: '👻' },
  { text: 'Roman yazarı belirleniyor...', icon: '✍️' },
]

const GROUP_FUN_MESSAGES = [
  { text: 'Grup karakterleri tespit ediliyor...', icon: '🎭' },
  { text: 'Sticker canavarı aranıyor...', icon: '🎨' },
  { text: 'En çok küfür eden belirleniyor...', icon: '🤬' },
  { text: 'Grubun en sessizi (Ağzı var dili yok) aranıyor...', icon: '😶' },
  { text: 'Grup sözcüsü seçiliyor...', icon: '📢' },
  { text: 'Gece kuşları listeleniyor...', icon: '🦉' },
  { text: 'Görülmedi atanların listesi tutuluyor...', icon: '👀' },
]

export default function LoadingScreen() {
  const router = useRouter()
  const [jobStatus, setJobStatus] = useState('queued')
  const [isGroup, setIsGroup] = useState(false)
  const [queuePosition, setQueuePosition] = useState(null)
  const [estimatedSeconds, setEstimatedSeconds] = useState(null)
  const [statusLabel, setStatusLabel] = useState('Başlatılıyor...')
  const [funMsgIdx, setFunMsgIdx] = useState(0)
  const [waitingForAd, setWaitingForAd] = useState(false)
  const [isBackground, setIsBackground] = useState(false)
  const [completedData, setCompletedData] = useState(null)
  const { isSubscribed } = useSubscription()
  
  const spinAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const iconScaleAnim = useRef(new Animated.Value(1)).current
  const jobDataRef = useRef(null)
  const pollingRef = useRef(null)
  const appStateRef = useRef(AppState.currentState)

  useEffect(() => { loadRewarded() }, [])

  // Fun mesajlar (analiz süresince)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!waitingForAd && ['processing_parsing', 'processing_nlp'].includes(jobStatus)) {
        const pool = isGroup ? GROUP_FUN_MESSAGES : FUN_MESSAGES
        setFunMsgIdx((prev) => (prev + 1) % pool.length)
      }
    }, 2500)
    return () => clearInterval(interval)
  }, [waitingForAd, jobStatus, isGroup])

  // Spin animasyonu
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start()
  }, [])

  // Pulse animasyonu
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  // Icon duruma göre scale animasyonu
  const animateIconChange = () => {
    Animated.sequence([
      Animated.timing(iconScaleAnim, { toValue: 1.3, duration: 200, useNativeDriver: true }),
      Animated.timing(iconScaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start()
  }

  // AppState — arkaplanda polling'i yavaşlat
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState
      setIsBackground(nextState !== 'active')
    })
    return () => sub?.remove()
  }, [])

  // Job polling
  useEffect(() => {
    if (waitingForAd) return
    let active = true

    const startPolling = async () => {
      const jobId = await getJobId()
      if (!jobId) {
        router.replace('/')
        return
      }

      const poll = async () => {
        if (!active || waitingForAd) return
        try {
          const data = await checkJobStatus(jobId)
          const newStatus = data.status

          if (newStatus !== jobStatus) animateIconChange()

          setJobStatus(newStatus)
          setStatusLabel(data.status_label || newStatus)
          if (data.is_group !== undefined) setIsGroup(data.is_group)
          if (data.estimated_seconds) setEstimatedSeconds(data.estimated_seconds)

          if (newStatus === 'queued') {
            setQueuePosition(data.queue_position || null)
          }

          if (newStatus === 'completed' && data.result) {
            clearInterval(pollingRef.current)
            await clearJobId()
            jobDataRef.current = data
            setCompletedData(data)
            setWaitingForAd(true)
            showResults(data)
          } else if (newStatus === 'error' || newStatus === 'not_found') {
            clearInterval(pollingRef.current)
            await clearJobId()
            Alert.alert(
              'Analiz Başarısız ❌',
              data.error_detail || 'Bilinmeyen bir hata oluştu.',
              [{ text: 'Tamam', onPress: () => router.replace('/') }]
            )
          }
        } catch (e) {
          // Network blip — sessizce geç
        }
      }

      // Arka planda 15s, ön planda 3s polling
      const getInterval = () => appStateRef.current === 'active' ? 3000 : 15000
      
      poll() // İlk anında kontrol
      pollingRef.current = setInterval(poll, 3000)
      
      // Dinamik interval (arka plan geçişlerinde)
      const adaptInterval = setInterval(() => {
        if (!active) return
        const targetMs = getInterval()
        // Mevcut interval ile hedef arasında fark varsa yenile (basit yaklaşım)
      }, 5000)

      return () => {
        clearInterval(pollingRef.current)
        clearInterval(adaptInterval)
      }
    }

    const cleanup = startPolling()
    return () => {
      active = false
      if (pollingRef.current) clearInterval(pollingRef.current)
      cleanup?.then?.(fn => fn?.())
    }
  }, [waitingForAd])

  const showResults = (data) => {
    const proceed = () => {
      if (isSubscribed) {
        router.replace({ pathname: '/stories', params: { data: JSON.stringify(data.result) } })
        return
      }
      Alert.alert(
        "Analiz Tamamlandı! 🎉",
        "Sohbet hikayeniz hazır. Raporunuzu görüntülemek için devam edin.",
        [
          { text: 'Daha Sonra', style: 'cancel', onPress: () => router.replace('/history') },
          {
            text: 'Sonuçları Gör',
            onPress: async () => {
              try {
                const completed = await showRewardedAsync()
                if (completed) {
                  await unlockHistory(data.result.analysis_id)
                  router.replace({ pathname: '/stories', params: { data: JSON.stringify(data.result) } })
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

    const senders = data.result.parse_summary?.senders || []
    if (senders.length === 2) {
      Alert.alert(
        "Sohbetteki Tarafını Seç",
        "Doğru tarafı göstermemiz için hangisi olduğunu seçer misin?",
        [
          { text: senders[0], onPress: () => { data.result.user_sender = senders[0]; proceed() } },
          { text: senders[1], onPress: () => { data.result.user_sender = senders[1]; proceed() } },
        ],
        { cancelable: false }
      )
    } else {
      proceed()
    }
  }

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const config = STATUS_CONFIG[jobStatus] || STATUS_CONFIG.processing_parsing
  const isProcessing = ['processing_parsing', 'processing_nlp'].includes(jobStatus)
  const pool = isGroup ? GROUP_FUN_MESSAGES : FUN_MESSAGES
  const funMsg = pool[funMsgIdx % pool.length]

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Animated.Text style={[styles.logo, { transform: [{ scale: pulseAnim }] }]}>
        Anatomi
      </Animated.Text>

      {/* Durum İkonu */}
      <View style={styles.iconWrap}>
        {isProcessing && (
          <Animated.View style={[styles.spinnerRing, {
            borderTopColor: config.color,
            transform: [{ rotate: spin }]
          }]} />
        )}
        <Animated.Text style={[styles.statusIcon, { transform: [{ scale: iconScaleAnim }] }]}>
          {config.icon}
        </Animated.Text>
      </View>

      {/* Durum Başlığı */}
      <Text style={[styles.statusTitle, { color: config.color }]}>
        {config.title}
      </Text>

      {/* Kuyruk Pozisyonu */}
      {jobStatus === 'queued' && queuePosition !== null && (
        <View style={[styles.queueBadge, { borderColor: config.color + '40' }]}>
          <Text style={styles.queueBadgeText}>
            📋 Sıra no: <Text style={{ color: config.color, fontWeight: '800' }}>{queuePosition}</Text>
          </Text>
        </View>
      )}

      {/* Durum Açıklaması */}
      <Text style={styles.statusDesc}>
        {config.desc(queuePosition)}
      </Text>

      {/* Eğlenceli mesaj (sadece analiz sırasında) */}
      {isProcessing && (
        <View style={styles.funMsgBox}>
          <Text style={styles.funMsgIcon}>{funMsg.icon}</Text>
          <Text style={styles.funMsgText}>{funMsg.text}</Text>
        </View>
      )}

      {/* Tahmini Süre */}
      {estimatedSeconds && jobStatus !== "completed" && (
        <View style={styles.estimateBox}>
          <Ionicons name="time-outline" size={16} color={Colors.outline} />
          <Text style={styles.estimateText}>
            Tahmini süre: {estimatedSeconds > 60 
              ? `${Math.ceil(estimatedSeconds / 60)} dakika` 
              : `${estimatedSeconds} saniye`}
          </Text>
        </View>
      )}

      {/* Arka planda bildirim notu */}
      {jobStatus !== "completed" && (
        <View style={styles.notifNote}>
          <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
          <Text style={styles.notifNoteText}>
            Analiz arka planda devam ediyor. Uygulamayı kapatıp gezinebilirsiniz, bittiğinde bildirim göndereceğiz.
          </Text>
        </View>
      )}
      {/* Progress bar / Action Button */}
      {jobStatus === 'completed' ? (
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => showResults(completedData || jobDataRef.current)}
        >
          <Text style={styles.actionButtonText}>Sonuçları Gör 🎉</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { backgroundColor: config.color }]} />
        </View>
      )}

      {/* Küçük alt hint */}
      <Text style={styles.hint}>
        {jobStatus === 'completed'
          ? 'Sohbet analiziniz başarıyla tamamlandı!'
          : jobStatus === 'queued'
            ? 'Kapasiteye göre sıranız işleniyor...'
            : 'Dosya boyutuna göre 1-3 dakika sürebilir'}
      </Text>
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
  iconWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  spinnerRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  statusIcon: {
    fontSize: 42,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  statusDesc: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  queueBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  queueBadgeText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  funMsgBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 24,
    maxWidth: 300,
  },
  funMsgIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  funMsgText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 18,
  },
  notifNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginTop: 24,
    marginBottom: 20,
  },
  notifNoteText: {
    flex: 1,
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 18,
  },
  estimateBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  estimateText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
  },
  progressTrack: {
    width: 200,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    width: '40%',
    height: '100%',
    borderRadius: 2,
    opacity: 0.8,
  },
  hint: {
    fontSize: 11,
    color: Colors.onSurfaceVariant + '60',
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
})

const extraStyles = StyleSheet.create({
  estimateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  estimateText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
});
