import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors } from '../lib/colors'

export default function MetricCard({ children, style }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  )
}

export function SectionBadge({ icon, label, color = Colors.primary }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '18' }]}>
      <Text style={{ fontSize: 12 }}>{icon}</Text>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  )
}

export function BigNumber({ value, label, color = Colors.primary }) {
  return (
    <View style={styles.bigNumWrap}>
      <Text style={[styles.bigNum, { color }]}>{value}</Text>
      <Text style={styles.bigNumLabel}>{label}</Text>
    </View>
  )
}

export function StatRow({ label, value, color = Colors.onSurface }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  )
}

export function ProgressBar({ pct, color = Colors.primary, label }) {
  return (
    <View style={styles.progressWrap}>
      {label && <Text style={styles.progressLabel}>{label}</Text>}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.progressPct, { color }]}>%{pct}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  bigNumWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  bigNum: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -2,
  },
  bigNumLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant + '99',
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.onSurfaceVariant + '99',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressWrap: {
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant + '80',
    marginBottom: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
})
