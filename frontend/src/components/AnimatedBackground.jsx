import React from 'react'
import { BackgroundBeams } from './ui/beams'

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-50 overflow-hidden bg-background">
      {/* ── Temel Noise (Kumlanma) Efekti ── */}
      <div 
        className="absolute inset-0 opacity-[0.02]" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px 150px'
        }}
      />
      
      {/* ── Sol Üst Sabit Parlama (Ortam Işığı) ── */}
      <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-primary/5 blur-[120px] mix-blend-screen" />
      
      {/* ── Sağ Alt Sabit Parlama (Varyasyon) ── */}
      <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-tertiary/5 blur-[150px] mix-blend-screen" />

      {/* ── Shadcn Beams Efekti (Alt Katman) ── */}
      <div className="absolute inset-0 mix-blend-screen opacity-30 pointer-events-none">
        <BackgroundBeams />
      </div>
    </div>
  )
}
