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

  // New states for Testing Environment
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'tester'
  const [testChats, setTestChats] = useState([])
  const [selectedTestChat, setSelectedTestChat] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [testError, setTestError] = useState(null)
  const [previewMode, setPreviewMode] = useState(null) // 'dashboard' | 'story' | null
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

  const fetchTestChats = async () => {
    try {
      const resp = await fetch('/api/admin/test-chats', {
        headers: { 
          'pw': token,
          'X-API-Key': 'AnatomiSecureKey2026!'
        }
      })
      if (resp.ok) {
        const data = await resp.json()
        setTestChats(data.chats || [])
        if (data.chats?.length > 0 && !selectedTestChat) {
          setSelectedTestChat(data.chats[0])
        }
      }
    } catch (e) {
      console.error("Test chats yüklenemedi", e)
    }
  }

  useEffect(() => {
    if (token) {
      fetchStats(token)
      fetchTestChats()
    }
  }, [token])

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

  const runTestAnalysis = async () => {
    if (!selectedTestChat) return
    setIsTesting(true)
    setTestError(null)
    setTestResult(null)
    setPreviewMode(null)

    try {
      const resp = await fetch(`/api/admin/analyze-test-chat/${selectedTestChat}`, {
        method: 'POST',
        headers: {
          'pw': token,
          'X-API-Key': 'AnatomiSecureKey2026!'
        }
      })
      const data = await resp.json()
      if (resp.ok && data.success) {
        setTestResult(data.result)
      } else {
        setTestError(data.detail || 'Test analizi başarısız oldu.')
      }
    } catch (e) {
      setTestError('Sunucu bağlantı hatası.')
    } finally {
      setIsTesting(false)
    }
  }

  // --- Preview Overlays ---
  if (previewMode === 'dashboard' && testResult) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0b141b] overflow-y-auto">
        <div className="sticky top-0 z-[200] bg-black/50 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
          <div className="text-white font-medium flex items-center gap-2"><Eye size={18}/> Preview: Dashboard</div>
          <button onClick={() => setPreviewMode(null)} className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors">
            <X size={16}/> Close Preview
          </button>
        </div>
        <div className="relative z-0">
          <Dashboard data={testResult} onShowStories={() => setPreviewMode('story')} />
        </div>
      </div>
    )
  }

  if (previewMode === 'story' && testResult) {
    return (
      <div className="fixed inset-0 z-[100] bg-black">
        <div className="absolute top-4 left-4 z-[200]">
          <button onClick={() => setPreviewMode(null)} className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors">
            <X size={16}/> Exit Story Preview
          </button>
        </div>
        <StoryMode data={testResult} onClose={() => setPreviewMode(null)} />
      </div>
    )
  }

  // --- Login Screen ---
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
        
        {/* Tab Navigation */}
        <div className="flex items-center bg-black/30 rounded-lg p-1 border border-gray-800 absolute left-1/2 -translate-x-1/2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'bg-[#59dcb5] text-black' : 'text-gray-400 hover:text-white'}`}
          >
            <Activity size={16} /> Overview
          </button>
          <button 
            onClick={() => { setActiveTab('tester'); fetchTestChats(); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'tester' ? 'bg-[#59dcb5] text-black' : 'text-gray-400 hover:text-white'}`}
          >
            <Beaker size={16} /> Algorithm Tester
          </button>
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
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
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
          </>
        )}

        {/* ALGORITHM TESTER TAB */}
        {activeTab === 'tester' && (
          <div className="flex flex-col gap-6">
            <div className="bg-[#111b21] border border-gray-800 rounded-xl p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <h2 className="text-xl font-semibold text-white">Algorithm & UI Tester</h2>
                <p className="text-sm text-gray-400 mt-1">Select a predefined WhatsApp chat file to instantly run NLP analysis without quota limits.</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <button
                    onClick={() => setDropdownChatOpen(!dropdownChatOpen)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-gray-700 bg-black/50 px-3 py-2 text-sm text-gray-300 ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#59dcb5] focus:ring-offset-2 focus:ring-offset-[#111b21] transition-all"
                  >
                    <span>{selectedTestChat || 'Select Test Chat'}</span>
                    <ChevronDown size={16} className={`opacity-50 transition-transform ${dropdownChatOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {dropdownChatOpen && (
                    <div className="absolute z-50 min-w-[8rem] w-full mt-1 overflow-hidden rounded-md border border-gray-700 bg-[#111b21] text-gray-200 shadow-md animate-in fade-in-80 zoom-in-95 slide-in-from-top-2">
                      <div className="p-1">
                        {testChats.map(chat => (
                          <div
                            key={chat}
                            onClick={() => { setSelectedTestChat(chat); setDropdownChatOpen(false); }}
                            className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-white/10 focus:bg-white/10 transition-colors ${selectedTestChat === chat ? 'bg-white/5 font-medium text-white' : ''}`}
                          >
                            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                              {selectedTestChat === chat && <Check size={14} className="text-[#59dcb5]" />}
                            </span>
                            {chat}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button 
                  onClick={runTestAnalysis}
                  disabled={!selectedTestChat || isTesting}
                  className="bg-[#59dcb5] hover:bg-[#59dcb5]/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium text-sm px-5 py-2.5 rounded-md flex items-center gap-2"
                >
                  {isTesting ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"/> : <Play size={16} />}
                  Run Test
                </button>
              </div>
            </div>

            {testError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
                {testError}
              </div>
            )}

            {testResult && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left: Previews */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-[#111b21] border border-gray-800 rounded-xl p-6">
                    <h3 className="font-semibold text-white mb-4">UI Previews</h3>
                    <p className="text-xs text-gray-400 mb-6">Launch the generated analysis data into the main app UI components to verify visual layout and rendering accuracy.</p>
                    <div className="space-y-3">
                      <button 
                        onClick={() => setPreviewMode('dashboard')}
                        className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-colors"
                      >
                        <Activity className="text-[#59dcb5]" size={24}/>
                        <span className="font-medium">Preview Dashboard</span>
                      </button>
                      <button 
                        onClick={() => setPreviewMode('story')}
                        className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-colors"
                      >
                        <Eye className="text-pink-500" size={24}/>
                        <span className="font-medium">Preview Story Mode</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-[#111b21] border border-gray-800 rounded-xl p-6">
                    <h3 className="font-semibold text-white mb-4">Analysis Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span className="text-gray-400">Time Taken</span>
                        <span className="text-white font-medium">{testResult.analysis_time_seconds}s</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-800 py-2">
                        <span className="text-gray-400">Messages</span>
                        <span className="text-white font-medium">{testResult.parse_summary.total_messages.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-800 py-2">
                        <span className="text-gray-400">Word Count</span>
                        <span className="text-white font-medium">{testResult.parse_summary.total_words.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-gray-400">Users</span>
                        <span className="text-white font-medium">{testResult.parse_summary.user_count}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Raw JSON */}
                <div className="lg:col-span-2 bg-[#111b21] border border-gray-800 rounded-xl flex flex-col overflow-hidden h-[600px]">
                  <div className="bg-black/30 border-b border-gray-800 px-4 py-3 flex items-center gap-2">
                    <FileJson size={16} className="text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-300">Raw JSON Output</h3>
                  </div>
                  <div className="p-4 overflow-auto flex-1 text-xs font-mono text-emerald-400/90 leading-relaxed custom-scrollbar">
                    <pre>{JSON.stringify(testResult.metrics, null, 2)}</pre>
                  </div>
                </div>

              </div>
            )}
            
            {!testResult && !isTesting && !testError && (
              <div className="border border-dashed border-gray-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <Beaker className="text-gray-500" size={32} />
                </div>
                <h3 className="text-lg font-medium text-white">No Test Results Yet</h3>
                <p className="text-sm text-gray-400 mt-2 max-w-md">Select a test chat from the dropdown above and run the test to see the algorithm output and UI previews.</p>
              </div>
            )}
          </div>
        )}

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
