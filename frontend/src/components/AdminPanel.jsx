import React, { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, FileText, LockOpen, Activity, ChevronDown, Lock, LogOut, X } from 'lucide-react'

export default function AdminPanel({ onClose }) {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '')
  const [passwordInput, setPasswordInput] = useState('')
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [pwModalOpen, setPwModalOpen] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const fetchStats = async (pw) => {
    try {
      const resp = await fetch('/api/admin/stats', {
        headers: { 
          'pw': pw,
          'X-API-Key': 'AnatomiSecureKey2026!'
        }
      })
      if (resp.ok) {
        setStats(await resp.json())
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

  useEffect(() => {
    if (token) fetchStats(token)
  }, [])

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
        headers: {
          'X-API-Key': 'AnatomiSecureKey2026!'
        },
        body: formData
      })
      if (resp.ok) {
        setPwModalOpen(false)
        setToken(newPw)
        localStorage.setItem('admin_token', newPw)
        setNewPw('')
        setConfirmPw('')
        setError('')
        alert('Şifre başarıyla güncellendi!')
      } else {
        setError('Şifre değiştirilemedi')
      }
    } catch (e) {
      setError('Bağlantı hatası')
    }
  }

  if (!stats) {
    return (
      <div className="bg-[#0b141b] text-white flex items-center justify-center min-h-screen font-sans fixed inset-0 z-50">
        <div className="absolute top-4 right-4">
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
            <X size={20} />
          </button>
        </div>
        <div className="bg-[#111b21] p-8 rounded-xl border border-gray-800 shadow-xl w-full max-w-sm">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Anatomi Admin</h2>
            <p className="text-sm text-gray-400 mt-2">Enter credentials to dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Password</label>
              <input 
                type="password" 
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-700 bg-black/50 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#59dcb5] focus:ring-offset-2 focus:ring-offset-[#111b21]" 
                placeholder="••••••••" 
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            <button type="submit" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-[#59dcb5] text-black hover:bg-[#59dcb5]/90 h-10 px-4 py-2 w-full">Sign In</button>
          </form>
        </div>
      </div>
    )
  }

  const chartData = stats.chart_labels.map((label, i) => ({
    date: label,
    Analyses: stats.chart_values[i]
  }))

  return (
    <div className="bg-[#0b141b] text-gray-100 min-h-screen pb-10 font-sans fixed inset-0 z-50 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#111b21] px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 px-3 bg-white/10 rounded-full hover:bg-white/20 text-xs">Back</button>
          <div className="w-8 h-8 rounded-full bg-[#59dcb5] flex items-center justify-center text-black font-bold text-xl ml-2">A</div>
          <h1 className="text-xl font-semibold tracking-tight hidden sm:block">Anatomi Dashboard</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-sm text-gray-400 hidden sm:block">{stats.daily_active_users} active today</div>
          
          <div className="relative inline-block text-left">
            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 hover:bg-white/5 p-1 pr-3 rounded-full transition-colors group">
                <img src="https://ui-avatars.com/api/?name=Admin&background=1f2937&color=fff" className="w-8 h-8 rounded-full" />
                <span className="text-sm font-medium text-gray-300 group-hover:text-white flex items-center gap-1">Admin <ChevronDown size={14}/></span>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-[#111b21] ring-1 ring-black ring-opacity-5 border border-gray-800 z-50 overflow-hidden">
                <div className="py-1">
                  <button onClick={() => { setDropdownOpen(false); setPwModalOpen(true) }} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white w-full text-left transition-colors">
                    <Lock size={14}/> Change Password
                  </button>
                  <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-red-500/10 text-red-500 hover:text-red-400 w-full text-left transition-colors">
                    <LogOut size={14}/> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-800 bg-[#111b21] text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-medium text-gray-400">Total Users</h3>
              <Users size={16} className="text-gray-500" />
            </div>
            <div className="text-3xl font-bold">{stats.total_users}</div>
            <p className="text-xs text-gray-500 mt-1">Registered unique devices</p>
          </div>
          
          <div className="rounded-xl border border-gray-800 bg-[#111b21] text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-medium text-gray-400">Total Analyses</h3>
              <FileText size={16} className="text-emerald-500" />
            </div>
            <div className="text-3xl font-bold">{stats.total_analyses}</div>
            <p className="text-xs text-gray-500 mt-1">Raw chat uploads</p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-[#111b21] text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-medium text-gray-400">Unlocked Histories</h3>
              <LockOpen size={16} className="text-amber-500" />
            </div>
            <div className="text-3xl font-bold">{stats.total_unlocked}</div>
            <p className="text-xs text-gray-500 mt-1">Ads successfully watched</p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-[#111b21] text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-medium text-gray-400">Total Scans Run</h3>
              <Activity size={16} className="text-blue-500" />
            </div>
            <div className="text-3xl font-bold">{stats.total_scans_used}</div>
            <p className="text-xs text-gray-500 mt-1">Lifetime quota consumption</p>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Chart */}
          <div className="rounded-xl border border-gray-800 bg-[#111b21] shadow-sm flex flex-col h-[400px]">
             <div className="flex flex-col space-y-1.5 p-6 border-b border-gray-800">
                <h3 className="font-semibold leading-none tracking-tight">Weekly Scans Overview</h3>
             </div>
             <div className="p-6 flex-1 w-full h-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorAnalyses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#59dcb5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#59dcb5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="date" stroke="#6b7280" tick={{fill: '#6b7280', fontSize: 12}} />
                    <YAxis stroke="#6b7280" tick={{fill: '#6b7280', fontSize: 12}} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#111b21', borderColor: '#374151', color: '#fff'}}
                      itemStyle={{color: '#59dcb5'}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Analyses" 
                      stroke="#59dcb5" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorAnalyses)"
                      dot={{fill: '#111b21', stroke: '#59dcb5', strokeWidth: 2, r: 4}} 
                      activeDot={{r: 6}} 
                    />
                  </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-gray-800 bg-[#111b21] shadow-sm flex flex-col flex-1">
             <div className="flex flex-col space-y-1.5 p-6 border-b border-gray-800">
                <h3 className="font-semibold leading-none tracking-tight">Recent Analyses</h3>
             </div>
             <div className="overflow-x-auto flex-1 p-0">
               <table className="w-full text-sm text-left">
                 <thead className="border-b border-gray-800 bg-black/20 text-gray-400">
                   <tr>
                     <th className="px-6 py-4 font-medium">Chat Name</th>
                     <th className="px-4 py-4 font-medium">Date</th>
                     <th className="px-4 py-4 font-medium">Messages</th>
                     <th className="px-6 py-4 font-medium">Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   {stats.recent_analyses.map((r, i) => (
                     <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                       <td className="px-6 py-4 font-medium">{r.chat_name}</td>
                       <td className="px-4 py-4 text-gray-400">{r.created_at}</td>
                       <td className="px-4 py-4">{r.total_messages.toLocaleString()} msgs</td>
                       <td className="px-6 py-4">
                         <span className={`text-sm font-medium ${r.is_unlocked ? 'text-green-400' : 'text-amber-500'}`}>
                           {r.is_unlocked ? '🔓 Unlocked' : '🔒 Locked'}
                         </span>
                       </td>
                     </tr>
                   ))}
                   {stats.recent_analyses.length === 0 && (
                     <tr><td colSpan="4" className="text-center py-8 text-gray-500">Kayıtlı analiz yok.</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      </main>

      {/* Password Modal */}
      {pwModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111b21] border border-gray-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg text-white">Change Password</h3>
              </div>
              <button onClick={() => setPwModalOpen(false)} className="text-gray-400 hover:text-white"><X size={16}/></button>
            </div>
            <form onSubmit={handleChangePw} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">New Password</label>
                <input 
                  type="password" required 
                  value={newPw} onChange={e => setNewPw(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-700 bg-black/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#59dcb5] text-white" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Confirm Password</label>
                <input 
                  type="password" required 
                  value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-700 bg-black/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#59dcb5] text-white" 
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
              </div>
              <button type="submit" className="w-full mt-2 h-10 rounded-md bg-[#59dcb5] text-black font-medium hover:bg-[#59dcb5]/90">
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
