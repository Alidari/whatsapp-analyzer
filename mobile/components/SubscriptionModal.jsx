import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../lib/colors';
import { getPremiumSubscriptions, buySubscription, restorePurchases } from '../lib/subscription';
import { useSubscription } from './SubscriptionContext';
import { Ionicons } from '@expo/vector-icons';

export default function SubscriptionModal({ visible, onClose }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isSubscribed, checkSubscription } = useSubscription();

  useEffect(() => {
    if (visible) {
      loadProducts();
    }
  }, [visible]);

  const loadProducts = async () => {
    setLoading(true);
    const subs = await getPremiumSubscriptions();
    setProducts(subs);
    setLoading(false);
  };

  const handleSubscribe = async (sku) => {
    try {
      await buySubscription(sku);
      // Success will be handled by the listener in SubscriptionContext
      onClose();
    } catch (err) {
      if (err.code !== 'E_USER_CANCELLED') {
        Alert.alert('Hata', 'Abonelik işlemi başlatılamadı.');
      }
    }
  };

  if (isSubscribed) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <BlurView intensity={80} tint="dark" style={styles.container}>
          <View style={styles.content}>
            <Ionicons name="checkmark-circle" size={80} color={Colors.primary} />
            <Text style={styles.title}>Zaten Premium Üyesiniz!</Text>
            <Text style={styles.description}>
              Reklamsız ve sınırsız analiz hakkınızın tadını çıkarın.
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={90} tint="dark" style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.dismissArea} onPress={onClose} />
          
          <View style={styles.modalCard}>
            <View style={styles.header}>
              <Text style={styles.title}>Anatomi Premium</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#aaa" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.featureList}>
                <FeatureItem 
                  icon="infinite" 
                  title="Sınırsız Analiz" 
                  desc="Günlük limitlere takılmadan dilediğiniz kadar analiz yapın." 
                />
                <FeatureItem 
                  icon="megaphone-outline" 
                  title="Reklamsız Deneyim" 
                  desc="Analiz yaparken veya sonuçları incelerken reklam görmeyin." 
                />
                <FeatureItem 
                  icon="flash" 
                  title="Öncelikli İşleme" 
                  desc="Analizleriniz daha hızlı tamamlansın." 
                />
                <FeatureItem 
                  icon="star" 
                  title="Tüm Geçmiş Açık" 
                  desc="Eski analizlerinizi reklam izlemeden anında görüntüleyin." 
                />
              </View>

              {loading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{ margin: 20 }} />
              ) : (
                products.map((product) => (
                  <TouchableOpacity 
                    key={product.productId}
                    style={styles.subscribeButton}
                    onPress={() => handleSubscribe(product.productId)}
                  >
                    <View>
                      <Text style={styles.buttonTitle}>{product.title.replace('(Anatomi)', '')}</Text>
                      <Text style={styles.buttonPrice}>{product.localizedPrice} / Ay</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </TouchableOpacity>
                ))
              )}
              
              {!loading && products.length === 0 && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>Abonelik seçenekleri şu an yüklenemedi. Lütfen daha sonra tekrar deneyin.</Text>
                </View>
              )}

              <TouchableOpacity 
                style={styles.restoreButton}
                onPress={async () => {
                  try {
                    setLoading(true);
                    await restorePurchases();
                    await checkSubscription();
                    Alert.alert('Bilgi', 'Satın alımlar kontrol edildi.');
                  } catch (e) {
                    Alert.alert('Hata', 'Geri yükleme başarısız.');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <Text style={styles.restoreButtonText}>Satın Alımları Geri Yükle</Text>
              </TouchableOpacity>

              <Text style={styles.footerNote}>
                Aboneliğinizi dilediğiniz zaman Google Play Store üzerinden iptal edebilirsiniz.
              </Text>
            </ScrollView>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

function FeatureItem({ icon, title, desc }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={24} color={Colors.primary} />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: '#1a1a1a',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
  },
  description: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  featureList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  featureDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  subscribeButton: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonPrice: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  footerNote: {
    textAlign: 'center',
    color: '#555',
    fontSize: 11,
    marginTop: 20,
  },
  restoreButton: {
    padding: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#888',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  errorBox: {
    padding: 16,
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    textAlign: 'center',
  }
});
