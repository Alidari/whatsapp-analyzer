export default function Footer() {
  return (
    <footer className="w-full bg-background py-12 border-t border-outline-variant/10">
      <div className="wrapper flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-2">
          <div className="text-primary font-headline font-black tracking-tighter text-lg">Anatomi</div>
          <p className="text-xs text-on-background/40 max-w-md font-label">
            © 2026 Sohbetinizin Anatomisi. Verileriniz asla sunucularımıza ulaşmaz; analiz tamamen tarayıcınızda gerçekleşir.
          </p>
        </div>
        <div className="flex gap-8">
          <a
            href="/privacy"
            className="text-xs text-on-background/40 hover:text-on-background transition-colors font-label"
          >
            Gizlilik Politikası
          </a>
          <a
            href="#how-it-works"
            className="text-xs text-on-background/40 hover:text-on-background transition-colors font-label"
          >
            Nasıl Çalışır?
          </a>
          <a
            href="#security"
            className="text-xs text-on-background/40 hover:text-on-background transition-colors font-label"
          >
            Güvenlik Manifestosu
          </a>
        </div>
      </div>
    </footer>
  )
}
