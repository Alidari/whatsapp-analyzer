import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as DocumentPicker from 'expo-document-picker'
import { Colors } from '../lib/colors'
import { uploadFile, hasHistory, earnQuota } from '../lib/api'
import { setJobId, getJobId } from '../lib/storage'
import { showRewardedAsync, loadRewarded, AppBannerAd } from '../components/Ads'

export default function IndexScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [isPicking, setIsPicking] = useState(false)

  useEffect(() => {
    // Preload Rewarded Ad when the screen starts
    loadRewarded()
    
    async function init() {
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
      handleApiError(err, uri, name, fileObj)
    } finally {
      setUploading(false)
    }
  }

  const handleApiError = (err, uri, name, fileObj) => {
    if (err.message === 'LIMIT_REACHED') {
      Alert.alert(
        "Limit Doldu 🔒",
        "Günlük ücretsiz analiz hakkınızı doldurdunuz. Kısa bir reklam izleyerek 1 hak daha kazanmak ister misiniz?",
        [
          { text: 'Vazgeç', style: 'cancel' },
          { 
            text: 'Reklam İzle', 
            onPress: async () => {
              try {
                setUploading(true)
                const completed = await showRewardedAsync()
                if (completed) {
                  await earnQuota()
                  Alert.alert('Tebrikler!', 'Yeni bir analiz hakkı kazandınız.', [
                    { text: 'Tekrar Dene', onPress: () => sendFile(uri, name, fileObj) }
                  ])
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
      {/* Logo */}
      <Text style={styles.logo}>Anatomi</Text>

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

      <Text style={styles.hint}>
        WhatsApp → Sohbet → ⋮ → Sohbeti dışa aktar → Medyasız
      </Text>

      {/* Privacy Badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>🔒 Analiz %100 güvenli • Sohbetler asla saklanmaz</Text>
      </View>

      {/* History Link */}
      <TouchableOpacity
        onPress={() => router.push('/history')}
        style={styles.historyLink}
      >
        <Text style={styles.historyLinkText}>Geçmiş Analizler →</Text>
      </TouchableOpacity>

      {/* Bottom Banner */}
      <View style={[styles.bannerContainer, { paddingBottom: insets.bottom }]}>
        <AppBannerAd />
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
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -1,
    marginBottom: 40,
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
  hint: {
    fontSize: 12,
    color: Colors.outline,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  badge: {
    marginTop: 32,
    backgroundColor: Colors.surfaceContainerHighest,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    color: Colors.primary,
  },
  historyLink: {
    marginTop: 24,
  },
  historyLinkText: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '600',
  },
  bannerContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
  },
})
