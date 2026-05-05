import { useRef, useState } from 'react'
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  Animated, FlatList, StatusBar,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Colors } from '../lib/colors'
import { markOnboardingDone } from '../lib/storage'

const { width, height } = Dimensions.get('window')

const SLIDES = [
  {
    id: '1',
    emoji: '👋',
    title: 'Anatomi\'ye\nHoş Geldin!',
    desc: 'WhatsApp sohbetlerini yapay zeka ile analiz et. Kim daha çok mesaj attı? En çok hangi emoji kullanıldı? Gece kaçta yazışıyorsunuz?',
    gradient: ['#0b141b', '#00382a', '#006c54'],
    accent: Colors.primary,
  },
  {
    id: '2',
    emoji: '🔍',
    title: 'Nasıl\nÇalışır?',
    desc: 'WhatsApp\'tan sohbet geçmişini dışa aktarıyorsun. Dosyayı Anatomi\'ye yüklüyorsun. Birkaç saniyede detaylı bir analiz raporu hazır!',
    gradient: ['#0b141b', '#082f49', '#0369a1'],
    accent: Colors.secondary,
  },
  {
    id: '3',
    emoji: '📤',
    title: 'Sohbeti Nasıl\nDışa Aktarırım?',
    desc: 'WhatsApp\'ta bir sohbet aç → sağ üst köşedeki ⋮ menüsüne dokun → "Daha fazla" → "Sohbeti dışa aktar" → "Medyasız" seç.',
    gradient: ['#0b141b', '#350040', '#570067'],
    accent: Colors.tertiary,
    steps: ['WhatsApp\'ta sohbeti aç', '⋮ → Daha fazla', 'Sohbeti dışa aktar', '"Medyasız" seç'],
  },
  {
    id: '4',
    emoji: '📊',
    title: 'Ne Öğreneceksin?',
    desc: 'Hazırladığımız detaylı raporda seni neler bekliyor?',
    gradient: ['#0b141b', '#3d1a00', '#7c3a00'],
    accent: '#ffa94d',
    bullets: [
      '💬  Mesaj & kelime sayıları',
      '😂  En çok kullanılan emojiler',
      '⏰  Saatlik aktivite haritası',
      '👻  Ghosting & geç cevap istatistikleri',
      '🧠  Yapay zeka kişilik analizi',
      '🎬  Sinematik Story sunumu',
    ],
  },
  {
    id: '5',
    emoji: '🚀',
    title: 'Hazır mısın?',
    desc: 'İlk analizini yapmak için hemen başla. Sohbet dosyasını yüklemek sadece birkaç saniye sürer.',
    gradient: ['#0b141b', '#00382a', '#006c54'],
    accent: Colors.primary,
    isFinal: true,
  },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const [activeIndex, setActiveIndex] = useState(0)
  const flatRef = useRef(null)
  const fadeAnim = useRef(new Animated.Value(1)).current

  const goTo = (index) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start()
    flatRef.current?.scrollToIndex({ index, animated: true })
    setActiveIndex(index)
  }

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      goTo(activeIndex + 1)
    }
  }

  const handleFinish = async () => {
    await markOnboardingDone()
    router.replace({ pathname: '/', params: { fromOnboarding: '1' } })
  }

  const handleSkip = async () => {
    await markOnboardingDone()
    router.replace({ pathname: '/', params: { fromOnboarding: '1' } })
  }

  const slide = SLIDES[activeIndex]

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Slides — hidden scrollView driven by buttons */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <SlideView item={item} active={index === activeIndex} fadeAnim={fadeAnim} />
        )}
      />

      {/* Overlay UI */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Skip */}
        {!slide.isFinal && (
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>Atla</Text>
          </TouchableOpacity>
        )}

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex && { backgroundColor: slide.accent, width: 22 },
              ]}
            />
          ))}
        </View>

        {/* Button */}
        {slide.isFinal ? (
          <TouchableOpacity onPress={handleFinish} activeOpacity={0.85}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mainBtn}
            >
              <Text style={styles.mainBtnText}>Hadi Başlayalım 🎉</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.mainBtn, { backgroundColor: slide.accent + '22', borderColor: slide.accent + '55', borderWidth: 1 }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={[styles.mainBtnText, { color: slide.accent }]}>Devam →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

function SlideView({ item, active, fadeAnim }) {
  return (
    <View style={{ width }}>
      <LinearGradient colors={item.gradient} style={styles.slide}>
        <Animated.View style={[styles.content, { opacity: active ? fadeAnim : 0 }]}>
          {/* Emoji bubble */}
          <View style={[styles.emojiBubble, { backgroundColor: item.accent + '18', borderColor: item.accent + '30' }]}>
            <Text style={styles.emoji}>{item.emoji}</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: item.accent }]}>{item.title}</Text>

          {/* Description */}
          <Text style={styles.desc}>{item.desc}</Text>

          {/* Steps (slide 3) */}
          {item.steps && (
            <View style={styles.stepsWrap}>
              {item.steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={[styles.stepNum, { backgroundColor: item.accent + '25', borderColor: item.accent + '50' }]}>
                    <Text style={[styles.stepNumText, { color: item.accent }]}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Bullets (slide 4) */}
          {item.bullets && (
            <View style={styles.bulletsWrap}>
              {item.bullets.map((b, i) => (
                <View key={i} style={[styles.bulletRow, { backgroundColor: item.accent + '10', borderColor: item.accent + '20' }]}>
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  slide: {
    flex: 1,
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 200,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  emojiBubble: {
    width: 100,
    height: 100,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -1.5,
    marginBottom: 20,
  },
  desc: {
    fontSize: 16,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 28,
  },
  stepsWrap: {
    width: '100%',
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 14,
    fontWeight: '800',
  },
  stepText: {
    color: Colors.onSurface,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  bulletsWrap: {
    width: '100%',
    gap: 8,
  },
  bulletRow: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  bulletText: {
    color: Colors.onSurface,
    fontSize: 14,
    fontWeight: '500',
  },
  // ── Overlay ──
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingBottom: 48,
    alignItems: 'center',
    gap: 20,
  },
  skipBtn: {
    position: 'absolute',
    top: -height + 60,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    color: Colors.outline,
    fontSize: 14,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  mainBtn: {
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 999,
    alignItems: 'center',
    minWidth: 260,
  },
  mainBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
})
