import React, { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, FileText, LockOpen, Activity, ChevronDown, Lock, LogOut, X, Beaker, Play, Eye, Check, FileJson } from 'lucide-react'
import Dashboard from './Dashboard'
import StoryMode from './StoryMode'

export default function AdminPanel({ onClose }) {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '')
  const [passwordInput, setPasswordInput] = useState('')
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [pwModalOpen, setPwModalOpen] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  // Live Monitor & Tester states
  const [activeTab, setActiveTab] = useState('overview') 
  const [activeJobs, setActiveJobs] = useState([])
  const [liveStats, setLiveStats] = useState({ queue_size: 0, total_in_memory: 0 })
  const [testChats, setTestChats] = useState([])
  const [selectedTestChat, setSelectedTestChat] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [testError, setTestError] = useState(null)
  const [previewMode, setPreviewMode] = useState(null)
  const [dropdownChatOpen, setDropdownChatOpen] = useState(false)

  const fetchStats = async (pw) => {
    try {
      const resp = await fetch('/api/admin/stats', {
        headers: { 
          'pw': pw,
          'X-API-Key': 'AnatomiSecureKey2026!'
        }
      })
      if (resp.ok) {
        const data = await resp.json()
        setStats(data)
        setToken(pw)
        localStorage.setItem('admin_token', pw)
        setError('')
      } else {
        setToken('')
        localStorage.removeItem('admin_token')
        if (resp.status === 403) setError('Hatalı şifre')
      }
    } catch (e) {
      setError('Sunucuya bağlanılamadı')
    }
  }

  const fetchActiveJobs = async () => {
    if (!token) return
    try {
      const resp = await fetch('/api/admin/active-jobs', {
        headers: { 'pw': token, 'X-API-Key': 'AnatomiSecureKey2026!' }
      })
      if (resp.ok) {
        const data = await resp.json()
        setActiveJobs(data.active_jobs || [])
        setLiveStats({ queue_size: data.queue_size, total_in_memory: data.total_in_memory })
      }
    } catch (e) { console.error(e) }
  }

  const fetchTestChats = async () => {
    if (!token) return
    try {
      const resp = await fetch('/api/admin/test-chats', {
        headers: { 'pw': token, 'X-API-Key': 'AnatomiSecureKey2026!' }
      })
      if (resp.ok) {
        const data = await resp.json()
        setTestChats(data.chats || [])
        if (data.chats?.length > 0 && !selectedTestChat) setSelectedTestChat(data.chats[0])
      }
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    if (token) {
      fetchStats(token)
      fetchTestChats()
    }
  }, [token])

  useEffect(() => {
    if (token && activeTab === 'live') {
      fetchActiveJobs()
      const interval = setInterval(fetchActiveJobs, 5000)
      return () => clearInterval(interval)
    }
  }, [token, activeTab])

  const handleLogin = (e) => {
    e.preventDefault()
    fetchStats(passwordInput)
  }

  const handleLogout = () => {
    setToken('')
    setStats(null)
    localStorage.removeItem('admin_token')
    setDropdownOpen(false)
  }

  const handleChangePw = async (e) => {
    e.preventDefault()
    if (newPw !== confirmPw) return setError('Şifreler eşleşmiyor!')
    try {
      const formData = new FormData()
      formData.append('current_pw', token)
      formData.append('new_pw', newPw)
      const resp = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'X-API-Key': 'AnatomiSecureKey2026!' },
        body: formData
      })
      if (resp.ok) {
        setPwModalOpen(false)
        setToken(newPw)
        localStorage.setItem('admin_token', newPw)
        setNewPw('')
        setConfirmPw('')
        alert('Şifre başarıyla güncellendi!')
      } else {
        setError('Şifre değiştirilemedi')
      }
    } catch (e) { setError('Bağlantı hatası') }
  }

  const runTestAnalysis = async () => {
    if (!selectedTestChat) return
    setIsTesting(true)
    setTestError(null)
    setTestResult(null)
    try {
      const resp = await fetch(`/api/admin/analyze-test-chat/${selectedTestChat}`, {
        method: 'POST',
        headers: { 'pw': token, 'X-API-Key': 'AnatomiSecureKey2026!' }
      })
      const data = await resp.json()
      if (resp.ok && data.success) setTestResult(data.result)
      else setTestError(data.detail || 'Test analizi başarısız oldu.')
    } catch (e) { setTestError('Sunucu bağlantı hatası.') }
    finally { setIsTesting(false) }
  }

  // --- Login Screen ---
  if (!stats) {
    return (
      <div className="bg-[#0b141b] text-white flex items-center justify-center min-h-screen font-sans fixed inset-0 z-[100]">
        <div className="absolute top-4 right-4">
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><X size={20} /></button>
        </div>
        <div className="bg-[#111b21] p-8 rounded-xl border border-gray-800 shadow-xl w-full max-w-sm">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Anatomi Admin</h2>
            <p className="text-sm text-gray-400 mt-2">Giriş yapmak için şifrenizi girin</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Şifre</label>
              <input 
                type="password" 
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-700 bg-black/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#59dcb5]" 
                placeholder="••••••••" 
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            <button type="submit" className="w-full bg-[#59dcb5] text-black font-medium h-10 rounded-md hover:bg-[#59dcb5]/90 transition-colors">Giriş Yap</button>
          </form>
        </div>
      </div>
    )
  }

  // --- Main Dashboard ---
  return (
    <div className="bg-[#0b141b] text-gray-100 min-h-screen pb-10 font-sans fixed inset-0 z-50 overflow-y-auto">
      <div className="border-b border-gray-800 bg-[#111b21] px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 px-3 bg-white/10 rounded-full hover:bg-white/20 text-xs">Geri</button>
          <div className="w-8 h-8 rounded-full bg-[#59dcb5] flex items-center justify-center text-black font-bold text-xl">A</div>
          <h1 className="text-xl font-semibold tracking-tight hidden lg:block">Admin Panel</h1>
        </div>
        
        <div className="flex items-center bg-black/30 rounded-lg p-1 border border-gray-800 absolute left-1/2 -translate-x-1/2">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-[#59dcb5] text-black' : 'text-gray-400 hover:text-white'}`}>Overview</button>
          <button onClick={() => setActiveTab('live')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'live' ? 'bg-[#59dcb5] text-black' : 'text-gray-400 hover:text-white'}`}>Live Monitor</button>
          <button onClick={() => setActiveTab('tester')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'tester' ? 'bg-[#59dcb5] text-black' : 'text-gray-400 hover:text-white'}`}>Tester</button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 hidden sm:block">{stats?.daily_active_users || 0} active</span>
          <button onClick={handleLogout} className="p-2 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20"><LogOut size={18}/></button>
        </div>
      </div>

      <main className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        {activeTab === 'overview' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Users" value={stats?.total_users} icon={<Users size={16}/>} />
              <StatCard title="Analyses" value={stats?.total_analyses} icon={<FileText size={16}/>} />
              <StatCard title="Unlocked" value={stats?.total_unlocked} icon={<LockOpen size={16}/>} />
              <StatCard title="Scans" value={stats?.total_scans_used} icon={<Activity size={16}/>} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-gray-800 bg-[#111b21] p-6 h-[400px]">
                <h3 className="font-semibold mb-4 text-sm text-gray-400 uppercase tracking-widest">Scans (Weekly)</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={(stats?.chart_labels || []).map((l,i) => ({d:l,v:stats.chart_values[i]}))}>
                    <defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#59dcb5" stopOpacity={0.3}/><stop offset="95%" stopColor="#59dcb5" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="d" stroke="#6b7280" fontSize={10} />
                    <YAxis stroke="#6b7280" fontSize={10} />
                    <Tooltip contentStyle={{backgroundColor:'#111b21',borderColor:'#374151'}} />
                    <Area type="monotone" dataKey="v" stroke="#59dcb5" fill="url(#c)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-xl border border-gray-800 bg-[#111b21] p-0 overflow-hidden">
                <h3 className="font-semibold p-6 border-b border-gray-800 text-sm text-gray-400 uppercase tracking-widest">Recent Analyses</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-black/20 text-gray-500 border-b border-gray-800">
                      <tr><th className="px-6 py-3 font-medium">Chat</th><th className="px-6 py-3 font-medium">Date</th><th className="px-6 py-3 font-medium">Status</th></tr>
                    </thead>
                    <tbody>
                      {(stats?.recent_analyses || []).map((r,i) => (
                        <tr key={i} className="border-b border-gray-800/50 hover:bg-white/5">
                          <td className="px-6 py-4">{r.chat_name}</td>
                          <td className="px-6 py-4 text-gray-400">{r.created_at}</td>
                          <td className="px-6 py-4 text-xs font-bold">{r.is_unlocked ? '🔓 UNLOCKED' : '🔒 LOCKED'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'live' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard title="In Queue" value={liveStats.queue_size} color="text-red-500" />
              <StatCard title="Active" value={activeJobs.filter(j => j.status !== 'completed' && j.status !== 'error').length} color="text-[#59dcb5]" />
              <StatCard title="Memory" value={liveStats.total_in_memory} color="text-blue-500" />
            </div>
            <div className="rounded-xl border border-gray-800 bg-[#111b21] overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-black/20 text-gray-500 border-b border-gray-800">
                  <tr><th className="px-6 py-3">Job ID</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Time</th></tr>
                </thead>
                <tbody>
                  {activeJobs.map(j => (
                    <tr key={j.job_id} className="border-b border-gray-800/50 hover:bg-white/5">
                      <td className="px-6 py-4 font-mono text-xs">{j.job_id}</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-white/10 rounded text-[10px]">{j.status}</span></td>
                      <td className="px-6 py-4 text-gray-400">{new Date(j.queued_at*1000).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                  {activeJobs.length === 0 && <tr><td colSpan="3" className="text-center py-10 text-gray-500">Aktif iş yok.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ title, value, icon, color = "" }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-[#111b21] p-6">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
        {icon}
      </div>
      <div className={`text-3xl font-bold ${color}`}>{value || 0}</div>
    </div>
  )
}
