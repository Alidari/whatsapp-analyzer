import { useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, Dimensions, TouchableWithoutFeedback,
  TouchableOpacity, Share,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors } from '../lib/colors'
import { generateStorySlides } from '../lib/slides'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

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

  const slides = generateStorySlides(analysisData.metrics)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)

  const goNext = useCallback(() => {
    if (!isRevealed) {
      setIsRevealed(true)
      return
    }
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((p) => p + 1)
      setIsRevealed(false)
    } else {
      // Navigate to dashboard
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
    try {
      await Share.share({
        message: `Sohbet analizimizin sonuçlarına bak! 😂\n${slide.badge}: ${slide.title}\n\nSen de kendi analizini çıkarmak istersen: https://anatomi.app`,
      })
    } catch {}
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

        {/* Content */}
        <View style={styles.content}>
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

              {/* Share Button */}
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Text style={styles.shareBtnText}>📤  Paylaş</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

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
  },
})
