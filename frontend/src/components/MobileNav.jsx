export default function MobileNav({ activeView, onAnalyze, onStories, onDashboard, onHistory }) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-outline-variant/10 px-6 py-4 z-50">
      <div className="flex justify-between items-center">
        <button onClick={onAnalyze} className={`flex flex-col items-center gap-1 ${activeView === 'landing' ? 'text-primary' : 'text-on-background/60'}`}>
          <span className={`material-symbols-outlined ${activeView === 'landing' ? 'material-symbols-filled' : ''}`}>analytics</span>
          <span className="text-[10px] font-label">Analiz</span>
        </button>
        <button
          onClick={onHistory}
          className={`flex flex-col items-center gap-1 ${activeView === 'history' ? 'text-primary' : 'text-on-background/60'}`}
        >
          <span className={`material-symbols-outlined ${activeView === 'history' ? 'material-symbols-filled' : ''}`}>history</span>
          <span className="text-[10px] font-label">Geçmiş</span>
        </button>
        <button
          onClick={onStories}
          disabled={!onStories}
          className={`flex flex-col items-center gap-1 ${activeView === 'stories' ? 'text-primary' : 'text-on-background/60'} ${!onStories ? 'opacity-40' : ''}`}
        >
          <span className="material-symbols-outlined">auto_stories</span>
          <span className="text-[10px] font-label">Hikayeler</span>
        </button>
        <button
          onClick={onDashboard}
          disabled={!onDashboard}
          className={`flex flex-col items-center gap-1 ${activeView === 'dashboard' ? 'text-primary' : 'text-on-background/60'} ${!onDashboard ? 'opacity-40' : ''}`}
        >
          <span className="material-symbols-outlined">grid_view</span>
          <span className="text-[10px] font-label">Panel</span>
        </button>
      </div>
    </div>
  )
}
