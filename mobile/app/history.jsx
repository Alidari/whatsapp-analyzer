import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../lib/colors'
import { 
  getHistory, getHistoryDetail, deleteHistoryItem, unlockHistory 
} from '../lib/api'
import HistoryCard from '../components/HistoryCard'

import { showRewardedAsync, loadRewarded, AppBannerAd } from '../components/Ads'

export default function HistoryScreen() {
  const router = useRouter()
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingId, setLoadingId] = useState(null)

  const fetchHistory = useCallback(async () => {
    try {
      const data = await getHistory()
      setAnalyses(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadRewarded()
    fetchHistory()
  }, [fetchHistory])

  const handleSelect = async (item) => {
    const { id, is_unlocked } = item
    
    // Kilitliyse Reklam Göster
    if (!is_unlocked) {
      Alert.alert(
        "Kilitli Analiz 🔒",
        "Bu raporu yeniden görüntülemek üzere kilidini açabilirsiniz.",
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Kilidi Aç', 
            onPress: async () => {
              try {
                setLoadingId(id)
                const completed = await showRewardedAsync()
                if (completed) {
                  await unlockHistory(id)
                  // Then load Dashboard
                  loadDashboard(id)
                }
              } catch (e) {
                Alert.alert('Tamamlanamadı', e.message)
              } finally {
                setLoadingId(null)
              }
            }
          }
        ]
      )
      return
    }

    // Açıksa direkt git
    loadDashboard(id)
  }

  const loadDashboard = async (id) => {
    setLoadingId(id)
    try {
      const data = await getHistoryDetail(id)
      // data.result ile geçiyoruz çünkü loading.jsx de öyle yapıyor, Dashboard buna göre bekliyor
      router.push({
        pathname: '/dashboard',
        params: { data: JSON.stringify(data.result) },
      })
    } catch (err) {
      Alert.alert('Hata', err.message)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = (id, name) => {
    Alert.alert(
      'Analizi Sil',
      `"${name}" silinsin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const ok = await deleteHistoryItem(id)
            if (ok) {
              setAnalyses((prev) => prev.filter((a) => a.id !== id))
            }
          },
        },
      ]
    )
  }

  const handleNewAnalysis = () => {
    router.replace({ pathname: '/', params: { forceOpen: '1' } })
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Geçmiş yükleniyor...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Geçmiş Analizler</Text>
          <Text style={styles.subtitle}>
            {analyses.length} analiz kaydedildi
          </Text>
        </View>
        <TouchableOpacity onPress={handleNewAnalysis} activeOpacity={0.85}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryContainer]}
            style={styles.newBtn}
          >
            <Text style={styles.newBtnText}>+ Yeni</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {analyses.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons 
            name="chatbubbles-outline" 
            size={80} 
            color={Colors.primary + '20'} 
            style={styles.emptyIcon} 
          />
          <Text style={styles.emptyTitle}>Henüz analiz yok</Text>
          <Text style={styles.emptySubtitle}>
            İlk WhatsApp sohbet dosyanı yükleyerek başla!
          </Text>
          <TouchableOpacity onPress={handleNewAnalysis} activeOpacity={0.85}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryContainer]}
              style={styles.uploadBtn}
            >
              <Text style={styles.uploadBtnText}>Analiz Başlat</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={analyses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HistoryCard
              analysis={item}
              onPress={() => handleSelect(item)}
              onDelete={() => handleDelete(item.id, item.chat_name || 'İsimsiz')}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchHistory() }}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}

      {loadingId && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {/* Banner Reklam */}
      <AppBannerAd />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.onSurfaceVariant,
    fontSize: 13,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.onSurface,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.onSurfaceVariant + '99',
    marginTop: 4,
  },
  newBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  newBtnText: {
    color: Colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 32,
  },
  uploadBtn: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 999,
  },
  uploadBtnText: {
    color: Colors.onPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,20,27,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
