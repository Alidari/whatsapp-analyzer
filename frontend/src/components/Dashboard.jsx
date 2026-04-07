import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import CountUp from './CountUp'

const COLORS = {
  primary: '#59dcb5',
  secondary: '#bbc3ff',
  tertiary: '#f8acff',
  surface: '#2d363e',
  error: '#ffb4ab',
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

function MetricCard({ children, className = '', span = '' }) {
  return (
    <motion.div
      variants={cardVariants}
      className={`bg-surface-container-low rounded-2xl p-6 md:p-8 relative overflow-hidden ${span} ${className}`}
    >
      {children}
    </motion.div>
  )
}

function SectionLabel({ icon, label, color = 'text-primary' }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-highest text-xs font-label uppercase tracking-widest ${color} mb-4`}>
      <span className="material-symbols-outlined material-symbols-filled text-sm">{icon}</span>
      {label}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-container-highest/95 backdrop-blur-lg border border-outline-variant/20 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-on-surface-variant font-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-headline font-bold" style={{ color: p.color || COLORS.primary }}>
          {p.value} mesaj
        </p>
      ))}
    </div>
  )
}

export default function Dashboard({ data, onShowStories }) {
  const m = data.metrics
  const g = m.general
  const senders = g.senders

  return (
    <motion.main
      key="dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-28 pb-24 px-4 md:px-6 max-w-7xl mx-auto"
    >
      {/* ═══ HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10"
      >
        <div>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter mb-2">
            Analiz <span className="text-primary italic">Sonuçları</span>
          </h1>
          <p className="text-on-surface-variant font-label text-sm">
            {senders.join(' & ')} • {g.date_range.start.slice(0, 10)} → {g.date_range.end.slice(0, 10)} • {data.analysis_time_seconds}s
          </p>
        </div>
        <button
          onClick={onShowStories}
          className="editorial-gradient text-on-primary font-headline font-bold py-3 px-8 rounded-full hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-xl">auto_stories</span>
          Hikaye Modunu Aç
        </button>
      </motion.div>

      {/* ═══ STATS HERO ═══ */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
      >
        {[
          { label: 'Toplam Mesaj', value: g.total_messages, icon: 'chat', color: 'text-primary' },
          { label: 'Toplam Kelime', value: g.total_words, icon: 'text_fields', color: 'text-secondary' },
          { label: 'Aktif Gün', value: g.date_range.days_span, icon: 'calendar_month', color: 'text-tertiary' },
          { label: '📖 Kitap Sayfası', value: g.book_equivalent_pages, icon: 'menu_book', color: 'text-primary' },
        ].map((stat) => (
          <MetricCard key={stat.label}>
            <div className={`material-symbols-outlined material-symbols-filled ${stat.color} text-2xl mb-3`}>{stat.icon}</div>
            <div className={`text-3xl md:text-4xl font-headline font-black ${stat.color} mb-1`}>
              <CountUp end={stat.value} />
            </div>
            <div className="text-xs text-on-surface-variant/70 font-label">{stat.label}</div>
          </MetricCard>
        ))}
      </motion.div>

      {/* ═══ MAIN GRID ═══ */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {/* ── VIBE CHECK ── */}
        <MetricCard span="md:col-span-2 lg:col-span-1">
          <SectionLabel icon="favorite" label="Vibe Check" color="text-tertiary" />
          <div className="text-center mb-4">
            <div className="text-5xl font-headline font-black neon-text-primary mb-2">
              {m.vibe_check.mood_label_tr}
            </div>
          </div>
          <div className="flex gap-3">
            {[
              { label: 'Pozitif', pct: m.vibe_check.positive_pct, color: COLORS.primary },
              { label: 'Nötr', pct: m.vibe_check.neutral_pct, color: COLORS.surface },
              { label: 'Negatif', pct: m.vibe_check.negative_pct, color: COLORS.error },
            ].map((s) => (
              <div key={s.label} className="flex-1">
                <div className="text-xs font-label text-on-surface-variant/60 mb-1">{s.label}</div>
                <div className="h-3 rounded-full bg-surface-container-highest overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: s.color }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${s.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                  />
                </div>
                <div className="text-sm font-headline font-bold mt-1" style={{ color: s.color }}>%{s.pct}</div>
              </div>
            ))}
          </div>
          {/* Per sender sentiment */}
          <div className="mt-4 space-y-2">
            {senders.map((s, i) => {
              const sd = m.vibe_check.per_sender[s]
              return (
                <div key={s} className="flex items-center justify-between text-sm">
                  <span className="font-headline font-bold" style={{ color: i === 0 ? COLORS.primary : COLORS.tertiary }}>{s}</span>
                  <span className="text-on-surface-variant/60 font-label">ort: {sd.avg_sentiment}</span>
                </div>
              )
            })}
          </div>
        </MetricCard>

        {/* ── TARTIŞMA SKORU ── */}
        <MetricCard>
          <SectionLabel icon="local_fire_department" label="Gerginlik" color="text-error" />
          <div className="text-center mb-6">
            <div className="text-6xl font-headline font-black text-error neon-text-tertiary">
              <CountUp end={m.argument_score.tension_index} decimals={1} />
            </div>
            <div className="text-sm text-on-surface-variant/70 font-label">/100 {m.argument_score.tension_label}</div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant/60 font-label">🔠 CAPS Kralı</span>
              <span className="font-headline font-bold text-secondary">{m.argument_score.caps_lock_king}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant/60 font-label">❗ Ünlem Şampiyonu</span>
              <span className="font-headline font-bold text-secondary">{m.argument_score.exclamation_champion}</span>
            </div>
          </div>
        </MetricCard>

        {/* ── BARIŞ ELÇİSİ ── */}
        <MetricCard>
          <SectionLabel icon="volunteer_activism" label="Barış Elçisi" color="text-tertiary" />
          <div className="text-center mb-4">
            <div className="w-16 h-16 rounded-full editorial-gradient mx-auto flex items-center justify-center mb-3">
              <span className="material-symbols-outlined material-symbols-filled text-on-primary text-3xl">emoji_people</span>
            </div>
            <div className="text-2xl font-headline font-black text-primary">
              {m.peace_ambassador.ambassador}
            </div>
            <div className="text-xs text-on-surface-variant/60 font-label mt-1">daha çok barışçıl 🕊️</div>
          </div>
          <div className="space-y-2">
            {senders.map((s) => {
              const pd = m.peace_ambassador.per_sender[s]
              return (
                <div key={s} className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="font-headline font-bold">{s}</span>
                    <span className="text-tertiary font-label">{pd.peace_count}x</span>
                  </div>
                  {pd.top_phrases.slice(0, 2).map((p) => (
                    <span key={p.phrase} className="inline-block px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary text-xs mr-1 mb-1 font-label">
                      "{p.phrase}" ×{p.count}
                    </span>
                  ))}
                </div>
              )
            })}
          </div>
        </MetricCard>

        {/* ── STREAK ── */}
        <MetricCard>
          <SectionLabel icon="local_fire_department" label="Konuşma Streaki" />
          <div className="text-center">
            <div className="text-7xl font-headline font-black text-primary neon-text-primary mb-2">
              <CountUp end={m.streak.longest_streak} />
            </div>
            <div className="text-lg font-headline font-bold text-on-surface-variant/70 mb-4">gün aralıksız! 🔥</div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-surface-container rounded-xl p-3">
                <div className="text-xl font-headline font-bold text-secondary"><CountUp end={m.streak.total_active_days} /></div>
                <div className="text-[10px] text-on-surface-variant/50 font-label">Aktif Gün</div>
              </div>
              <div className="bg-surface-container rounded-xl p-3">
                <div className="text-xl font-headline font-bold text-tertiary">%<CountUp end={m.streak.activity_rate_pct} decimals={0} /></div>
                <div className="text-[10px] text-on-surface-variant/50 font-label">Aktivite</div>
              </div>
            </div>
          </div>
        </MetricCard>

        {/* ── GECE KUŞU ── */}
        <MetricCard>
          <SectionLabel icon="dark_mode" label="Gece Kuşu" color="text-secondary" />
          <div className="text-center mb-4">
            <div className="text-3xl font-headline font-black text-secondary neon-text-secondary mb-1">
              {m.night_owl.night_owl}
            </div>
            <div className="text-xs text-on-surface-variant/60 font-label">gece en aktif kişi 🦉</div>
          </div>
          <div className="space-y-3">
            {senders.map((s, i) => {
              const nd = m.night_owl.per_sender[s]
              return (
                <div key={s}>
                  <div className="flex justify-between text-xs font-label mb-1">
                    <span className="font-headline font-bold" style={{ color: i === 0 ? COLORS.primary : COLORS.tertiary }}>{s}</span>
                    <span className="text-on-surface-variant/50">Zirve: {nd.peak_hour}:00</span>
                  </div>
                  <div className="flex gap-1">
                    {['night', 'morning', 'daytime', 'evening'].map((period) => {
                      const pct = nd[`${period}_pct`]
                      const colors = { night: '#bbc3ff', morning: '#f8acff', daytime: '#59dcb5', evening: '#ffb4ab' }
                      return (
                        <div key={period} className="flex-1">
                          <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: colors[period] }}
                              initial={{ width: 0 }}
                              whileInView={{ width: `${pct}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.8 }}
                            />
                          </div>
                          <div className="text-[9px] text-on-surface-variant/40 mt-0.5 font-label">
                            {period === 'night' ? 'Gece' : period === 'morning' ? 'Sabah' : period === 'daytime' ? 'Gündüz' : 'Akşam'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </MetricCard>

        {/* ── YANIT SÜRESİ ── */}
        <MetricCard>
          <SectionLabel icon="schedule" label="Yanıt Süreleri" color="text-secondary" />
          <div className="space-y-4">
            {senders.map((s, i) => {
              const rt = m.response_times.per_sender[s]
              const isfast = s === m.response_times.fastest_responder
              return (
                <div key={s} className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isfast ? 'editorial-gradient' : 'bg-surface-container-highest'}`}>
                    <span className="material-symbols-outlined material-symbols-filled text-xl" style={{ color: isfast ? '#00382a' : '#889390' }}>
                      {isfast ? 'bolt' : 'hourglass_top'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-headline font-bold text-sm">{s}</div>
                    <div className="text-xs text-on-surface-variant/60 font-label">
                      ort {rt.avg_response_minutes}dk • ghost {rt.ghost_count}x
                    </div>
                  </div>
                  <div className={`text-2xl font-headline font-black ${isfast ? 'text-primary' : 'text-on-surface-variant/50'}`}>
                    {rt.avg_response_minutes}<span className="text-sm">dk</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-surface-container text-xs text-on-surface-variant/70 font-label">
            💬 {m.response_times.fun_fact}
          </div>
        </MetricCard>

        {/* ── MESAJ TARZI ── */}
        <MetricCard>
          <SectionLabel icon="history_edu" label="Mesaj Tarzı" />
          <div className="space-y-4">
            {senders.map((s, i) => {
              const ms = m.message_style.per_sender[s]
              const isNovelist = s === m.message_style.novelist
              return (
                <div key={s}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-headline font-bold text-sm" style={{ color: i === 0 ? COLORS.primary : COLORS.tertiary }}>{s}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-label" style={{
                      background: isNovelist ? 'rgba(89,220,181,0.15)' : 'rgba(248,172,255,0.15)',
                      color: isNovelist ? COLORS.primary : COLORS.tertiary,
                    }}>
                      {isNovelist ? '📖 Roman Yazarı' : '📟 Telgrafçı'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-surface-container rounded-lg p-2">
                      <div className="text-lg font-headline font-bold">{ms.avg_words}</div>
                      <div className="text-[9px] text-on-surface-variant/50 font-label">ort kelime</div>
                    </div>
                    <div className="bg-surface-container rounded-lg p-2">
                      <div className="text-lg font-headline font-bold">{ms.total_messages}</div>
                      <div className="text-[9px] text-on-surface-variant/50 font-label">mesaj</div>
                    </div>
                    <div className="bg-surface-container rounded-lg p-2">
                      <div className="text-lg font-headline font-bold">%{ms.one_word_pct}</div>
                      <div className="text-[9px] text-on-surface-variant/50 font-label">tek kelime</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </MetricCard>

        {/* ── EMOJI EVRENI ── */}
        <MetricCard>
          <SectionLabel icon="mood" label="Emoji Evreni" color="text-tertiary" />
          <div className="text-center mb-4">
            <div className="text-3xl font-headline font-black text-tertiary">
              <CountUp end={m.emoji_universe.total_emojis} />
            </div>
            <div className="text-xs text-on-surface-variant/60 font-label">toplam emoji</div>
          </div>
          <div className="space-y-3">
            {senders.map((s, i) => {
              const eu = m.emoji_universe.per_sender[s]
              return (
                <div key={s}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-headline font-bold" style={{ color: i === 0 ? COLORS.primary : COLORS.tertiary }}>{s}</span>
                    <span className="text-on-surface-variant/50 font-label">{eu.total} emoji</span>
                  </div>
                  <div className="flex gap-2">
                    {eu.top_3.map((e, j) => (
                      <div key={j} className="flex-1 bg-surface-container rounded-xl p-2 text-center">
                        <div className="text-2xl mb-0.5">{e.emoji}</div>
                        <div className="text-[10px] text-on-surface-variant/50 font-label">×{e.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </MetricCard>

        {/* ── ZAMAN ÇİZELGESİ (Aylık) ── */}
        <MetricCard span="md:col-span-2 lg:col-span-2">
          <SectionLabel icon="timeline" label="Zaman Çizelgesi" color="text-secondary" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.timeline.monthly} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#bec9c5', fontSize: 10, fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#bec9c5', fontSize: 10, fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(89,220,181,0.05)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="url(#barGradient)" />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#59dcb5" />
                    <stop offset="100%" stopColor="#006c54" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </MetricCard>

        {/* ── HAFTALIK DAĞILIM ── */}
        <MetricCard>
          <SectionLabel icon="date_range" label="Haftalık" />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.timeline.weekly} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="day"
                  type="category"
                  tick={{ fill: '#bec9c5', fontSize: 11, fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(89,220,181,0.05)' }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="url(#weekGradient)" barSize={16} />
                <defs>
                  <linearGradient id="weekGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#006c54" />
                    <stop offset="100%" stopColor="#59dcb5" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </MetricCard>

        {/* ── KELİME BULUTU ── */}
        <MetricCard span="md:col-span-2 lg:col-span-3">
          <SectionLabel icon="cloud" label="Kelime Bulutu" />
          <div className="flex flex-wrap gap-2 justify-center">
            {m.word_cloud.combined.slice(0, 40).map((w, i) => {
              const maxCount = m.word_cloud.combined[0]?.count || 1
              const ratio = w.count / maxCount
              const fontSize = 12 + ratio * 28
              const opacity = 0.4 + ratio * 0.6
              const colors = [COLORS.primary, COLORS.secondary, COLORS.tertiary]
              const color = colors[i % colors.length]
              return (
                <motion.span
                  key={w.word}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.02 }}
                  className="font-headline font-bold cursor-default hover:scale-110 transition-transform"
                  style={{ fontSize, color }}
                  title={`${w.count}x`}
                >
                  {w.word}
                </motion.span>
              )
            })}
          </div>
        </MetricCard>

        {/* ── KİŞİ BAZLI MESAJ DAGILIMI ── */}
        <MetricCard span="md:col-span-2 lg:col-span-1">
          <SectionLabel icon="group" label="Mesaj Dağılımı" />
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={senders.map((s, i) => ({
                    name: s,
                    value: g.per_sender[s].message_count,
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  <Cell fill={COLORS.primary} />
                  <Cell fill={COLORS.tertiary} />
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-surface-container-highest/95 backdrop-blur-lg border border-outline-variant/20 rounded-xl px-4 py-3 shadow-2xl">
                        <p className="text-sm font-headline font-bold" style={{ color: payload[0].payload.fill }}>
                          {payload[0].name}: {payload[0].value} mesaj
                        </p>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4">
            {senders.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5 text-xs font-label">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: i === 0 ? COLORS.primary : COLORS.tertiary }} />
                {s} (%{g.per_sender[s].message_pct})
              </div>
            ))}
          </div>
        </MetricCard>

        {/* ── SAATLIK HEATMAP ── */}
        <MetricCard span="md:col-span-2">
          <SectionLabel icon="grid_view" label="Saatlik Aktivite" color="text-secondary" />
          <div className="overflow-x-auto">
            <div className="grid gap-[2px]" style={{ gridTemplateColumns: `40px repeat(24, 1fr)` }}>
              {/* Header row */}
              <div />
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="text-[8px] text-on-surface-variant/40 text-center font-label">{i}</div>
              ))}
              {/* Day rows */}
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, dayIdx) => (
                <>
                  <div key={`label-${day}`} className="text-[10px] text-on-surface-variant/60 font-label flex items-center">{day}</div>
                  {Array.from({ length: 24 }, (_, hourIdx) => {
                    const cell = m.timeline.heatmap.find(h => h.day === day && h.hour === hourIdx)
                    const count = cell?.count || 0
                    const maxCount = Math.max(...m.timeline.heatmap.map(h => h.count), 1)
                    const intensity = count / maxCount
                    return (
                      <motion.div
                        key={`${day}-${hourIdx}`}
                        className="aspect-square rounded-sm cursor-default"
                        style={{
                          backgroundColor: count === 0
                            ? 'rgba(45,54,62,0.3)'
                            : `rgba(89,220,181,${0.1 + intensity * 0.8})`,
                        }}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: (dayIdx * 24 + hourIdx) * 0.003 }}
                        title={`${day} ${hourIdx}:00 — ${count} mesaj`}
                      />
                    )
                  })}
                </>
              ))}
            </div>
          </div>
        </MetricCard>
      </motion.div>
    </motion.main>
  )
}
