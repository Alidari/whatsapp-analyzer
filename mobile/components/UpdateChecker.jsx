/**
 * Anatomi — OTA Update Checker
 * 
 * Uygulama açıldığında güncelleme kontrolü yapar.
 * Yeni güncelleme varsa indirir ve kullanıcıya şık bir banner gösterir.
 * Kullanıcı "Güncelle" dediğinde uygulama yeniden başlar.
 */
import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native'
import * as Updates from 'expo-updates'
import { Colors } from '../lib/colors'

export default function UpdateChecker() {
  const [updateReady, setUpdateReady] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const slideAnim = useState(() => new Animated.Value(-120))[0]

  const showBanner = useCallback(() => {
    setUpdateReady(true)
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start()
  }, [slideAnim])

  const hideBanner = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setUpdateReady(false))
  }, [slideAnim])

  useEffect(() => {
    // Development veya web ortamında güncelleme kontrolü yapma
    if (__DEV__ || Platform.OS === 'web') return

    let isMounted = true

    async function checkForUpdate() {
      try {
        const update = await Updates.checkForUpdateAsync()

        if (!update.isAvailable || !isMounted) return

        setDownloading(true)
        await Updates.fetchUpdateAsync()

        if (isMounted) {
          setDownloading(false)
          showBanner()
        }
      } catch (e) {
        // Sessizce logla, kullanıcıyı rahatsız etme
        console.log('Update check failed:', e.message)
        if (isMounted) setDownloading(false)
      }
    }

    // Uygulama açıldığında biraz bekle, sonra kontrol et
    const timer = setTimeout(checkForUpdate, 3000)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [showBanner])

  const handleRestart = async () => {
    try {
      await Updates.reloadAsync()
    } catch (e) {
      console.error('Restart failed:', e)
    }
  }

  // İndirme sırasında hiçbir şey gösterme (sessiz)
  // Güncelleme hazır değilse hiçbir şey gösterme
  if (!updateReady && !downloading) return null

  // İndirme göstergesi (opsiyonel, isterseniz kaldırabilirsiniz)
  if (downloading && !updateReady) return null

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.banner}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🚀</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Güncelleme Hazır</Text>
          <Text style={styles.subtitle}>Yeni özellikler ve iyileştirmeler</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={hideBanner} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Sonra</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestart} style={styles.updateBtn}>
            <Text style={styles.updateText}>Güncelle</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    // Shadow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: Colors.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dismissBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dismissText: {
    color: Colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '500',
  },
  updateBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  updateText: {
    color: Colors.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
})
