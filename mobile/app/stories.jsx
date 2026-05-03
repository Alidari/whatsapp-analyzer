import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, Dimensions, TouchableWithoutFeedback,
  TouchableOpacity, Share, Animated, ScrollView, Modal, ActivityIndicator
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import ViewShot from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { Colors } from '../lib/colors'
import { generateStorySlides } from '../lib/slides'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

function ExampleQuotes({ quotesList }) {
  const [modalVisible, setModalVisible] = useState(false)
  
  if (!quotesList || quotesList.length === 0) return null

  // Birden fazla diyalog varsa hepsini, yoksa tekini al
  const dialogues = Array.isArray(quotesList[0]) ? quotesList : [quotesList]
  
  return (
    <>
      <TouchableOpacity 
        style={styles.viewSampleBtn} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="eye-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.viewSampleBtnText}>Örnek Sohbeti Gör</Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Sohbet Örneği</Text>
                <Text style={styles.modalSubtitle}>Yapay zekanın seçtiği anlar</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {dialogues.map((dialogue, dIdx) => (
                <View key={dIdx} style={styles.dialogueGroup}>
                  {dIdx > 0 && <View style={styles.dialogueDivider} />}
                  {dialogue.map((msg, idx) => {
                    const isFirstSender = msg.sender === dialogue[0].sender
                    return (
                      <View key={idx} style={[
                        styles.quoteBubble,
                        isFirstSender ? styles.quoteBubbleLeft : styles.quoteBubbleRight
                      ]}>
                        <Text style={styles.quoteSender}>
                          {msg.sender}
                        </Text>
                        <Text style={styles.quoteMessage}>
                          {msg.message}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}

export default function StoriesScreen() {
  const router = useRouter()
  const { data: rawData } = useLocalSearchParams()

  let analysisData
  try {
    analysisData = JSON.parse(rawData)
  } catch {
    router.replace('/')
    return null
  }

  const m = analysisData?.metrics || analysisData
  if (!m || !m.general) {
    return null
  }
  const slides = generateStorySlides(m)
  
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const viewShotRef = useRef(null)

  // ── Animasyon Değerleri ──
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current

  // currentSlide veya isRevealed değiştiğinde animasyonu tetikle
  useEffect(() => {
    fadeAnim.setValue(0)
    slideAnim.setValue(30) // Başlangıç pozisyonu (30px aşağıdan)
    
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start()

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start()
  }, [currentSlide, isRevealed])

  const goNext = useCallback(() => {
    if (!isRevealed) {
      setIsRevealed(true)
      return
    }
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((p) => p + 1)
      setIsRevealed(false)
    } else {
      router.replace({
        pathname: '/dashboard',
        params: { data: rawData },
      })
    }
  }, [currentSlide, slides.length, isRevealed, rawData])

  const goPrev = useCallback(() => {
    if (isRevealed) {
      setIsRevealed(false)
      return
    }
    if (currentSlide > 0) {
      setCurrentSlide((p) => p - 1)
      setIsRevealed(false)
    }
  }, [currentSlide, isRevealed])

  const handleTap = useCallback((e) => {
    const x = e.nativeEvent.locationX
    if (x < SCREEN_W / 3) {
      goPrev()
    } else {
      goNext()
    }
  }, [goPrev, goNext])

  const handleShare = async () => {
    if (isSharing) return
    setIsSharing(true)
    try {
      const uri = await viewShotRef.current.capture()
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Analiz Sonucunu Paylaş',
        UTI: 'public.png'
      })
    } catch (err) {
      console.error('Share error:', err)
    } finally {
      setIsSharing(false)
    }
  }

  const handleSkip = () => {
    router.replace({
      pathname: '/dashboard',
      params: { data: rawData },
    })
  }

  const slide = slides[currentSlide]

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <LinearGradient
        colors={slide.gradient}
        style={styles.container}
      >
        {/* Progress Bars */}
        <View style={styles.progressRow}>
          {slides.map((_, i) => (
            <View key={i} style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: i < currentSlide || (i === currentSlide && isRevealed)
                      ? '100%'
                      : '0%',
                    opacity: i <= currentSlide ? 1 : 0.3,
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>✨</Text>
            </View>
            <Text style={styles.headerTitle}>Anatomi</Text>
          </View>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipBtn}>Atla</Text>
          </TouchableOpacity>
        </View>

        {/* Content with Animation */}
        <ViewShot 
          ref={viewShotRef} 
          options={{ format: 'png', quality: 0.9 }}
          style={{ flex: 1, backgroundColor: 'transparent' }}
        >
          <LinearGradient
            colors={slide.gradient}
            style={[StyleSheet.absoluteFill, { borderRadius: 0 }]}
          />
          
          <Animated.View style={[styles.content, { 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }] 
          }]}>
            {!isRevealed ? (
              // QUESTION MODE
              <View style={styles.questionWrap}>
                <View style={styles.questionIconCircle}>
                  <Text style={styles.questionIconText}>🤔</Text>
                </View>
                <Text style={styles.questionText}>{slide.question}</Text>
                <Text style={styles.tapHint}>Cevabı Görmek İçin Dokun</Text>
              </View>
            ) : (
              // REVEAL MODE
              <View style={styles.revealWrap}>
                <View style={styles.revealIconCircle}>
                  <Text style={styles.revealIcon}>{slide.icon}</Text>
                </View>
                <View style={styles.badgeWrap}>
                  <Text style={styles.badgeText}>{slide.badge}</Text>
                </View>
                <Text style={[styles.revealTitle, { color: slide.titleAccent || Colors.primary }]}>
                  {slide.title}
                </Text>
                <Text style={styles.revealSubtitle}>{slide.subtitle}</Text>

                <ExampleQuotes quotesList={slide.exampleQuote} />

                {/* Share Button (Hidden during capture if needed, but usually we want it visible or we use a separate hidden view) */}
                {!isSharing && (
                  <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                    <Text style={styles.shareBtnText}>📤  Paylaş</Text>
                  </TouchableOpacity>
                )}
                
                {isSharing && (
                  <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
                )}
              </View>
            )}
          </Animated.View>
        </ViewShot>

        {/* Slide Counter */}
        <Text style={styles.counter}>
          {currentSlide + 1} / {slides.length}
        </Text>
      </LinearGradient>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  progressBarBg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: { fontSize: 14 },
  headerTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '800',
    fontSize: 14,
  },
  skipBtn: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  questionWrap: {
    alignItems: 'center',
  },
  questionIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  questionIconText: { fontSize: 36 },
  questionText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 38,
  },
  tapHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 40,
  },
  revealWrap: {
    alignItems: 'center',
  },
  revealIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  revealIcon: { fontSize: 48 },
  badgeWrap: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 24,
  },
  badgeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  revealTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 16,
  },
  revealSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  shareBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 20,
  },
  shareBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  counter: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  quoteWrap: {
    width: '100%',
    paddingHorizontal: 8,
  },
  quoteBubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 6,
  },
  quoteBubbleLeft: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  quoteBubbleRight: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quoteSender: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  quoteMessage: {
    fontSize: 14,
    color: 'white',
    lineHeight: 19,
  },
  viewSampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 24,
  },
  viewSampleBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111b21',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  dialogueGroup: {
    marginBottom: 24,
  },
  dialogueDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
    width: '50%',
    alignSelf: 'center',
  },
})
