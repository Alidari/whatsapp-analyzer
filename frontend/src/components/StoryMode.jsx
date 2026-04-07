import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toBlob } from 'html-to-image'

// ══════════════════════════════════════════════
//  İnteraktif Alıntı Gösterici (Carousel)
// ══════════════════════════════════════════════

function ExampleQuoteCarousel({ quotesList }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [visibleCount, setVisibleCount] = useState(1)
  const scrollRef = useRef(null)

  if (!quotesList || quotesList.length === 0) return null;
  // Geriye dönük uyumluluk: Array of dicts (tek diyalog) vs Array of arrays (çoklu diyalog)
  const is2D = Array.isArray(quotesList[0])
  const safeQuotesList = is2D ? quotesList : [quotesList]
  const currentDialogue = safeQuotesList[activeIndex]

  // Mesajları tek tek okuma süresiyle indirme efekti
  useEffect(() => {
    setVisibleCount(1)
    if (!currentDialogue) return
    const interval = setInterval(() => {
      setVisibleCount(prev => {
        if (prev < currentDialogue.length) return prev + 1
        clearInterval(interval)
        return prev
      })
    }, 1500)
    return () => clearInterval(interval)
  }, [activeIndex, currentDialogue])

  // Yeni mesaj geldiğinde otomatik aşağı kaydır
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }, 50)
    }
  }, [visibleCount])

  // Conveyor Belt: Show only the last 3 active messages to create a sliding up effect
  const MAX_VISIBLE = 3;
  if (!currentDialogue) return null;
  
  // As visibleCount grows, the start index shifts, popping old items off the top
  const startIndex = Math.max(0, visibleCount - MAX_VISIBLE);
  const renderedDialogue = currentDialogue.slice(startIndex, visibleCount);

  return (
    <div className="mt-8 w-full max-w-sm flex flex-col items-center">
      <div className="w-full h-[260px] relative overflow-hidden flex flex-col justify-end px-2 py-4">
        <AnimatePresence mode="popLayout" initial={false}>
           {renderedDialogue.map((msg, idx) => {
             // We need a stable identifier. Using the true index in the currentDialogue
             const trueIndex = startIndex + idx;
             const isFirstSender = msg.sender === currentDialogue[0].sender;
             
             return (
               <motion.div
                 layout
                 key={`msg-${activeIndex}-${trueIndex}`}
                 initial={{ opacity: 0, y: 50, scale: 0.9 }}
                 animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } }}
                 exit={{ opacity: 0, y: -50, scale: 0.8, transition: { duration: 0.4 } }}
                 className={`flex flex-col mt-3 max-w-[85%] ${isFirstSender ? 'self-start items-start' : 'self-end items-end'}`}
               >
                  <span className="text-[10px] text-white/50 mb-1 px-1 font-label uppercase tracking-widest leading-none drop-shadow-md">
                    {msg.sender.split(' ')[0]}
                  </span>
                  <div className={`px-4 py-2.5 rounded-2xl shadow-xl border border-white/10 backdrop-blur-md ${isFirstSender ? 'bg-white/10 rounded-tl-sm' : 'bg-primary/20 rounded-tr-sm'}`}>
                     <p className="text-[14.5px] font-label text-white/95 leading-relaxed break-words">"{msg.message}"</p>
                  </div>
               </motion.div>
             )
           })}
        </AnimatePresence>
      </div>

      {/* Pagination Dots & Arrows */}
      {safeQuotesList.length > 1 && (
        <div className="flex items-center gap-4 mt-6 relative z-50">
          <button 
            onClick={(e) => { e.stopPropagation(); setActiveIndex(prev => prev > 0 ? prev - 1 : safeQuotesList.length - 1); }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/30 flex items-center justify-center text-white backdrop-blur-sm pointer-events-auto transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          
          <div className="flex gap-2">
            {safeQuotesList.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer pointer-events-auto ${i === activeIndex ? 'bg-primary scale-125' : 'bg-white/30 hover:bg-white/50'}`}
              />
            ))}
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); setActiveIndex(prev => prev < safeQuotesList.length - 1 ? prev + 1 : 0); }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/30 flex items-center justify-center text-white backdrop-blur-sm pointer-events-auto transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════
//  Story Slide Generator — Veriden Hikaye Oluştur
// ══════════════════════════════════════════════

function generateStorySlides(metrics) {
  const m = metrics
  const g = m.general
  const senders = g.senders

  return [
    // ── 1: Genel Bakış ──
    {
      question: "Bu zamana kadar aranızda ne kadar büyük bir tarih yattığını merak ettin mi?",
      gradient: 'story-gradient-emerald',
      icon: 'chat_bubble',
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
      badge: 'GENEL BAKIŞ',
      title: (
        <>
          <span className="text-primary">{g.total_messages.toLocaleString('tr-TR')}</span> mesaj,{' '}
          <span className="text-primary">{g.date_range.days_span}</span> gün.
        </>
      ),
      subtitle: `${senders.join(' & ')} arasında toplam ${g.total_words.toLocaleString('tr-TR')} kelime yazıldı. En yoğun gününüz ${g.busiest_day.date} (${g.busiest_day.count} mesaj).`,
      exampleQuote: g.busiest_day.dialogues,
      stars: true,
    },

      // ── 2: Vibe Check ──
      {
        question: "Peki sohbetinizin genel havası nasıl? Sence toksik misiniz yoksa romantik mi?",
        gradient: m.vibe_check.overall_mood === 'Toxic' ? 'story-gradient-fire' : 'story-gradient-mixed',
        icon: 'favorite',
        iconBg: 'bg-tertiary/20',
        iconColor: 'text-tertiary',
        badge: 'VIBE CHECK',
        title: (
          <>
            Sohbetin havası:{' '}
            <span className="text-tertiary">{m.vibe_check.mood_label_tr}</span>
          </>
        ),
        subtitle: `%${m.vibe_check.positive_pct} pozitif, %${m.vibe_check.negative_pct} negatif, %${m.vibe_check.neutral_pct} nötr. ${
          m.vibe_check.overall_mood === 'Romantic' ? '💕' :
          m.vibe_check.overall_mood === 'Toxic' ? '🔥' :
          m.vibe_check.overall_mood === 'Chaotic' ? '🌪️' : '⚖️'
        }`,
        exampleQuote: m.vibe_check.overall_mood === 'Romantic' ? m.vibe_check.highlighted_quotes?.romantic : 
                      (m.vibe_check.overall_mood === 'Toxic' ? m.vibe_check.highlighted_quotes?.toxic : null),
        stars: false,
      },

    // ── 3: Eğlence ──
    {
      question: "Gelelim can alıcı konuya... Birbirinizi ne kadar güldürüyorsunuz?",
      gradient: 'story-gradient-purple',
      icon: 'mood',
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
      badge: 'GÜLME KRİZLERİ',
      title: (
        <>
          Gülmekten <span className="text-primary">karnınıza ağrılar giren</span> o anlara bakalım!
        </>
      ),
      subtitle: `Yapay zekanın bulduğu "En Eğlenceli Sohbetler". 😂`,
      exampleQuote: m.vibe_check.highlighted_quotes?.hilarious,
      stars: false,
    },

    // ── 4: Streak ──
    {
      question: "Hiç aralıksız, her gün konuşarak ne kadar uzun süre mesajlaştığınızı biliyor musun?",
      gradient: 'story-gradient-emerald',
      icon: 'local_fire_department',
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
      badge: 'KONUŞMA STREAKİ',
      title: (
        <>
          <span className="text-primary">{m.streak.longest_streak} gün</span> boyunca birbirinizden hiç kopmadınız!
        </>
      ),
      subtitle: `${m.streak.total_active_days} gün aktif, %${m.streak.activity_rate_pct} aktivite oranı. İmrenilecek bir bağ! 🔥`,
      stars: true,
    },


    // ── 5: Yanıt Süresi ──
    {
      question: "Mesajlara anında dönen şimşek ile saatlerce bekleten hayalet kim peki?",
      gradient: 'story-gradient-purple',
      icon: 'bolt',
      iconBg: 'bg-tertiary/20',
      iconColor: 'text-tertiary',
      badge: 'YANIT SÜRESİ',
      title: (
        <>
          <span className="text-tertiary">{m.response_times.fastest_responder}</span> şimşek hızında cevap veriyor!
        </>
      ),
      subtitle: m.response_times.fun_fact,
      stars: false,
    },

    // ── 9: FBI (Soru İşaretleri) ──
    {
      question: "Sorgu odasında gibi hissettiren birilerine denk geldik sanki...",
      gradient: 'story-gradient-sky',
      icon: 'contact_support',
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
      badge: 'FBI AJANI',
      title: (
        <>
          <span className="text-primary">{m.word_quirks.question_king}</span> tam bir FBI ajanı gibi her şeyi sorguluyor!
        </>
      ),
      subtitle: `Sohbet boyunca en çok soru soran kişi oldu. Her şeyin bir cevabı olmalı değil mi?`,
      exampleQuote: m.word_quirks?.fbi_dialogues,
      stars: true,
    },

    // ── 6: Roman Yazarı ──
    {
      question: "Kim her şeyi destan gibi 10 paragraf anlatıyor, kim sadece 'tm' deyip geçiyor?",
      gradient: 'story-gradient-emerald',
      icon: 'history_edu',
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
      badge: 'ROMAN YAZARI',
      title: (
        <>
          <span className="text-primary">{m.message_style.novelist}</span> destan yazıyor, {m.message_style.telegraphist} "tm" diyor.
        </>
      ),
      subtitle: `${m.message_style.novelist}: ort ${m.message_style.per_sender[m.message_style.novelist]?.avg_words || 0} kelime. ✍️`,
      exampleQuote: m.message_style.highlighted_quote,
      stars: false,
    },

    // ── 7: Emoji Şampiyonu ──
    {
      question: "Kelimelerin bittiği yerde emojiler konuşur. Peki aranızdaki emoji şampiyonu kim?",
      gradient: 'story-gradient-purple',
      icon: 'mood',
      iconBg: 'bg-tertiary/20',
      iconColor: 'text-tertiary',
      badge: 'EMOJİ EVRENİ',
      title: (
        <>
          Toplam{' '}
          <span className="text-tertiary">{m.emoji_universe.total_emojis}</span> emoji kullanıldı!
        </>
      ),
      subtitle: `${m.emoji_universe.emoji_champion} emoji şampiyonu! Günün sürprizi: ${m.emoji_universe.rare_emojis?.join('') || ''} gibi aşırı nadir kullanılan emojilere rastladık!`,
      stars: true,
    },

    // ── 8: Barış Elçisi ──
    {
      question: "Zor zamanlarda alttan alan ve kalp kırıklıklarını tamir eden barış elçisi sence kim?",
      gradient: 'story-gradient-mixed',
      icon: 'volunteer_activism',
      iconBg: 'bg-tertiary/20',
      iconColor: 'text-tertiary',
      badge: 'BARIŞ ELÇİSİ',
      title: (
        <>
          <span className="text-primary">{m.peace_ambassador.ambassador}</span> barışın mimarı! 🕊️
        </>
      ),
      subtitle: `${m.peace_ambassador.ambassador}, ${m.peace_ambassador.per_sender[m.peace_ambassador.ambassador]?.peace_count || 0} kez barışçıl ifade kullandı. Tartışmalarda buzları eriten taraf!`,
      stars: false,
    },

    // ── 9: Gerginlik ──
    {
      question: "Zaman zaman hararet yükselir... Aranızı ne kadar gergin tutuyorsunuz sence?",
      gradient: m.argument_score.tension_index > 40 ? 'story-gradient-fire' : 'story-gradient-blue',
      icon: 'local_fire_department',
      iconBg: m.argument_score.tension_index > 40 ? 'bg-error/20' : 'bg-secondary/20',
      iconColor: m.argument_score.tension_index > 40 ? 'text-error' : 'text-secondary',
      badge: 'GERGİNLİK ENDEKSİ',
      title: (
        <>
          Gerginlik skoru:{' '}
          <span className={m.argument_score.tension_index > 40 ? 'text-error' : 'text-secondary'}>
            {m.argument_score.tension_index}/100
          </span>
        </>
      ),
      subtitle: `${m.argument_score.tension_label} • CAPS Kralı: ${m.argument_score.caps_lock_king}`,
      exampleQuote: m.argument_score.highlighted_quote,
      stars: false,
    },

    // ── 10: En Yoğun Gün ──
    {
      question: "Parmaklarınızın yorulduğu, en çok mesaj attığınız o çılgın günü hatırlıyor musun?",
      gradient: 'story-gradient-emerald',
      icon: 'calendar_month',
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
      badge: 'REKOR GÜN',
      title: (
        <>
          En yoğun gününüz:{' '}
          <span className="text-primary">{g.busiest_day.count} mesaj!</span>
        </>
      ),
      subtitle: `${g.busiest_day.date} tarihinde rekor kırdınız. Günlük ortalama ${g.daily_average} iken bu gün tam ${g.busiest_day.count} mesaj! 📊`,
      stars: false,
    },

    // ── 11: Toplam Sohbet Süresi ──
    {
      question: "Eğer tüm bu mesajlaşmaları hiç durmadan yapsaydınız, kaç saatinizi alırdı?",
      gradient: 'story-gradient-purple',
      icon: 'hourglass_bottom',
      iconBg: 'bg-tertiary/20',
      iconColor: 'text-tertiary',
      badge: 'TOPLAM ZAMAN',
      title: (
        <>
          Mesaide <span className="text-tertiary">{g.estimated_chat_time?.hours || 0} saat</span> harcadınız!
        </>
      ),
      subtitle: `Sohbetin yazma ve okuma süreleri toplandığında aralıksız ${g.estimated_chat_time?.hours || 0} saat ${g.estimated_chat_time?.minutes || 0} dakikanız WhatsApp'ta geçti. ⏳`,
      stars: true,
    },

    // ── 12: İlk Sohbet Başlatıcı ve Rutinler ──
    {
      question: "Sessizlikleri hep aynı kişi bozuyor desek... İlk mesajı kim daha çok atıyor?",
      gradient: 'story-gradient-blue',
      icon: 'waving_hand',
      iconBg: 'bg-secondary/20',
      iconColor: 'text-secondary',
      badge: 'BUZ KIRICI',
      title: (
        <>
          Sohbetleri hep <span className="text-secondary">{m.routines?.icebreaker || ''}</span> başlatıyor!
        </>
      ),
      subtitle: `Buzları hep o kırıyor. Aynı zamanda güne ${m.routines?.morning_sun || ''} 'Günaydın' ile başlarken, geceleri faturayı ${m.routines?.night_owl_closer || ''} kesiyor. ☀️🌙`,
      stars: false,
    },

    // ── 13: Kıvrak Kelimeler & Gülüşler ──
    {
      question: "Harfleeeriiii uzataaan ve sürekli random gülen o sabıkalı kişi kim sence?",
      gradient: 'story-gradient-mixed',
      icon: 'keyboard',
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
      badge: 'KIVRAK KELİMELER',
      title: (
        <>
          Harfleri uzatan kişi: <span className="text-primary">{m.word_quirks?.elastic_king || ''}</span>
        </>
      ),
      subtitle: `En çok esnetilen kelime: "${m.word_quirks?.per_sender?.[m.word_quirks?.elastic_king]?.longest_elongated || 'yaaaaa'}". Klavye delikanlısı (en çok random gülen) ise ${m.word_quirks?.laugh_king || ''}. 😂`,
      stars: true,
    },

    // ── Favori Kelime ──
    {
      question: "Aranızda en çok hangi kelime geçiyor biliyor musun? Cevap seni şaşırtabilir!",
      gradient: 'story-gradient-blue',
      icon: 'text_fields',
      iconBg: 'bg-secondary/20',
      iconColor: 'text-secondary',
      badge: 'FAVORİ KELİME',
      title: (() => {
        const topWord = m.word_cloud?.combined?.[0]
        return (
          <>
            En çok kullanılan kelime:{' '}
            <span className="text-secondary">"{topWord?.word || '?'}"</span>
          </>
        )
      })(),
      subtitle: (() => {
        const top3 = m.word_cloud?.combined?.slice(0, 3) || []
        const perSender = m.word_cloud?.per_sender || {}
        const senderFavs = Object.entries(perSender).map(([s, words]) => {
          const fav = words?.[0]
          return fav ? `${s}: "${fav.word}" (${fav.count}x)` : null
        }).filter(Boolean).join(' • ')
        return `Top 3: ${top3.map(w => `"${w.word}" (${w.count}x)`).join(', ')}. ${senderFavs ? '\n' + senderFavs : ''}`
      })(),
      stars: true,
    },

    // ── Küfür Analizi ──
    ...(m.profanity ? [{
      question: "Ağzınız ne kadar bozuk merak ediyoruz... Küfür raporunuz hazır!",
      gradient: m.profanity.total_profanity > 50 ? 'story-gradient-fire' : 'story-gradient-purple',
      icon: m.profanity.total_profanity === 0 ? 'sentiment_satisfied' : 'explicit',
      iconBg: m.profanity.total_profanity === 0 ? 'bg-primary/20' : 'bg-error/20',
      iconColor: m.profanity.total_profanity === 0 ? 'text-primary' : 'text-error',
      badge: 'KÜFÜR RAPORU',
      title: (() => {
        if (m.profanity.total_profanity === 0) {
          return (<>Bu sohbette <span className="text-primary">küfür yok!</span> Tebrikler 👼</>)
        }
        const champ = m.profanity.profanity_champion
        const champData = m.profanity.per_sender?.[champ]
        return (
          <>
            Küfür şampiyonu:{' '}
            <span className="text-error">{champ}</span>
            {champData && <span className="text-white/70 text-xl"> ({champData.density_label})</span>}
          </>
        )
      })(),
      subtitle: (() => {
        if (m.profanity.total_profanity === 0) {
          return 'Ne kadar kibar insanlarsınız! Yapay zeka hiçbir küfür tespit edemedi. ✨'
        }
        const entries = Object.entries(m.profanity.per_sender || {})
        const details = entries.map(([s, d]) =>
          `${s}: ${d.profanity_count} küfür (${d.density_label})`
        ).join(' • ')
        return `Toplam ${m.profanity.total_profanity} küfür tespit edildi. ${m.profanity.profanity_density_label} • ${details}`
      })(),
      stars: false,
    }] : []),
    
    // ── 15: Buzdolabı (Yapay Zeka Tespiti) ──
    ...(m.vibe_check?.ice_fridge !== "Yok" ? [{
      question: "Sen destanlar yazarken o sadece 'tm' deyip geçen kalpsiz buzdolabını ifşa edelim mi?",
      gradient: 'story-gradient-blue',
      icon: 'ac_unit',
      iconBg: 'bg-tertiary/20',
      iconColor: 'text-tertiary',
      badge: 'BUZDOLABI 🧊',
      title: (
        <>
          Gerçek buz kütlesi: <span className="text-tertiary">{m.vibe_check?.ice_fridge}</span>
        </>
      ),
      subtitle: `Yapay zekanın analizine göre aranızdaki tüm duygu akışına direnen, mesajlarının çoğu "nötr" olan kişi ${m.vibe_check?.ice_fridge}. Biraz duygu lütfen! 🥶`,
      stars: false,
    }] : []),

    // ── 16: Drama Kraliçesi/Kralı (Yapay Zeka Tespiti) ──
    ...(m.vibe_check?.drama_queen !== "Yok" ? [{
      question: "Bir gün aşkından ölüp ertesi gün kan kusan dengesiz şampiyonumuz sence kim?",
      gradient: 'story-gradient-fire',
      icon: 'theater_comedy',
      iconBg: 'bg-error/20',
      iconColor: 'text-error',
      badge: 'DRAMA ŞAMPİYONU 🎭',
      title: (
        <>
          Alkışlar <span className="text-error">{m.vibe_check?.drama_queen}</span> için!
        </>
      ),
      subtitle: `O kadar yoğun bir duygu karmaşası (hem pozitif hem negatif zirveleri) yaşıyor ki yapay zekanın devreleri yandı. En büyük duygu dalgalanmaları ona ait. 🎢`,
      stars: true,
    }] : []),
  ]
}

// ══════════════════════════════════════════════
//  Floating Stars Component
// ══════════════════════════════════════════════

function FloatingStars() {
  const positions = [
    { top: '15%', left: '18%', size: 14, delay: 0 },
    { top: '30%', right: '15%', size: 18, delay: 0.5 },
    { top: '55%', left: '12%', size: 12, delay: 1 },
    { top: '70%', right: '22%', size: 16, delay: 1.5 },
    { bottom: '25%', left: '25%', size: 10, delay: 0.8 },
  ]

  return (
    <>
      {positions.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute text-tertiary/40 pointer-events-none"
          style={{ ...pos }}
          animate={{
            opacity: [0.2, 0.7, 0.2],
            scale: [1, 1.2, 1],
            rotate: [0, 15, -15, 0],
          }}
          transition={{
            duration: 3,
            delay: pos.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <span className="material-symbols-outlined material-symbols-filled" style={{ fontSize: pos.size }}>
            star
          </span>
        </motion.div>
      ))}
    </>
  )
}

// ══════════════════════════════════════════════
//  StoryMode Component
// ══════════════════════════════════════════════

export default function StoryMode({ data, onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const cardRef = useRef(null)

  const slides = generateStorySlides(data.metrics)
  const totalSlides = slides.length

  const goNext = useCallback(() => {
    if (!isRevealed) {
      setIsRevealed(true)
      return
    }
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((prev) => prev + 1)
      setIsRevealed(false)
    } else {
      onClose() // Transition to Wheel
    }
  }, [currentSlide, totalSlides, onClose, isRevealed])

  const goPrev = useCallback(() => {
    if (isRevealed) {
      setIsRevealed(false)
      return
    }
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1)
      setIsRevealed(false)
    }
  }, [currentSlide, isRevealed])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') goNext()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev, onClose])

  const slide = slides[currentSlide]

  const handleShare = async (e) => {
    e.stopPropagation() // Prevent triggering goNext
    if (!cardRef.current) return
    
    try {
      setIsSharing(true)
      
      // Let React render without the buttons for capture
      setTimeout(async () => {
        const blob = await toBlob(cardRef.current, { 
          cacheBust: true, 
          style: { transform: 'scale(1)', margin: 0 } 
        })
        if (!blob) throw new Error("Görsel oluşturulamadı")
        
        const file = new File([blob], 'anatomi-hikaye.png', { type: 'image/png' })
        const shareData = {
          title: 'Anatomi WhatsApp Analizi',
          text: 'Sohbet analizimizin sonuçlarına bak! 😂 Sen de kendi şifreli analizini çıkarmak istersen tıkla: https://anatomi.app',
          files: [file]
        }
        
        setIsSharing(false) // Restore UI

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share(shareData)
        } else {
          // Fallback for Desktop
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'anatomi-hikaye.png'
          a.click()
          alert("Görsel cihazına indirildi! Uygulama linkini arkadaşlarına WhatsApp üzerinden gönderebilirsin: https://anatomi.app")
        }
      }, 100)

    } catch (e) {
      console.error(e)
      alert("Paylaşım cihazınız tarafından desteklenmiyor veya bir sorun oldu.")
      setIsSharing(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-background flex items-center justify-center p-4"
    >
      {/* Left Arrow */}
      {!isSharing && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev() }}
          disabled={currentSlide === 0 && !isRevealed}
          className={`absolute left-4 md:left-8 z-50 w-12 h-12 rounded-full bg-surface-container-highest/60 backdrop-blur-sm flex items-center justify-center transition-all ${
            (currentSlide === 0 && !isRevealed) ? 'opacity-20 cursor-not-allowed' : 'opacity-70 hover:opacity-100 hover:scale-110'
          }`}
        >
          <span className="material-symbols-outlined text-on-background">chevron_left</span>
        </button>
      )}

      {/* Right Arrow */}
      {!isSharing && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext() }}
          className="absolute right-4 md:right-8 z-50 w-12 h-12 rounded-full bg-surface-container-highest/60 backdrop-blur-sm flex items-center justify-center opacity-70 hover:opacity-100 hover:scale-110 transition-all"
        >
          <span className="material-symbols-outlined text-on-background">chevron_right</span>
        </button>
      )}

      {/* Story Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentSlide}-${isRevealed}`}
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`relative z-50 w-[380px] max-w-full min-h-[680px] rounded-3xl overflow-hidden flex flex-col ${slide.gradient} shadow-2xl shadow-black/50 cursor-pointer`}
          onClick={(e) => {
            if (isSharing) return;
            // Ekranda tıklanan yer 1/3'ün solunda mı? (X ekseni)
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left; // x position within the element.
            if (x < rect.width / 3) {
              goPrev();
            } else {
              goNext();
            }
          }}
        >
          {/* ── Progress Bars ── */}
          <div className="flex gap-1.5 px-4 pt-4 relative z-20">
            {slides.map((_, i) => (
              <div key={i} className="story-progress-bar flex-1 bg-black/20 h-1 rounded-full overflow-hidden">
                <div
                  className="story-progress-fill bg-white w-full h-full transition-all duration-300"
                  style={{
                    transform: i < currentSlide || (i === currentSlide && isRevealed) ? 'translateX(0%)' : 'translateX(-100%)',
                    opacity: i <= currentSlide ? 1 : 0.3,
                  }}
                />
              </div>
            ))}
          </div>

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2 relative z-20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full editorial-gradient flex items-center justify-center">
                <span className="material-symbols-outlined material-symbols-filled text-on-primary text-sm">auto_awesome</span>
              </div>
              <span className="text-white/90 font-headline font-bold text-sm">Anatomi</span>
            </div>
            {!isSharing && (
              <div className="flex items-center gap-3 relative z-50">
                <button
                  onClick={(e) => { e.stopPropagation(); onClose() }}
                  className="cursor-pointer text-white/40 hover:text-white text-xs font-label uppercase tracking-widest px-2 py-1 rounded-md hover:bg-white/10 transition-all pointer-events-auto"
                >
                  Atla
                </button>
              </div>
            )}
          </div>

          {/* ── Content (Question vs Reveal) ── */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 text-center relative z-20">
            {slide.stars && <FloatingStars />}

            {!isRevealed ? (
              // QUESTION MODE
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-8 w-full"
              >
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-white text-4xl">psychology_alt</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-white leading-tight drop-shadow-md">
                  {slide.question}
                </h2>
                {!isSharing && (
                   <p className="text-white/50 text-sm font-label uppercase tracking-widest mt-8 animate-pulse">Cevabı Görmek İçin Tıkla</p>
                )}
              </motion.div>
            ) : (
              // REVEAL MODE
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 20 }}
                className="flex flex-col items-center w-full"
              >
                {/* Main Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  className={`w-24 h-24 rounded-full ${slide.iconBg} backdrop-blur-sm flex items-center justify-center mb-6 border border-white/10 shadow-xl`}
                >
                  <span className={`material-symbols-outlined material-symbols-filled ${slide.iconColor} text-5xl`}>
                    {slide.icon}
                  </span>
                </motion.div>

                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/80 text-xs font-label uppercase tracking-widest mb-6 border border-white/10"
                >
                  {slide.badge}
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl md:text-4xl font-headline font-extrabold text-white leading-tight mb-4 drop-shadow-lg"
                >
                  {slide.title}
                </motion.h2>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-white/80 text-[15px] leading-relaxed max-w-xs font-label drop-shadow-md"
                >
                  {slide.subtitle}
                </motion.p>
                
                {/* Simulated Conversation Carousel */}
                <ExampleQuoteCarousel quotesList={slide.exampleQuote} />
                
              </motion.div>
            )}
          </div>

          {/* ── Footer / Share Button ── */}
          {!isSharing && (
            <div className="px-6 pb-6 relative z-50 pointer-events-none">
              <AnimatePresence mode="popLayout">
                {isRevealed && (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="w-full py-4 mb-3 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-headline font-bold flex items-center justify-center gap-2 transition-colors border border-white/30 shadow-lg cursor-pointer pointer-events-auto"
                    onClick={handleShare}
                  >
                    <span className="material-symbols-outlined text-xl">share</span>
                    Görseli Paylaş
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}
          
          {/* Watermark only visible in Shared Image */}
          {isSharing && (
             <div className="absolute bottom-6 left-0 right-0 text-center text-white/50 text-xs font-label opacity-80">
                Aramızdaki analizi görmek istersen: anatomi.app
             </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Slide Counter */}
      {!isSharing && (
        <div className="absolute bottom-6 text-on-surface-variant/40 text-xs font-label">
           {currentSlide + 1} / {totalSlides}
        </div>
      )}
    </motion.div>
  )
}
