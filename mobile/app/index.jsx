import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { CustomAlert as Alert } from '../components/CustomAlert'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as DocumentPicker from 'expo-document-picker'
import { Colors } from '../lib/colors'
import { uploadFile, hasHistory, earnQuota } from '../lib/api'
import { setJobId, getJobId, hasSeenOnboarding } from '../lib/storage'
import { showRewardedAsync, loadRewarded, AppBannerAd } from '../components/Ads'
import { Ionicons } from '@expo/vector-icons'
import { useSubscription } from '../components/SubscriptionContext'
import SubscriptionModal from '../components/SubscriptionModal'

export default function IndexScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { isSubscribed, checkSubscription, quota } = useSubscription()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [isPicking, setIsPicking] = useState(false)
  const [subModalVisible, setSubModalVisible] = useState(false)

  useEffect(() => {
    // Preload Rewarded Ad when the screen starts
    loadRewarded()
    
    async function init() {
      // İlk kez açılıyorsa onboarding göster
      if (params.forceOpen !== '1' && params.fromOnboarding !== '1') {
        const seen = await hasSeenOnboarding()
        if (!seen) {
          router.replace('/onboarding')
          return
        }
      }

      // Devam eden iş var mı?
      const existingJob = await getJobId()
      if (existingJob) {
        router.replace('/loading')
        return
      }
      
      // Kullanıcı açıkça "Yeni" diyerek geldiyse geçmiş kontrolünü atla
      if (params.forceOpen !== '1') {
        try {
          const has = await hasHistory()
          if (has) {
            router.replace('/history')
            return
          }
        } catch (e) {
          // Backend erişilemezse landing göster
        }
      }
      setLoading(false)
    }
    init()
  }, [params.forceOpen])

  const handlePickFile = async () => {
    if (isPicking || uploading) return
    setIsPicking(true)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      })

      if (result.canceled) return

      const file = result.assets[0]
      const fileName = (file.name || '').toLowerCase()
      const mimeType = (file.mimeType || '').toLowerCase()
      
      const isText = fileName.endsWith('.txt') || mimeType.includes('text/plain')
      const isZip = fileName.endsWith('.zip') || mimeType.includes('zip') || mimeType.includes('archive')

      if (!isText && !isZip) {
        Alert.alert('Hata', 'Yalnızca .txt veya .zip dosyaları kabul edilir.')
        return
      }

      // Drive'dan gelen dosyalarda mimeType yoksa uzantıdan belirle
      const resolvedMime = file.mimeType || (isZip ? 'application/zip' : 'text/plain')
      await sendFile(file.uri, file.name, file.file, resolvedMime)
      
    } catch (err) {
      console.error('File Picker Error: ', err)
      handleApiError(err)
    } finally {
      setIsPicking(false)
    }

  }
  
  const sendFile = async (uri, name, fileObj, mimeType) => {
    setUploading(true)
    try {
      const data = await uploadFile(uri, name, fileObj, mimeType)
      if (data.success && data.job_id) {
        await setJobId(data.job_id)
        router.replace('/loading')
      } else {
        throw new Error('İşlem kuyruğa alınamadı.')
      }
    } catch (err) {
      console.error('API Send Error: ', err)
      handleApiError(err, uri, name, fileObj, mimeType)
    } finally {
      setUploading(false)
    }
  }

  const handleApiError = (err, uri, name, fileObj, mimeType) => {
    if (err.message === 'LIMIT_REACHED') {
      Alert.alert(
        "Limit Doldu 🔒",
        "Günlük ücretsiz analiz hakkınızı doldurdunuz. Reklam izleyerek ekstra hak kazanabilirsiniz.",
        [
          { text: 'Vazgeç', style: 'cancel' },
          { 
            text: 'Reklam İzle', 
            onPress: async () => {
              try {
                setUploading(true)
                const completed = await showRewardedAsync()
                if (completed) {
                  setUploading(true)
                  try {
                    await earnQuota()
                    await checkSubscription() // Refresh quota display
                    Alert.alert('Tebrikler!', 'Yeni bir analiz hakkı kazandınız.', [
                      { text: 'Tekrar Dene', onPress: () => sendFile(uri, name, fileObj, mimeType) }
                    ])
                  } catch (err) {
                    Alert.alert('Hata', 'Hak tanımlanamadı: ' + err.message)
                  }
                }
              } catch (e) {
                Alert.alert('Hata', e.message)
                setUploading(false)
              }
            } 
          }
        ]
      )
    } else {
      console.log('Displaying Alert for Error: ', err.message)
      Alert.alert('Hata', err.message || 'Dosya yüklenemedi.')
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header Row (Spotify / Native Style) */}
      <View style={styles.homeHeader}>
        {/* Quota Badge / Premium Badge */}
        {isSubscribed ? (
          <View style={[styles.quotaBadgeCompact, { borderColor: 'rgba(255, 215, 0, 0.3)', backgroundColor: 'rgba(255, 215, 0, 0.05)' }]}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={[styles.quotaTextCompact, { color: '#FFD700', fontWeight: '700' }]}>
              Premium 👑
            </Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.quotaBadgeCompact}
            onPress={() => setSubModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="flash-outline" size={12} color={Colors.primary} />
            <Text style={styles.quotaTextCompact}>
              Kalan: {quota.max - quota.used} / {quota.max} • <Text style={{ color: '#FFD700', fontWeight: 'bold' }}>Yükselt</Text>
            </Text>
          </TouchableOpacity>
        )}

        {/* Settings Icon */}
        <TouchableOpacity 
          style={styles.settingsBtnCompact} 
          onPress={() => router.push('/settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={24} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* Hero */}
      <Text style={styles.title}>
        Sohbetinizin{'\n'}
        <Text style={styles.titleAccent}>Anatomisi</Text>
      </Text>

      <Text style={styles.subtitle}>
        WhatsApp geçmişinizi eğlenceli verilerle keşfedin. Dijital hafızanızdaki
        örüntüleri ve iletişim karakterinizi görselleştiriyoruz.
      </Text>

      {/* Upload Button */}
      <TouchableOpacity
        onPress={handlePickFile}
        disabled={uploading || isPicking}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.uploadBtn}
        >
          {uploading ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={styles.uploadBtnText}>📂  Sohbet Dosyası Seç</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Privacy Notice */}
      <Text style={styles.privacyText}>
        🔒 Analiz %100 güvenlidir • Sohbetler asla saklanmaz
      </Text>

      {/* Nasıl Yapılır Rehberi */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintTitle}>Nasıl Yapılır?</Text>
        <Text style={styles.hintText}>
          WhatsApp → Sohbet → ⋮ → Sohbeti dışa aktar → Medyasız
        </Text>
        <Text style={styles.hintNote}>
          *(Bazı cihazlarda "Sohbeti dışa aktar" seçeneği "Diğer" menüsünün altında olabilir)*
        </Text>
      </View>

      {/* History Link */}
      <TouchableOpacity
        onPress={() => router.push('/history')}
        style={styles.historyLink}
      >
        <Text style={styles.historyLinkText}>Geçmiş Analizler →</Text>
      </TouchableOpacity>

      {/* Bottom Banner */}
      {!isSubscribed && <AppBannerAd />}

      {/* Subscription purchase modal */}
      <SubscriptionModal 
        visible={subModalVisible} 
        onClose={() => setSubModalVisible(false)} 
      />
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
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeHeader: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  quotaBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quotaTextCompact: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  settingsBtnCompact: {
    padding: 6,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.onSurface,
    textAlign: 'center',
    lineHeight: 48,
    letterSpacing: -2,
    marginBottom: 16,
  },
  titleAccent: {
    color: Colors.primary,
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  uploadBtn: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 999,
    alignItems: 'center',
    minWidth: 260,
  },
  uploadBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  hintContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hintText: {
    fontSize: 12,
    color: Colors.onSurface,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  hintNote: {
    fontSize: 11,
    color: Colors.outline,
    textAlign: 'center',
    lineHeight: 15,
  },
  privacyText: {
    fontSize: 12,
    color: Colors.outline,
    marginTop: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  historyLink: {
    marginTop: 24,
  },
  historyLinkText: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '600',
  },
})
