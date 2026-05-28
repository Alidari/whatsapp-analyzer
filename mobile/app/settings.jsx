import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Switch, Linking
} from 'react-native'
import { CustomAlert as Alert } from '../components/CustomAlert'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../lib/colors'
import { deleteUserData } from '../lib/api'
import { clearAllData } from '../lib/storage'
import { useSubscription } from '../components/SubscriptionContext'
import SubscriptionModal from '../components/SubscriptionModal'

export default function SettingsScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { isSubscribed } = useSubscription()
  const [subModalVisible, setSubModalVisible] = useState(false)

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
        {/* Üyelik / Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Üyelik</Text>
          
          {isSubscribed ? (
            <View style={[styles.item, styles.premiumItem]}>
              <View style={styles.itemLeft}>
                <Ionicons name="star" size={22} color="#FFD700" />
                <View>
                  <Text style={[styles.itemText, { color: '#FFD700' }]}>Anatomi Premium</Text>
                  <Text style={styles.subtext}>Aboneliğiniz Aktif • Sınırsız Analiz 👑</Text>
                </View>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
            </View>
          ) : (
            <TouchableOpacity style={styles.item} onPress={() => setSubModalVisible(true)} activeOpacity={0.7}>
              <View style={styles.itemLeft}>
                <Ionicons name="star-outline" size={22} color="#FFD700" />
                <View>
                  <Text style={styles.itemText}>Premium'a Yükselt</Text>
                  <Text style={styles.subtext}>Reklamsız, hızlı ve sınırsız deneyim</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.outline} />
            </TouchableOpacity>
          )}
        </View>

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
          <Text style={styles.sectionTitle}>Destek ve Sürüm</Text>
          
          <TouchableOpacity style={styles.item} onPress={openSupport}>
            <View style={styles.itemLeft}>
              <Ionicons name="mail-outline" size={22} color={Colors.primary} />
              <Text style={styles.itemText}>Bize Ulaşın</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.outline} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.item} 
            onPress={async () => {
              if (__DEV__) {
                Alert.alert("Bilgi", "Geliştirme modunda güncelleme kontrolü yapılamaz.");
                return;
              }
              try {
                setLoading(true);
                const Updates = require('expo-updates');
                const update = await Updates.checkForUpdateAsync();
                if (update.isAvailable) {
                  await Updates.fetchUpdateAsync();
                  Alert.alert(
                    "Güncelleme Hazır 🚀",
                    "Yeni sürüm indirildi. Şimdi uygulamayı yeniden başlatmak ister misiniz?",
                    [
                      { text: "Sonra", style: "cancel" },
                      { text: "Şimdi Başlat", onPress: () => require('expo-updates').reloadAsync() }
                    ]
                  );
                } else {
                  Alert.alert("Güncel ✨", "Uygulamanız şu an en son sürümde.");
                }
              } catch (e) {
                Alert.alert("Hata", "Güncelleme kontrolü başarısız oldu: " + e.message);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            <View style={styles.itemLeft}>
              <Ionicons name="cloud-download-outline" size={22} color={Colors.primary} />
              <Text style={styles.itemText}>Güncellemeleri Denetle</Text>
            </View>
            {loading ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="chevron-forward" size={20} color={Colors.outline} />}
          </TouchableOpacity>

          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
              <Text style={styles.itemText}>Versiyon</Text>
            </View>
            <Text style={styles.versionText}>
              1.0.0
            </Text>
          </View>
        </View>

        <Text style={styles.footerText}>
          Anatomi © 2026 {"\n"}
          Kişisel verileriniz asla kalıcı olarak saklanmaz.
        </Text>
      </ScrollView>

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
  premiumItem: {
    backgroundColor: 'rgba(255, 215, 0, 0.04)',
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  subtext: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
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
