import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, Switch, Linking
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../lib/colors'
import { deleteUserData } from '../lib/api'
import { clearAllData } from '../lib/storage'

export default function SettingsScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDeleteData = () => {
    Alert.alert(
      "Tüm Verileri Sil ⚠️",
      "Analiz geçmişiniz ve size özel ayarlar sunucularımızdan ve cihazınızdan kalıcı olarak silinecektir. Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Hepsini Sil",
          style: "destructive",
          onPress: async () => {
            setLoading(true)
            try {
              const ok = await deleteUserData()
              if (ok) {
                await clearAllData()
                Alert.alert("Başarılı", "Tüm verileriniz silindi. Uygulama sıfırlandı.")
                router.replace('/onboarding')
              } else {
                throw new Error("Sunucu hatası oluştu.")
              }
            } catch (err) {
              Alert.alert("Hata", "Veriler silinirken bir hata oluştu: " + err.message)
            } finally {
              setLoading(false)
            }
          }
        }
      ]
    )
  }

  const openPrivacy = () => {
    Linking.openURL('https://anatomi.alidari.dev/privacy')
  }

  const openSupport = () => {
    Linking.openURL('mailto:bruhrecords1@gmail.com')
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Ayarlar</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile / Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gizlilik ve Veri</Text>
          
          <TouchableOpacity style={styles.item} onPress={openPrivacy}>
            <View style={styles.itemLeft}>
              <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} />
              <Text style={styles.itemText}>Gizlilik Politikası</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.outline} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.item, styles.dangerItem]} 
            onPress={handleDeleteData}
            disabled={loading}
          >
            <View style={styles.itemLeft}>
              <Ionicons name="trash-outline" size={22} color="#ff4444" />
              <Text style={[styles.itemText, { color: '#ff4444' }]}>Verilerimi Temizle</Text>
            </View>
            {loading ? <ActivityIndicator size="small" color="#ff4444" /> : <Ionicons name="chevron-forward" size={20} color="#ff4444" />}
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destek</Text>
          
          <TouchableOpacity style={styles.item} onPress={openSupport}>
            <View style={styles.itemLeft}>
              <Ionicons name="mail-outline" size={22} color={Colors.primary} />
              <Text style={styles.itemText}>Bize Ulaşın</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.outline} />
          </TouchableOpacity>

          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
              <Text style={styles.itemText}>Versiyon</Text>
            </View>
            <Text style={styles.versionText}>2.0.0</Text>
          </View>
        </View>

        <Text style={styles.footerText}>
          Anatomi © 2026 {"\n"}
          Kişisel verileriniz asla kalıcı olarak saklanmaz.
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: Colors.surfaceContainer,
  },
  backBtn: {
    padding: 8,
    marginRight: 12,
    marginLeft: -8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemText: {
    fontSize: 16,
    color: Colors.onSurface,
    fontWeight: '600',
  },
  dangerItem: {
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
    borderColor: 'rgba(255, 68, 68, 0.1)',
  },
  versionText: {
    color: Colors.outline,
    fontSize: 14,
    fontWeight: '500',
  },
  footerText: {
    textAlign: 'center',
    color: Colors.outline,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 20,
    marginBottom: 40,
  }
})
