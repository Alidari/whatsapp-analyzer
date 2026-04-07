import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors, MoodColors, MoodIcons } from '../lib/colors'

export default function HistoryCard({ analysis, onPress, onDelete }) {
  const mood = analysis.overall_mood || 'Balanced'
  const moodStyle = MoodColors[mood] || MoodColors.Balanced
  const moodIcon = MoodIcons[mood] || '📊'

  const formatDate = (iso) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return iso.slice(0, 10)
    }
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Mood Strip */}
      <View style={[styles.moodStrip, { backgroundColor: moodStyle.bg }]} />

      <View style={styles.body}>
        {/* Top row */}
        <View style={styles.topRow}>
          <Text style={styles.chatName} numberOfLines={1}>
            {analysis.chat_name || 'İsimsiz Analiz'}
          </Text>
          <Text style={styles.moodIcon}>{moodIcon}</Text>
        </View>

        {/* Senders */}
        <View style={styles.senderRow}>
          {(analysis.sender_names || []).slice(0, 3).map((name, i) => (
            <View key={i} style={styles.senderTag}>
              <Text style={styles.senderText}>{name}</Text>
            </View>
          ))}
          {(analysis.sender_names || []).length > 3 && (
            <Text style={styles.senderMore}>+{analysis.sender_names.length - 3}</Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Text style={styles.statText}>
            💬 {(analysis.total_messages || 0).toLocaleString('tr-TR')} mesaj
          </Text>
          <Text style={styles.statText}>
            📅 {formatDate(analysis.date_range_start)}
          </Text>
        </View>

        {/* Mood Label */}
        {analysis.mood_label && (
          <Text style={styles.moodLabel}>
            Vibe: <Text style={[styles.moodLabelBold, { color: moodStyle.text }]}>{analysis.mood_label}</Text>
          </Text>
        )}

        {/* Bottom row */}
        <View style={styles.bottomRow}>
          <Text style={styles.createdAt}>
            {analysis.created_at
              ? new Date(analysis.created_at).toLocaleDateString('tr-TR', {
                  day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                })
              : ''}
          </Text>
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>🗑</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
  },
  moodStrip: {
    height: 4,
  },
  body: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.onSurface,
    flex: 1,
    marginRight: 8,
  },
  moodIcon: {
    fontSize: 22,
  },
  senderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  senderTag: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  senderText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  senderMore: {
    fontSize: 11,
    color: Colors.onSurfaceVariant + '80',
    alignSelf: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  statText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant + '99',
  },
  moodLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant + '80',
    marginBottom: 10,
  },
  moodLabelBold: {
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant + '20',
    paddingTop: 10,
  },
  createdAt: {
    fontSize: 11,
    color: Colors.onSurfaceVariant + '60',
  },
  deleteBtn: {
    padding: 4,
  },
  deleteText: {
    fontSize: 16,
  },
})
