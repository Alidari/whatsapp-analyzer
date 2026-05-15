import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native'
import { useState, useRef } from 'react'
import { Ionicons } from '@expo/vector-icons'
import ViewShot from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { PieChart, BarChart } from 'react-native-chart-kit'
import { Colors } from '../lib/colors'
import MetricCard, { SectionBadge, BigNumber, StatRow, ProgressBar } from '../components/MetricCard'
import { AppBannerAd } from '../components/Ads'

const SCREEN_W = Dimensions.get('window').width

const chartConfig = {
  backgroundGradientFrom: Colors.surfaceContainerLow,
  backgroundGradientTo: Colors.surfaceContainerLow,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(89,220,181,${opacity})`,
  labelColor: () => Colors.onSurfaceVariant,
  fillShadowGradient: Colors.primary,
  fillShadowGradientOpacity: 0.6,
  barPercentage: 0.6,
  propsForBackgroundLines: {
    strokeDasharray: '',
    stroke: Colors.outlineVariant + '20',
  },
}

export default function DashboardScreen() {
  const router = useRouter()
  const { data: rawData } = useLocalSearchParams()
  const [isSharing, setIsSharing] = useState(false)
  const viewShotRef = useRef(null)

  let analysisData
  try {
    analysisData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
  } catch {
    router.replace('/')
    return null
  }

  const m = analysisData?.metrics || analysisData
  
  if (!m || !m.general) {
    console.log('Dashboard: Missing metrics or general data')
    return null
  }

  const g = m.general
  const senders = g.senders || []

  const handleShare = async () => {
    if (isSharing) return
    setIsSharing(true)
    try {
      const uri = await viewShotRef.current.capture()
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Dashboard Paylaş',
        UTI: 'public.png'
      })
    } catch (err) {
      console.error('Share error:', err)
    } finally {
      setIsSharing(false)
    }
  }

  const goToStories = () => {
    router.push({
      pathname: '/stories',
      params: { data: typeof rawData === 'string' ? rawData : JSON.stringify(rawData) },
    })
  }

  // Prepare chart data
  const pieData = senders.map((s, i) => ({
    name: s,
    population: g.per_sender[s].message_count,
    color: i === 0 ? Colors.primary : Colors.tertiary,
    legendFontColor: Colors.onSurfaceVariant,
    legendFontSize: 11,
  }))

  const weeklyLabels = m.timeline?.weekly?.map(d => d.day) || []
  const weeklyValues = m.timeline?.weekly?.map(d => d.count) || []

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ═══ HEADER ═══ */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.replace('/')} 
          style={styles.backBtn}
        >
          <Text style={{ fontSize: 28, color: Colors.primary, fontWeight: '600' }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            Analiz <Text style={styles.headerAccent}>Sonuçları</Text>
          </Text>
          <Text style={styles.headerSub}>
            {senders.join(' & ')} • {g.date_range.days_span} gün
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={handleShare} activeOpacity={0.8}>
            <View style={styles.shareIconBtn}>
              {isSharing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="share-social-outline" size={20} color="#fff" />}
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={goToStories} activeOpacity={0.85}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryContainer]}
              style={styles.storyBtn}
            >
              <Text style={styles.storyBtnText}>📖 Hikayeler</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
        <View style={{ backgroundColor: Colors.background, paddingBottom: 20 }}>
          {/* Hero stats and cards will be inside this */}

      {/* ═══ HERO STATS ═══ */}
      <View style={styles.heroGrid}>
        {[
          { label: 'Toplam Mesaj', value: g.total_messages.toLocaleString('tr-TR'), icon: '💬', color: Colors.primary },
          { label: 'Toplam Kelime', value: g.total_words.toLocaleString('tr-TR'), icon: '📝', color: Colors.secondary },
          { label: 'Aktif Gün', value: g.date_range.days_span, icon: '📅', color: Colors.tertiary },
          { label: 'Kitap Sayfası', value: g.book_equivalent_pages, icon: '📖', color: Colors.primary },
        ].map((stat) => (
          <View key={stat.label} style={styles.heroCard}>
            <Text style={{ fontSize: 18 }}>{stat.icon}</Text>
            <Text style={[styles.heroValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.heroLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* ═══ GRUP ÖDÜLLERİ (Sadece Gruplar İçin) ═══ */}
      {m.group_dynamics?.is_group && (
        <MetricCard>
          <SectionBadge icon="🏆" label="Grup Ödülleri" color={Colors.primary} />
          {Object.entries(m.group_dynamics.awards || {}).map(([key, award]) => (
            <View key={key} style={styles.awardRow}>
              <View style={styles.awardIcon}>
                <Text style={{ fontSize: 24 }}>
                  {key === 'quiet_one' ? '🤫' : 
                   key === 'sticker_monster' ? '🖼️' : 
                   key === 'ghost_king' ? '👻' : 
                   key === 'spokesperson' ? '📢' : 
                   key === 'night_owl' ? '🦉' : '🏅'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.awardTitle}>{award.title}</Text>
                <Text style={styles.awardName}>{award.name}</Text>
                <Text style={styles.awardDesc}>{award.desc}</Text>
              </View>
            </View>
          ))}
        </MetricCard>
      )}

      {/* ═══ VIBE CHECK (Gruplarda Daha Sade) ═══ */}
      <MetricCard>
        <SectionBadge icon="💕" label="Vibe Check" color={Colors.tertiary} />
        <BigNumber value={m.vibe_check.mood_label_tr} label="" color={Colors.primary} />
        <View style={styles.vibeRow}>
          <ProgressBar pct={m.vibe_check.positive_pct} color={Colors.primary} label="Pozitif" />
          <ProgressBar pct={m.vibe_check.neutral_pct} color={Colors.outline} label="Nötr" />
          <ProgressBar pct={m.vibe_check.negative_pct} color={Colors.error} label="Negatif" />
        </View>
      </MetricCard>

      {/* ═══ STREAK ═══ */}
      <MetricCard>
        <SectionBadge icon="🔥" label="Konuşma Streaki" />
        <BigNumber value={m.streak.longest_streak} label="gün aralıksız! 🔥" />
        <View style={styles.miniGrid}>
          <View style={styles.miniCard}>
            <Text style={[styles.miniValue, { color: Colors.secondary }]}>{m.streak.total_active_days}</Text>
            <Text style={styles.miniLabel}>Aktif Gün</Text>
          </View>
          <View style={styles.miniCard}>
            <Text style={[styles.miniValue, { color: Colors.tertiary }]}>%{m.streak.activity_rate_pct}</Text>
            <Text style={styles.miniLabel}>Aktivite</Text>
          </View>
        </View>
      </MetricCard>

      {/* ═══ GERGİNLİK ═══ */}
      <MetricCard>
        <SectionBadge icon="🌡️" label="Gerginlik" color={Colors.error} />
        <BigNumber
          value={`${m.argument_score.tension_index}`}
          label={`/100 ${m.argument_score.tension_label}`}
          color={m.argument_score.tension_index > 40 ? Colors.error : Colors.secondary}
        />
        <StatRow label="🔠 CAPS Kralı" value={m.argument_score.caps_lock_king} color={Colors.secondary} />
        <StatRow label="❗ Ünlem Şampiyonu" value={m.argument_score.exclamation_champion} color={Colors.secondary} />
      </MetricCard>

      {/* ═══ ÖZÜR ANALİZİ (Gruplarda Gizle veya Kişi Bazlı Göster) ═══ */}
      {!m.group_dynamics?.is_group && (
        <MetricCard>
          <SectionBadge icon="🙏" label="Özür Analizi" color={Colors.secondary} />
          {m.apology_analysis.ambassador === "Yok" ? (
            <BigNumber value="Sıfır Özür" label="Kimseden çıt çıkmadı! 🤐" color={Colors.outline} />
          ) : (
            <>
              <BigNumber 
                value={m.apology_analysis.ambassador} 
                label="En çok özür dileyen! 🕊️" 
                color={Colors.primary} 
              />
              {senders.map(s => {
                const ap = m.apology_analysis.per_sender[s]
                return (
                  <StatRow 
                    key={s}
                    label={s} 
                    value={`${ap.apology_count} kez özür / barış isteği`} 
                    color={Colors.onSurface} 
                  />
                )
              })}
            </>
          )}
        </MetricCard>
      )}

      {/* ═══ YANIT SÜRESİ ═══ */}
      <MetricCard>
        <SectionBadge icon="⚡" label="Yanıt Süreleri" color={Colors.secondary} />
        {senders.map((s) => {
          const rt = m.response_times.per_sender[s]
          const isFast = s === m.response_times.fastest_responder
          return (
            <View key={s} style={styles.responderRow}>
              <View style={[styles.responderIcon, isFast && styles.responderIconFast]}>
                <Text style={{ fontSize: 18 }}>{isFast ? '⚡' : '⏳'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.responderName}>{s}</Text>
                <Text style={styles.responderDetail}>
                  ort {rt.avg_response_minutes}dk • ghost {rt.ghost_count}x
                </Text>
              </View>
              <Text style={[styles.responderTime, isFast && { color: Colors.primary }]}>
                {rt.avg_response_minutes}dk
              </Text>
            </View>
          )
        })}
        <View style={styles.funFact}>
          <Text style={styles.funFactText}>💬 {m.response_times.fun_fact}</Text>
        </View>
      </MetricCard>

      {/* ═══ EMOJİ EVRENİ ═══ */}
      <MetricCard>
        <SectionBadge icon="🎭" label="Emoji Evreni" color={Colors.tertiary} />
        <BigNumber value={m.emoji_universe.total_emojis} label="toplam emoji" color={Colors.tertiary} />
        {senders.map((s) => {
          const eu = m.emoji_universe.per_sender[s]
          return (
            <View key={s} style={{ marginBottom: 12 }}>
              <View style={styles.emojiHeader}>
                <Text style={styles.emojiSender}>{s}</Text>
                <Text style={styles.emojiCount}>{eu.total} emoji</Text>
              </View>
              <View style={styles.emojiRow}>
                {eu.top_3.map((e, j) => (
                  <View key={j} style={styles.emojiChip}>
                    <Text style={styles.emojiChar}>{e.emoji}</Text>
                    <Text style={styles.emojiChipCount}>×{e.count}</Text>
                  </View>
                ))}
              </View>
            </View>
          )
        })}
      </MetricCard>

      {/* ═══ MESAJ DAĞILIMI (Pie) ═══ */}
      <MetricCard>
        <SectionBadge icon="👥" label="Mesaj Dağılımı" />
        <PieChart
          data={pieData}
          width={SCREEN_W - 80}
          height={180}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="20"
          absolute
        />
      </MetricCard>

      {/* ═══ HAFTALIK (Bar) ═══ */}
      {weeklyLabels.length > 0 && (
        <MetricCard>
          <SectionBadge icon="📅" label="Haftalık Dağılım" />
          <BarChart
            data={{
              labels: weeklyLabels,
              datasets: [{ data: weeklyValues }],
            }}
            width={SCREEN_W - 80}
            height={200}
            chartConfig={chartConfig}
            style={{ borderRadius: 12 }}
            fromZero
            showBarTops={false}
          />
        </MetricCard>
      )}

      {/* ═══ KELİME BULUTU ═══ */}
      <MetricCard>
        <SectionBadge icon="☁️" label="Kelime Bulutu" />
        <View style={styles.wordCloud}>
          {(m.word_cloud?.combined || []).slice(0, 30).map((w, i) => {
            const maxCount = m.word_cloud.combined[0]?.count || 1
            const ratio = w.count / maxCount
            const fontSize = 12 + ratio * 24
            const colors = [Colors.primary, Colors.secondary, Colors.tertiary]
            return (
              <Text
                key={w.word}
                style={{
                  fontSize,
                  fontWeight: '700',
                  color: colors[i % 3],
                  marginRight: 8,
                  marginBottom: 6,
                }}
              >
                {w.word}
              </Text>
            )
          })}
        </View>
      </MetricCard>

      {/* ═══ KÜFÜR ANALİZİ ═══ */}
      {m.profanity && (
        <MetricCard>
          <SectionBadge
            icon={m.profanity.total_profanity === 0 ? '😇' : '🤬'}
            label="Küfür Raporu"
            color={m.profanity.total_profanity === 0 ? Colors.primary : Colors.error}
          />
          {m.profanity.total_profanity === 0 ? (
            <BigNumber value="Tertemiz ✨" label="Bu sohbette küfür yok!" color={Colors.primary} />
          ) : (
            <>
              <BigNumber
                value={m.profanity.total_profanity}
                label={m.profanity.profanity_density_label}
                color={Colors.error}
              />
              
              {/* Genel En Çok Edilen Küfürler */}
              <View style={styles.topProfanitySection}>
                <Text style={styles.topProfanityTitle}>En Çok Edilenler (Genel)</Text>
                <View style={styles.profanityChipRow}>
                  {(m.profanity.top_5_overall || []).map((p, i) => (
                    <View key={i} style={styles.profanityChip}>
                      <Text style={styles.profanityChipText}>{p.word}</Text>
                      <Text style={styles.profanityChipCount}>x{p.count}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.divider} />

              {senders.map(s => {
                const pd = m.profanity.per_sender?.[s]
                if (!pd || pd.profanity_count === 0) return null
                return (
                  <View key={s} style={{ marginBottom: 16 }}>
                    <StatRow
                      label={`${s}`}
                      value={`${pd.profanity_count} küfür (${pd.density_label})`}
                      color={Colors.error}
                    />
                    <View style={[styles.profanityChipRow, { marginTop: 4 }]}>
                      {(pd.top_profanities || []).map((p, i) => (
                        <View key={i} style={[styles.profanityChip, { backgroundColor: Colors.surfaceContainerHighest }]}>
                          <Text style={[styles.profanityChipText, { fontSize: 10 }]}>{p.word}</Text>
                          <Text style={[styles.profanityChipCount, { fontSize: 9 }]}>x{p.count}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )
              })}
            </>
          )}
        </MetricCard>
      )}

    </View>
    </ViewShot>

      {/* Footer padding for banner ad */}
      <View style={{ height: 80 }} />
    </ScrollView>

    {/* Banner Reklam — ScrollView dışında, ekranın altında */}
    <AppBannerAd />
  </View>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.onSurface,
    letterSpacing: -1,
  },
  headerAccent: {
    color: Colors.primary,
    fontStyle: 'italic',
  },
  headerSub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant + '99',
    marginTop: 4,
  },
  storyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  storyBtnText: {
    color: Colors.onPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  heroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  heroCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  heroValue: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 6,
    letterSpacing: -1,
  },
  heroLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant + '80',
    marginTop: 4,
  },
  vibeRow: {
    gap: 12,
  },
  miniGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  miniCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  miniValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  miniLabel: {
    fontSize: 10,
    color: Colors.onSurfaceVariant + '80',
    marginTop: 4,
  },
  responderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  responderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responderIconFast: {
    backgroundColor: Colors.primary + '30',
  },
  responderName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  responderDetail: {
    fontSize: 11,
    color: Colors.onSurfaceVariant + '80',
    marginTop: 2,
  },
  responderTime: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.onSurfaceVariant + '60',
  },
  funFact: {
    marginTop: 8,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 14,
    padding: 12,
  },
  funFactText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant + 'BB',
    lineHeight: 18,
  },
  emojiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  emojiSender: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  emojiCount: {
    fontSize: 12,
    color: Colors.onSurfaceVariant + '80',
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emojiChip: {
    flex: 1,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  emojiChar: {
    fontSize: 24,
    marginBottom: 4,
  },
  emojiChipCount: {
    fontSize: 10,
    color: Colors.onSurfaceVariant + '80',
  },
  wordCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 8,
  },
  shareIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  awardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    backgroundColor: Colors.surfaceContainer,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '30',
  },
  awardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryContainer + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  awardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  awardName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 4,
  },
  awardDesc: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  topProfanitySection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 16,
  },
  topProfanityTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  profanityChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  profanityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.error + '20',
  },
  profanityChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.error,
    marginRight: 4,
  },
  profanityChipCount: {
    fontSize: 10,
    color: Colors.error + '80',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.outlineVariant + '20',
    marginVertical: 16,
  },
})
