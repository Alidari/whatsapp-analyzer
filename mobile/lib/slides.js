import { Colors } from '../lib/colors'

/**
 * Web StoryMode'daki generateStorySlides fonksiyonunun mobil versiyonu.
 * Icon'lar emoji olarak, gradient'ler renk array'leri olarak döner.
 */
export function generateStorySlides(metrics) {
  const m = metrics
  const g = m.general
  const senders = g.senders
  const isGroup = m.group_dynamics?.is_group

  if (isGroup) {
    const gd = m.group_dynamics
    const awards = gd.awards || {}

    return [
      // ── 1: Grup Genel Bakış ──
      {
        question: 'Bu kalabalık grupta neler dönmüş merak ediyor musun? 🧐',
        gradient: ['#0b141b', '#006c54', '#004d3d'],
        icon: '👥',
        badge: 'GRUP ANALİZİ',
        title: `${g.total_messages.toLocaleString('tr-TR')} mesajla ortalık yıkılmış!`,
        titleAccent: Colors.primary,
        subtitle: `Bu grupta tam ${senders.length} kişi var. ${g.date_range.days_span} gündür durmadan yazışıyorsunuz.`,
      },

      // ── 2: Liderlik Tablosu ──
      {
        question: 'Grupta en çok kimin borusu ötüyor? İşte mesaj şampiyonları!',
        gradient: ['#0b141b', '#570067', '#350040'],
        icon: '👑',
        badge: 'LİDERLİK TABLOSU',
        title: `Grup Lideri: ${gd.leaderboard?.[0]?.name || ''}`,
        titleAccent: Colors.tertiary,
        subtitle: gd.leaderboard?.slice(0, 5).map((l, i) => `${i+1}. ${l.name} (${l.count} mesaj)`).join('\n') || '',
      },

      // ── 3: Sticker Canavarı ──
      awards.sticker_monster ? {
        question: 'Kelimeler yetmeyince grupta sticker savaşı başlatan o kişi...',
        gradient: ['#0b141b', '#0369a1', '#082f49'],
        icon: '🖼️',
        badge: 'STICKER CANAVARI',
        title: `${awards.sticker_monster.name} sticker atmaktan yazmaya vakit bulamıyor!`,
        titleAccent: Colors.primary,
        subtitle: `${awards.sticker_monster.count} sticker ile grubun görsel yönetmeni seçildi.`,
      } : null,

      // ── 4: Görülmedi Kralı ──
      awards.ghost_king ? {
        question: 'Attığı mesajla grubu buz kestiren, derin sessizliklere yol açan o arkadaş...',
        gradient: ['#0b141b', '#93000a', '#690005'],
        icon: '👻',
        badge: 'GÖRÜLMEDİ KRALI',
        title: `${awards.ghost_king.name} grupta 'Ghost' takılıyor!`,
        titleAccent: Colors.error,
        subtitle: `Tam ${awards.ghost_king.count} kez attığı mesajdan sonra saatlerce kimseden ses çıkmadı. Hayırdır?`,
      } : null,

      // ── 5: Ağzı Var Dili Yok ──
      awards.quiet_one ? {
        question: 'Grupta olup olmadığını unuttuğumuz, sadece izleyen o gizemli üye...',
        gradient: ['#0b141b', '#006c54', '#004d3d'],
        icon: '🤫',
        badge: 'AĞZI VAR DİLİ YOK',
        title: `${awards.quiet_one.name} tam bir sessiz izleyici!`,
        titleAccent: Colors.primary,
        subtitle: `Koca grupta sadece ${awards.quiet_one.count} mesajı var. Varlığıyla huzur veriyor!`,
      } : null,

       // ── 6: Küfürbaz (Eğer varsa) ──
       awards.kufurbaz_haydo ? {
        question: 'Grupta ağzının ayarı pek olmayan o arkadaşımız...',
        gradient: ['#0b141b', '#93000a', '#690005'],
        icon: '🤬',
        badge: 'KÜFÜRBAZ HAYDO',
        title: `Ödülün sahibi: ${awards.kufurbaz_haydo.name}`,
        titleAccent: Colors.error,
        subtitle: `Tam ${awards.kufurbaz_haydo.count} küfürle grubun en 'dobra' üyesi oldu. Sabun getirin!`,
      } : null,

      // ── 7: Favori Kelimeler ──
      {
        question: 'Bu grubun ağzına pelesenk olmuş o meşhur kelimeler...',
        gradient: ['#0b141b', '#0369a1', '#082f49'],
        icon: '📝',
        badge: 'GRUP LUGATI',
        title: `En çok: "${m.word_cloud?.combined?.[0]?.word || '?'}"`,
        titleAccent: Colors.secondary,
        subtitle: (() => {
          const top3 = m.word_cloud?.combined?.slice(0, 3) || []
          return `Grupta en popüler 3 kelime: ${top3.map(w => `"${w.word}"`).join(', ')}`
        })(),
      },

      // ── 8: Toplam Mesafe ──
      {
        question: 'Eğer bu grubun tüm yazışmalarını bir kitap yapsaydınız...',
        gradient: ['#0b141b', '#570067', '#350040'],
        icon: '📖',
        badge: 'DESTAN GİBİ',
        title: `Tam ${g.book_equivalent_pages} sayfalık bir roman çıkar!`,
        titleAccent: Colors.tertiary,
        subtitle: `Bu grupta toplam ${g.total_words.toLocaleString('tr-TR')} kelime tüketildi. Bir ömürlük muhabbet!`,
      },
    ].filter(Boolean)
  }

  // ── 2 KİŞİLİK (PAIR) MODU (Mevcut mantık) ──
  return [
    // ... (existing code for pairs)
    // ── 1: Genel Bakış ──
    {
      question: 'Bu zamana kadar aranızda ne kadar büyük bir tarih yattığını merak ettin mi?',
      gradient: ['#0b141b', '#006c54', '#004d3d'],
      icon: '💬',
      badge: 'GENEL BAKIŞ',
      title: `${g.total_messages.toLocaleString('tr-TR')} mesaj, ${g.date_range.days_span} gün.`,
      titleAccent: Colors.primary,
      subtitle: `${senders.join(' & ')} arasında toplam ${g.total_words.toLocaleString('tr-TR')} kelime yazıldı. En yoğun gününüz ${g.busiest_day.date} (${g.busiest_day.count} mesaj).`,
      exampleQuote: g.busiest_day.dialogues,
    },

    // ── 2: Vibe Check ──
    {
      question: 'Peki sohbetinizin genel havası nasıl? Sence toksik misiniz yoksa romantik mi?',
      gradient: m.vibe_check.overall_mood === 'Toxic' ? ['#0b141b', '#93000a', '#690005'] : ['#0b141b', '#006c54', '#570067', '#0b141b'],
      icon: '💕',
      badge: 'VIBE CHECK',
      title: `Sohbetin havası: ${m.vibe_check.mood_label_tr}`,
      titleAccent: Colors.tertiary,
      subtitle: `%${m.vibe_check.positive_pct} pozitif, %${m.vibe_check.negative_pct} negatif, %${m.vibe_check.neutral_pct} nötr.`,
      exampleQuote: m.vibe_check.overall_mood === 'Romantic' ? m.vibe_check.highlighted_quotes?.romantic : 
                    (m.vibe_check.overall_mood === 'Toxic' ? m.vibe_check.highlighted_quotes?.toxic : null),
    },

    // ── 3: Eğlence ──
    {
      question: 'Gelelim can alıcı konuya... Birbirinizi ne kadar güldürüyorsunuz?',
      gradient: ['#0b141b', '#570067', '#350040'],
      icon: '😂',
      badge: 'GÜLME KRİZLERİ',
      title: 'Gülmekten karnınıza ağrılar giren o anlara bakalım!',
      titleAccent: Colors.primary,
      subtitle: 'Yapay zekanın bulduğu "En Eğlenceli Sohbetler".',
      exampleQuote: m.vibe_check.highlighted_quotes?.hilarious,
    },

    // ── 4: Streak ──
    {
      question: 'Hiç aralıksız, her gün konuşarak ne kadar uzun süre mesajlaştığınızı biliyor musun?',
      gradient: ['#0b141b', '#006c54', '#004d3d'],
      icon: '🔥',
      badge: 'KONUŞMA STREAKİ',
      title: `${m.streak.longest_streak} gün boyunca birbirinizden hiç kopmadınız!`,
      titleAccent: Colors.primary,
      subtitle: `${m.streak.total_active_days} gün aktif, %${m.streak.activity_rate_pct} aktivite oranı. İmrenilecek bir bağ!`,
    },

    // ── 5: Yanıt Süresi ──
    {
      question: 'Mesajlara anında dönen şimşek ile saatlerce bekleten hayalet kim peki?',
      gradient: ['#0b141b', '#570067', '#350040'],
      icon: '⚡',
      badge: 'YANIT SÜRESİ',
      title: `${m.response_times.fastest_responder} şimşek hızında cevap veriyor!`,
      titleAccent: Colors.tertiary,
      subtitle: m.response_times.fun_fact,
    },

    // ── 6: FBI Ajanı ──
    {
      question: 'Sorgu odasında gibi hissettiren birilerine denk geldik sanki...',
      gradient: ['#0b141b', '#0369a1', '#082f49'],
      icon: '🕵️',
      badge: 'FBI AJANI',
      title: `${m.word_quirks.question_king} tam bir FBI ajanı gibi her şeyi sorguluyor!`,
      titleAccent: Colors.primary,
      subtitle: 'Sohbet boyunca en çok soru soran kişi oldu. Her şeyin bir cevabı olmalı değil mi?',
      exampleQuote: m.word_quirks?.fbi_dialogues,
    },

    // ── 7: Roman Yazarı ──
    {
      question: 'Kim her şeyi destan gibi 10 paragraf anlatıyor, kim sadece \'tm\' deyip geçiyor?',
      gradient: ['#0b141b', '#006c54', '#004d3d'],
      icon: '✍️',
      badge: 'ROMAN YAZARI',
      title: `${m.message_style.novelist} destan yazıyor, ${m.message_style.telegraphist} "tm" diyor.`,
      titleAccent: Colors.primary,
      subtitle: `${m.message_style.novelist}: ort ${m.message_style.per_sender[m.message_style.novelist]?.avg_words || 0} kelime.`,
      exampleQuote: m.message_style.highlighted_quote,
    },

    // ── 8: Emoji Evreni ──
    {
      question: 'Kelimelerin bittiği yerde emojiler konuşur. Peki aranızdaki emoji şampiyonu kim?',
      gradient: ['#0b141b', '#570067', '#350040'],
      icon: '🎭',
      badge: 'EMOJİ EVRENİ',
      title: `Toplam ${m.emoji_universe.total_emojis} emoji kullanıldı!`,
      titleAccent: Colors.tertiary,
      subtitle: `${m.emoji_universe.emoji_champion} emoji şampiyonu! Nadir emojiler: ${m.emoji_universe.rare_emojis?.join('') || '🤷'}`,
    },

    // ── 9: Özür Analizi ──
    {
      question: 'Zor zamanlarda alttan alan ve kalp kırıklıklarını tamir eden barış elçisi sence kim?',
      gradient: ['#0b141b', '#006c54', '#570067', '#0b141b'],
      icon: '🙏',
      badge: 'ÖZÜR ANALİZİ',
      title: m.apology_analysis.ambassador === 'Yok' 
        ? 'Bu sohbette hiç özür dilenmemiş! 🤐' 
        : `${m.apology_analysis.ambassador} tam bir barış elçisi!`,
      titleAccent: Colors.primary,
      subtitle: m.apology_analysis.ambassador === 'Yok'
        ? 'Siz hiç mi hata yapmazsınız, yoksa gururunuzdan mı ödün vermezsiniz? 🧐'
        : `${m.apology_analysis.ambassador}, toplam ${m.apology_analysis.per_sender[m.apology_analysis.ambassador]?.apology_count || 0} kez özür / barış ifadesi kullandı. ✨`,
    },

    // ── 10: Gerginlik ──
    {
      question: 'Zaman zaman hararet yükselir... Aranızı ne kadar gergin tutuyorsunuz sence?',
      gradient: m.argument_score.tension_index > 40 ? ['#0b141b', '#93000a', '#690005'] : ['#0b141b', '#0369a1', '#082f49'],
      icon: m.argument_score.tension_index > 40 ? '🌡️' : '❄️',
      badge: 'GERGİNLİK ENDEKSİ',
      title: `Gerginlik skoru: ${m.argument_score.tension_index}/100`,
      titleAccent: m.argument_score.tension_index > 40 ? Colors.error : Colors.secondary,
      subtitle: `${m.argument_score.tension_label} • CAPS Kralı: ${m.argument_score.caps_lock_king}`,
      exampleQuote: m.argument_score.highlighted_quote,
    },

    // ── 11: Favori Kelime ──
    {
      question: 'Aranızda en çok hangi kelime geçiyor biliyor musun? Cevap seni şaşırtabilir!',
      gradient: ['#0b141b', '#0369a1', '#082f49'],
      icon: '📝',
      badge: 'FAVORİ KELİME',
      title: `En çok kullanılan kelime: "${m.word_cloud?.combined?.[0]?.word || '?'}"`,
      titleAccent: Colors.secondary,
      subtitle: (() => {
        const top3 = m.word_cloud?.combined?.slice(0, 3) || []
        return `Top 3: ${top3.map(w => `"${w.word}" (${w.count}x)`).join(', ')}`
      })(),
    },

    // ── 12: Küfür Raporu ──
    ...(m.profanity ? [{
      question: 'Ağzınız ne kadar bozuk merak ediyoruz... Küfür raporunuz hazır!',
      gradient: m.profanity.total_profanity > 50 ? ['#0b141b', '#93000a', '#690005'] : ['#0b141b', '#570067', '#350040'],
      icon: m.profanity.total_profanity === 0 ? '😇' : '🤬',
      badge: 'KÜFÜR RAPORU',
      title: m.profanity.total_profanity === 0
        ? 'Bu sohbette küfür yok! Tebrikler 👼'
        : `Küfür şampiyonu: ${m.profanity.profanity_champion}`,
      titleAccent: m.profanity.total_profanity === 0 ? Colors.primary : Colors.error,
      subtitle: (() => {
        if (m.profanity.total_profanity === 0) {
          return 'Ne kadar kibar insanlarsınız! ✨'
        }
        const top3 = (m.profanity.top_5_overall || []).slice(0, 3)
        const top3Str = top3.length > 0 
          ? `En çok: ${top3.map(p => `"${p.word}" (${p.count}x)`).join(', ')}.` 
          : ''
          
        const entries = Object.entries(m.profanity.per_sender || {})
        const details = entries.filter(([_, d]) => d.profanity_count > 0).map(([s, d]) => {
          const topWord = d.top_profanities?.[0]?.word || ''
          return `${s}: ${d.profanity_count} küfür` + (topWord ? ` (Favorisi: "${topWord}")` : '')
        }).join(' • ')
        
        return `${top3Str} ${details}`
      })(),
    }] : []),

    // ── 13: Buz Kırıcı ──
    {
      question: 'Sessizlikleri hep aynı kişi bozuyor desek... İlk mesajı kim daha çok atıyor?',
      gradient: ['#0b141b', '#0369a1', '#082f49'],
      icon: '👋',
      badge: 'BUZ KIRICI',
      title: `Sohbetleri hep ${m.routines?.icebreaker || ''} başlatıyor!`,
      titleAccent: Colors.secondary,
      subtitle: `Güne ${m.routines?.morning_sun || ''} "Günaydın" ile başlarken, geceleri faturayı ${m.routines?.night_owl_closer || ''} kesiyor. ☀️🌙`,
    },

    // ── 14: Toplam Zaman ──
    {
      question: 'Tüm mesajlaşmaları hiç durmadan yapsaydınız, kaç saatinizi alırdı?',
      gradient: ['#0b141b', '#570067', '#350040'],
      icon: '⏳',
      badge: 'TOPLAM ZAMAN',
      title: `Mesaide ${g.estimated_chat_time?.hours || 0} saat harcadınız!`,
      titleAccent: Colors.tertiary,
      subtitle: `Aralıksız ${g.estimated_chat_time?.hours || 0} saat ${g.estimated_chat_time?.minutes || 0} dakikanız WhatsApp'ta geçti.`,
    },
  ]
}
