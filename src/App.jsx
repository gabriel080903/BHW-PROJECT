import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from './utils/api'
import { validateBackupFile, validateResidentBatch } from './utils/importValidator'
import { motion, AnimatePresence } from 'framer-motion'
import Login                 from './components/Login'
import Dashboard             from './components/Dashboard'
import ResidentForm          from './components/ResidentForm'
import ResidentTable         from './components/ResidentTable'
import BHWSpreadsheet        from './components/BHWSpreadsheet'
import NutritionEntry        from './components/NutritionEntry'
import VaxTracker            from './components/VaxTracker'
import Inventory             from './components/Inventory'
import MonthlyReport         from './components/MonthlyReport'
import ResidentApprovalPanel from './components/ResidentApprovalPanel'
import UserManagement from './components/UserManagement'

const load = (key, fallback = []) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

const ALL_TABS = [
  { id: 'dashboard',  label: 'Dashboard',  short: 'Dashboard', icon: '📊', roles: ['Admin','BHW'] },
  { id: 'residents',  label: 'Residents',  short: 'Residents', icon: '👥', roles: ['Admin','BHW'] },
  { id: 'management', label: 'Management', short: 'Approvals', icon: '✅', roles: ['Admin','BHW'] },
  { id: 'nutrition',  label: 'Nutrition',  short: 'Nutrition', icon: '🥗', roles: ['Admin','BHW'] },
  { id: 'vaccines',   label: 'Vaccines',   short: 'Vaccines',  icon: '💉', roles: ['Admin','BHW'] },
  { id: 'inventory',  label: 'Inventory',  short: 'Inventory', icon: '📦', roles: ['Admin','BHW'] },
  { id: 'report',     label: 'Report',     short: 'Report',    icon: '📋', roles: ['Admin','BHW'] },
  { id: 'users',      label: 'Users',      short: 'Users',     icon: '👤', roles: ['Admin'] },
]

export function BHWLogo({ size = 38 }) {
  const id = `sg${size}`
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 3L5 11V24.5C5 34.8 13.3 44.2 24 46C34.7 44.2 43 34.8 43 24.5V11L24 3Z" fill={`url(#${id})`}/>
      <path d="M24 7.5L9 14.5V24.5C9 33 16.2 41.1 24 43C31.8 41.1 39 33 39 24.5V14.5L24 7.5Z" fill="white" fillOpacity="0.12"/>
      <rect x="13.5" y="21" width="21" height="6" rx="2.5" fill="white"/>
      <rect x="21" y="13.5" width="6" height="21" rx="2.5" fill="white"/>
      <circle cx="35" cy="35" r="6.5" fill={`url(#lg${size})`}/>
      <path d="M35 30.5Q37.5 33 35 37.5Q32.5 33 35 30.5Z" fill="white" fillOpacity="0.7"/>
      <defs>
        <linearGradient id={id} x1="5" y1="3" x2="43" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4ade80"/><stop offset="55%" stopColor="#10b981"/><stop offset="100%" stopColor="#047857"/>
        </linearGradient>
        <linearGradient id={`lg${size}`} x1="28" y1="28" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

function Toast({ n }) {
  if (!n) return null
  const c  = { success:'bg-emerald-600', error:'bg-red-500', info:'bg-blue-500', warning:'bg-amber-500' }
  const ic = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' }
  return (
    <AnimatePresence>
      <motion.div key={n.id}
        initial={{ opacity:0, y:-60, x:'-50%' }} animate={{ opacity:1, y:0, x:'-50%' }}
        exit={{ opacity:0, y:-60, x:'-50%' }}
        transition={{ type:'spring', stiffness:320, damping:26 }}
        className={`fixed top-4 left-1/2 z-[200] px-5 py-3 rounded-2xl shadow-2xl text-white font-bold text-sm flex items-center gap-2 ${c[n.type]||c.success}`}>
        {ic[n.type]||'✅'} {n.message}
      </motion.div>
    </AnimatePresence>
  )
}

// ── ResidentsTab (defined at module level — NOT inside App) ───────────────────
function ResidentsTab({ filteredResidents, addResident, updateResident, deleteResident, importResidents, canEdit, isParent, userRole, notify, assignResidentToParent, unassignResidentFromParent, allResidents }) {
  const [editingResident, setEditingResident] = useState(null)
  const [view, setView] = useState('table')
  const [assignModal, setAssignModal] = useState(null)

  const handleSave = (data, id) => {
    if (id) { updateResident(id, data); setEditingResident(null); setView('table') }
    else if (editingResident) { updateResident(editingResident.id, data); setEditingResident(null); setView('table') }
    else { addResident(data) }
  }

  const handleEdit = (resident) => { setEditingResident(resident); setView('edit') }

  if (isParent) {
    return (
      <div className="flex flex-col xl:flex-row gap-5 min-h-0">
        <div className="xl:w-[400px] flex-shrink-0">
          <ResidentForm onSave={handleSave} onImport={importResidents} editResident={null} onCancelEdit={() => {}} />
        </div>
        <div className="flex-1 min-w-0">
          <ResidentTable residents={filteredResidents} canEdit={false} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 w-fit">
        {[
          { id:'table',       label:'📋 Residents List', desc:'View, edit & manage all residents' },
          { id:'spreadsheet', label:'📊 Bulk Entry',     desc:'Add many residents at once like Excel' },
        ].map(v => (
          <button key={v.id} onClick={() => { setView(v.id); setEditingResident(null) }} title={v.desc}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
              view===v.id || (view==='edit' && v.id==='table')
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}>
            {v.label}
            {v.id==='table' && <span className="ml-1.5 bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full font-black">{filteredResidents.length}</span>}
          </button>
        ))}
      </div>

      {(view==='table'||view==='edit') && (
        <div className={view==='edit' ? 'flex flex-col xl:flex-row gap-5' : ''}>
          {view==='edit' && (
            <div className="xl:w-[400px] flex-shrink-0">
              <ResidentForm
                onSave={handleSave} onImport={importResidents}
                editResident={editingResident}
                onCancelEdit={() => { setEditingResident(null); setView('table') }}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <ResidentTable residents={filteredResidents} onDelete={deleteResident}
              onUpdate={updateResident} onImport={importResidents} canEdit={canEdit} 
              onEdit={handleEdit} onAssignParent={assignModal ? null : setAssignModal} />
          </div>
        </div>
      )}

      {view==='spreadsheet' && (
        <BHWSpreadsheet
          onImport={(rows) => { importResidents(rows); setView('table') }}
          notify={notify}
        />
      )}

      {/* Modal for assigning parents */}
      {assignModal && (
        <ParentAssignmentModal
          resident={assignModal}
          onClose={() => setAssignModal(null)}
          onAssign={(parentId) => {
            assignResidentToParent(assignModal.id, parentId)
            setAssignModal(null)
          }}
          onUnassign={(parentId) => unassignResidentFromParent(assignModal.id, parentId)}
          allResidents={allResidents}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX: ParentPortalLabel and ParentCard are defined at MODULE level.
// Previously they were nested inside ParentPortal → recreated every render →
// inputs lost focus after each keystroke.
// ─────────────────────────────────────────────────────────────────────────────
function ParentPortalLabel({ children, required }) {
  return (
    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
}

function ParentCard({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

const parentInpCls = (err) =>
  `w-full px-3.5 py-3 rounded-xl border text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 transition-all placeholder-slate-300 ${err ? 'border-red-300 bg-red-50 ring-red-200' : 'border-slate-200 hover:border-slate-300'}`

// ── PARENT / GUARDIAN PORTAL ──────────────────────────────────────────────────
function ParentPortal({ user, residents, records, onLogout, notify,
  addResident, importResidents, addNutritionRecord, updateNutritionRecord,
  deleteNutritionRecord, updateResidentVax, approveRecord }) {

  const [activeTab, setActiveTab] = useState('home')

  const PARENT_TABS = [
    { id:'home',      label:'Home',      icon:'🏠' },
    { id:'family',    label:'My Family', icon:'👨‍👩‍👧‍👦' },
    { id:'nutrition', label:'Nutrition', icon:'🥗' },
    { id:'vaccines',  label:'Vaccines',  icon:'💉' },
    { id:'report',    label:'Report',    icon:'📋' },
  ]

  const stats = useMemo(() => {
    const total      = residents.length
    const vaccinated = residents.filter(r => r.vax?.length > 0).length
    const normal     = records.filter(r => r.status==='Normal').length
    const alerts     = records.filter(r => ['Underweight','Severely Underweight','Stunted','Wasted','Obese'].includes(r.status)).length
    return { total, vaccinated, normal, alerts }
  }, [residents, records])

  const [addForm, setAddForm] = useState({ firstName:'', lastName:'', middleName:'', birthDate:'', gender:'', purok:'', place:'' })
  const [addErrors, setAddErrors] = useState({})
  const [addSaved,  setAddSaved]  = useState(false)

  const setField = e => {
    setAddForm(p => ({ ...p, [e.target.name]: e.target.value }))
    if (addErrors[e.target.name]) setAddErrors(p => ({ ...p, [e.target.name]: '' }))
  }

  const handleAddResident = e => {
    e.preventDefault()
    const errs = {}
    if (!addForm.firstName.trim()) errs.firstName = 'Required'
    if (!addForm.lastName.trim())  errs.lastName  = 'Required'
    if (!addForm.gender)           errs.gender    = 'Required'
    if (!addForm.birthDate)        errs.birthDate = 'Required'
    if (Object.keys(errs).length) { setAddErrors(errs); return }
    addResident({ ...addForm, allergies:[], medications:[], bloodType:'Unknown', vax:[], status:'active' })
    setAddForm({ firstName:'', lastName:'', middleName:'', birthDate:'', gender:'', purok:'', place:'' })
    setAddErrors({})
    setAddSaved(true)
    setTimeout(() => setAddSaved(false), 2500)
  }

  const today = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
  const statusBadge = {
    'Normal':               'bg-emerald-100 text-emerald-700 border border-emerald-200',
    'Underweight':          'bg-amber-100 text-amber-700 border border-amber-200',
    'Severely Underweight': 'bg-red-100 text-red-700 border border-red-200',
    'Overweight':           'bg-orange-100 text-orange-700 border border-orange-200',
    'Obese':                'bg-red-100 text-red-700 border border-red-200',
    'Stunted':              'bg-purple-100 text-purple-700 border border-purple-200',
    'Wasted':               'bg-red-200 text-red-800 border border-red-300',
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <header className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 sticky top-0 z-50 shadow-xl">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14 gap-3">
            {/* Avatar */}
            {user.avatar
              ? <img src={user.avatar} alt="avatar" className="w-9 h-9 rounded-full border-2 border-white/40 flex-shrink-0" />
              : <div className="w-9 h-9 rounded-full bg-white/25 border-2 border-white/40 flex items-center justify-center text-white font-black text-sm flex-shrink-0 uppercase">{user.username?.[0]}</div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm leading-tight">Hello, {user.username}!</p>
              <p className="text-violet-300 text-[10px] font-semibold uppercase tracking-widest">Parent / Guardian</p>
            </div>
            <button onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-red-500 text-white rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex-shrink-0 border border-white/20 hover:border-red-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-0" style={{ scrollbarWidth:'none' }}>
            {PARENT_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all flex-shrink-0 ${
                  activeTab===tab.id ? 'text-white' : 'text-violet-300 hover:text-white hover:bg-white/10 rounded-t-lg'
                }`}>
                <span className="text-sm">{tab.icon}</span>
                <span>{tab.label}</span>
                {activeTab===tab.id && (
                  <motion.span layoutId="parent-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"/>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-8 }} transition={{ duration:0.2 }}>

            {/* HOME */}
            {activeTab==='home' && (
              <div className="space-y-6">
                <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl p-6 shadow-md">
                  <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"/>
                  <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none"/>
                  <div className="relative">
                    <p className="text-violet-200 text-xs font-bold uppercase tracking-widest mb-2">Parent / Guardian Portal</p>
                    <p className="text-white text-2xl font-black leading-tight">Welcome back,</p>
                    <p className="text-white text-2xl font-black leading-tight capitalize">{user.username}! 👋</p>
                    <p className="text-violet-200 text-xs mt-2">{today}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { icon:'👥', label:'Registered',   val:stats.total,     color:'violet' },
                    { icon:'💉', label:'Vaccinated',    val:stats.vaccinated, color:'blue' },
                    { icon:'✅', label:'Normal BMI',    val:stats.normal,     color:'emerald' },
                    { icon:'⚠️', label:'Health Alerts', val:stats.alerts,     color:stats.alerts>0?'amber':'emerald' },
                  ].map(({ icon, label, val, color }) => {
                    const bg  = { violet:'bg-violet-50 border-violet-100', blue:'bg-blue-50 border-blue-100', emerald:'bg-emerald-50 border-emerald-100', amber:'bg-amber-50 border-amber-100' }[color]
                    const num = { violet:'text-violet-700', blue:'text-blue-700', emerald:'text-emerald-700', amber:'text-amber-700' }[color]
                    const lbl = { violet:'text-violet-500', blue:'text-blue-500', emerald:'text-emerald-500', amber:'text-amber-500' }[color]
                    return (
                      <motion.div key={label} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                        className={`${bg} border rounded-2xl p-5 flex flex-col items-center justify-center gap-1 text-center`}>
                        <span className="text-2xl mb-1">{icon}</span>
                        <p className={`text-3xl font-black ${num}`}>{val}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${lbl}`}>{label}</p>
                      </motion.div>
                    )
                  })}
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Access</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { icon:'👨‍👩‍👧‍👦', label:'My Family',  sub:'Register & view members', tab:'family',    grad:'from-violet-500 to-purple-600' },
                      { icon:'🥗',      label:'Nutrition',  sub:'Log weight & BMI',        tab:'nutrition', grad:'from-emerald-500 to-teal-600' },
                      { icon:'💉',      label:'Vaccines',   sub:'Track immunizations',      tab:'vaccines',  grad:'from-blue-500 to-indigo-600' },
                      { icon:'📋',      label:'Report',     sub:'Monthly health summary',   tab:'report',    grad:'from-amber-500 to-orange-500' },
                    ].map(({ icon, label, sub, tab, grad }) => (
                      <motion.button key={tab} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                        onClick={() => setActiveTab(tab)} whileTap={{scale:0.97}}
                        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-violet-200 transition-all text-left group h-full">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform shadow-sm`}>
                          {icon}
                        </div>
                        <p className="font-extrabold text-slate-800 text-sm">{label}</p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">{sub}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {stats.alerts > 0 && (
                  <ParentCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-base">⚠️</span>
                      <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">Health Alerts</h3>
                      <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">{stats.alerts} record{stats.alerts>1?'s':''}</span>
                    </div>
                    <div className="space-y-2">
                      {records.filter(r => ['Underweight','Severely Underweight','Stunted','Wasted','Obese'].includes(r.status)).slice(0,4).map((rec, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                          <span className="text-base flex-shrink-0">⚠️</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{rec.childName||'—'}</p>
                            <p className="text-xs text-slate-500">{rec.date} · BMI {rec.bmi}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${statusBadge[rec.status]||'bg-slate-100 text-slate-600'}`}>
                            {rec.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ParentCard>
                )}
              </div>
            )}

            {/* MY FAMILY */}
            {activeTab==='family' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-xl">👨‍👩‍👧‍👦</div>
                    <div>
                      <h1 className="text-lg font-black text-slate-800 leading-tight">My Family</h1>
                      <p className="text-xs text-slate-400 mt-0.5">{residents.length} member{residents.length!==1?'s':''} registered</p>
                    </div>
                  </div>
                </div>

                {/* Pending Requests Status */}
                {(() => {
                  const pendingRequests = (residents || []).filter(r => r.requestApprovalStatus === 'pending' && r.requestedBy === user?.id)
                  const rejectedRequests = (residents || []).filter(r => r.requestApprovalStatus === 'rejected' && r.requestedBy === user?.id)
                  if (pendingRequests.length === 0 && rejectedRequests.length === 0) return null
                  return (
                    <div className="space-y-3">
                      {pendingRequests.map((r, i) => (
                        <ParentCard key={`pending-${i}`} className="p-4 bg-amber-50 border-l-4 border-amber-400">
                          <div className="flex items-center gap-3 justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-amber-900">⏳ Pending Approval</p>
                              <p className="text-sm text-amber-800 mt-0.5">
                                {r.firstName} {r.lastName} is waiting for admin approval
                              </p>
                            </div>
                            <span className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold whitespace-nowrap">Submitted</span>
                          </div>
                        </ParentCard>
                      ))}
                      {rejectedRequests.map((r, i) => (
                        <ParentCard key={`rejected-${i}`} className="p-4 bg-red-50 border-l-4 border-red-400">
                          <div className="flex items-center gap-3 justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-red-900">❌ Request Rejected</p>
                              <p className="text-sm text-red-800 mt-0.5">
                                {r.firstName} {r.lastName} registration was not approved
                              </p>
                            </div>
                            <span className="px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-xs font-bold whitespace-nowrap">Rejected</span>
                          </div>
                        </ParentCard>
                      ))}
                    </div>
                  )
                })()}

                <ParentCard>
                  <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
                    <h2 className="text-white font-extrabold text-sm">➕ Register a Family Member</h2>
                    <p className="text-violet-200 text-xs mt-0.5">Add your child, spouse, or household member</p>
                  </div>
                  <form onSubmit={handleAddResident} className="p-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <ParentPortalLabel required>First Name</ParentPortalLabel>
                        <input name="firstName" value={addForm.firstName} onChange={setField} placeholder="e.g. Juan" className={parentInpCls(addErrors.firstName)}/>
                        {addErrors.firstName && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><span>⚠</span>{addErrors.firstName}</p>}
                      </div>
                      <div>
                        <ParentPortalLabel>Middle Name</ParentPortalLabel>
                        <input name="middleName" value={addForm.middleName} onChange={setField} placeholder="e.g. Santos" className={parentInpCls(false)}/>
                      </div>
                      <div>
                        <ParentPortalLabel required>Last Name</ParentPortalLabel>
                        <input name="lastName" value={addForm.lastName} onChange={setField} placeholder="e.g. Dela Cruz" className={parentInpCls(addErrors.lastName)}/>
                        {addErrors.lastName && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><span>⚠</span>{addErrors.lastName}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <ParentPortalLabel required>Birth Date</ParentPortalLabel>
                        <input type="date" name="birthDate" value={addForm.birthDate} onChange={setField} className={parentInpCls(addErrors.birthDate)}/>
                        {addErrors.birthDate && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><span>⚠</span>{addErrors.birthDate}</p>}
                      </div>
                      <div>
                        <ParentPortalLabel required>Gender</ParentPortalLabel>
                        <select name="gender" value={addForm.gender} onChange={setField} className={parentInpCls(addErrors.gender)}>
                          <option value="">— Select gender —</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                        {addErrors.gender && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><span>⚠</span>{addErrors.gender}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <ParentPortalLabel>Purok / Zone</ParentPortalLabel>
                        <input name="purok" value={addForm.purok} onChange={setField} placeholder="e.g. Purok 1, Zone 3" className={parentInpCls(false)}/>
                      </div>
                      <div>
                        <ParentPortalLabel>Barangay / Place</ParentPortalLabel>
                        <input name="place" value={addForm.place} onChange={setField} placeholder="e.g. Brgy. San Jose" className={parentInpCls(false)}/>
                      </div>
                    </div>
                    <motion.button type="submit" whileTap={{scale:0.98}}
                      className={`w-full py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 ${
                        addSaved
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-200'
                      }`}>
                      {addSaved ? '✅ Family Member Registered!' : '➕ Register Family Member'}
                    </motion.button>
                  </form>
                </ParentCard>

                {residents.length===0 ? (
                  <ParentCard className="p-16 text-center">
                    <span className="text-5xl block mb-4">👨‍👩‍👧‍👦</span>
                    <p className="font-extrabold text-slate-700 text-base">No family members yet</p>
                    <p className="text-sm text-slate-400 mt-1.5">Fill in the form above to register your first member</p>
                  </ParentCard>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{residents.length} Registered Member{residents.length!==1?'s':''}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {residents.map((m, i) => {
                        const age   = m.birthDate ? Math.floor((Date.now()-new Date(m.birthDate))/(1000*60*60*24*365.25)) : null
                        const grad  = m.gender==='Female'?'from-pink-400 to-rose-500':m.gender==='Male'?'from-blue-400 to-indigo-500':'from-purple-400 to-violet-500'
                        const vaxed = m.vax?.length>0
                        const myRec = records.filter(r => String(r.residentId)===String(m.id))
                          .sort((a,b)=>new Date(b.timestamp||b.id)-new Date(a.timestamp||a.id))[0]
                        return (
                          <motion.div key={m.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                            <div className={`h-1.5 bg-gradient-to-r ${grad}`}/>
                            <div className="p-5">
                              <div className="flex items-center gap-3 mb-4">
                                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-sm`}>
                                  {(m.firstName?.[0]||'?').toUpperCase()}{(m.lastName?.[0]||'').toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-extrabold text-slate-800 text-base leading-tight truncate">{m.firstName} {m.lastName}</p>
                                  <p className="text-xs text-slate-400 mt-0.5">{[age!==null?`${age} yrs`:null,m.gender,m.purok||m.place].filter(Boolean).join(' · ')}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2.5 mb-4">
                                {[
                                  { label:'BMI',    value: myRec?.bmi    || '—' },
                                  { label:'Weight', value: myRec?.weight ? `${myRec.weight} kg` : '—' },
                                  { label:'Height', value: myRec?.height ? `${myRec.height} cm` : '—' },
                                ].map(({ label, value }) => (
                                  <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl px-2 py-3 text-center">
                                    <p className="text-sm font-black text-slate-700 leading-none">{value}</p>
                                    <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wide mt-1.5">{label}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {myRec?.status && (
                                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusBadge[myRec.status]||'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                    {myRec.status}
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${vaxed?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                  {vaxed ? `✓ ${m.vax.length} Vaccine${m.vax.length>1?'s':''}` : '⚠ No Vax Record'}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab==='nutrition' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-xl">🥗</div>
                  <div>
                    <h1 className="text-lg font-black text-slate-800">Nutrition Records</h1>
                    <p className="text-xs text-slate-400">Log weight & height — BMI auto-calculated with WHO standards</p>
                  </div>
                </div>
                <NutritionEntry residents={residents} records={records} onSave={addNutritionRecord} onUpdate={updateNutritionRecord} onDelete={undefined} userRole={user?.role} onApprove={approveRecord}/>
              </div>
            )}

            {activeTab==='vaccines' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-xl">💉</div>
                  <div>
                    <h1 className="text-lg font-black text-slate-800">Vaccination Records</h1>
                    <p className="text-xs text-slate-400">Track immunization history for each family member</p>
                  </div>
                </div>
                <VaxTracker residents={residents} onUpdate={updateResidentVax} readOnly={false}/>
              </div>
            )}

            {activeTab==='report' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-xl">📋</div>
                  <div>
                    <h1 className="text-lg font-black text-slate-800">Monthly Health Report</h1>
                    <p className="text-xs text-slate-400">Summary of nutrition and health data</p>
                  </div>
                </div>
                <MonthlyReport residents={residents} records={records} inventory={[]}/>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
function ParentAssignmentModal({ resident, onClose, onAssign, onUnassign, allResidents }) {
  const [selectedParent, setSelectedParent] = useState('')

  // Build parent list: hardcoded accounts + any Google-login parents stored in localStorage
  const HARDCODED_PARENTS = [
    { id: '3', name: 'Parent Demo', email: 'parent@bhw.com' },
  ]

  // Collect any Google-authenticated parent sessions saved in storage
  // (stored as bhw_known_parents by Login on each Google sign-in)
  const googleParents = (() => {
    try { return JSON.parse(localStorage.getItem('bhw_known_parents')) || [] } catch { return [] }
  })()

  const PARENTS = [
    ...HARDCODED_PARENTS,
    ...googleParents.filter(gp => !HARDCODED_PARENTS.find(hp => hp.id === gp.id)),
  ]
  
  return (
    <>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose}/>
      <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
        className="fixed inset-4 bg-white rounded-2xl shadow-2xl z-50 p-6 flex flex-col max-h-screen overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-800">Assign Parent/Guardian</h2>
            <p className="text-sm text-slate-500 mt-1">{resident.firstName} {resident.lastName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">✕</button>
        </div>

        <div className="flex-1 space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Parent to Assign</label>
            <select value={selectedParent} onChange={e => setSelectedParent(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="">— Choose parent —</option>
              {PARENTS.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Currently Assigned To:</p>
            <div className="space-y-2">
              {resident.assignedParents?.length ? (
                resident.assignedParents.map((pid, i) => {
                  const p = PARENTS.find(x => String(x.id) === String(pid))
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{p?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{p?.email}</p>
                      </div>
                      <button onClick={() => onUnassign(pid)}
                        className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold">Remove</button>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-slate-400 italic">No parents assigned yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => { if (selectedParent) onAssign(selectedParent) }}
            disabled={!selectedParent}
            className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl font-bold uppercase tracking-wide">
            ➕ Assign Parent
          </button>
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold uppercase tracking-wide">
            Cancel
          </button>
        </div>
      </motion.div>
    </>
  )
}
// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user,      setUser]      = useState(() => { try { return JSON.parse(localStorage.getItem('bhw_user')) } catch { return null } })
  const [residents, setResidents] = useState(() => load('bhw_residents'))
  const [records,   setRecords]   = useState(() => load('bhw_nutrition_records'))
  const [inventory, setInventory] = useState(() => load('bhw_inventory'))
  const [activeTab,    setActiveTab]    = useState('dashboard')
  const [searchTerm,   setSearchTerm]   = useState('')
  const [notification, setNotification] = useState(null)
  const [isLoading,    setIsLoading]    = useState(false)
  const [sidebarOpen,  setSidebarOpen]  = useState(false)

  useEffect(() => { localStorage.setItem('bhw_residents',         JSON.stringify(residents)) }, [residents])
  useEffect(() => { localStorage.setItem('bhw_nutrition_records', JSON.stringify(records))   }, [records])
  useEffect(() => { localStorage.setItem('bhw_inventory',         JSON.stringify(inventory)) }, [inventory])

  const notify = useCallback((message, type='success') => {
    setNotification({ message, type, id: Date.now() })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  const handleLogin  = useCallback(s => { setUser(s); setActiveTab('dashboard') }, [])
  const handleLogout = useCallback(() => {
    localStorage.removeItem('bhw_user')
    setUser(null); setActiveTab('dashboard'); setSearchTerm('')
  }, [])

  const handleBackup = useCallback(() => {
    try {
      const data = { residents, records, inventory, backupDate: new Date().toISOString(), version:'2.0.0' }
      const url  = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], { type:'application/json' }))
      Object.assign(document.createElement('a'), { href:url, download:`BHW_BACKUP_${new Date().toISOString().split('T')[0]}.json` }).click()
      URL.revokeObjectURL(url); notify('Backup created!')
    } catch { notify('Backup failed','error') }
  }, [residents, records, inventory, notify])

  const handleRestore = useCallback(e => {
    const file = e.target.files[0]; if (!file) return
    setIsLoading(true)
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result)
        // Validate backup structure before applying
        const validation = validateBackupFile(parsed)
        if (!validation.valid) {
          notify(`Invalid backup: ${validation.errors[0]}`, 'error')
          setIsLoading(false)
          e.target.value = ''
          return
        }
        if (validation.errors.length > 0) {
          // Warnings only — still proceed
          console.warn('Backup warnings:', validation.errors)
        }
        if (parsed.residents) setResidents(parsed.residents)
        if (parsed.records)   setRecords(parsed.records)
        if (parsed.inventory) setInventory(parsed.inventory)
        notify('Data restored!')
      } catch { notify('Invalid backup file — could not parse JSON', 'error') }
      finally { setIsLoading(false); e.target.value = '' }
    }
    reader.onerror = () => { notify('Failed to read file','error'); setIsLoading(false) }
    reader.readAsText(file)
  }, [notify])

  // ── Resident CRUD ──────────────────────────────────────────────────────────
  const addResident = useCallback((data, isParentRequest = false) => {
    const parse = s => (!s ? [] : Array.isArray(s) ? s : s.split(',').map(x=>x.trim()).filter(Boolean))
    setResidents(p => [...p, {
      ...data,
      id: Date.now(),
      // ── FIX: Differentiate between admin direct add and parent requests
      registeredBy: user?.id ?? null,
      assignedParents: data.assignedParents || [],
      registrationDate: new Date().toISOString(),
      allergies:   parse(data.allergies),
      medications: parse(data.medications),
      bloodType:   data.bloodType || 'Unknown',
      vax:[], status:'active', approvalStatus: 'approved',
      lastUpdated: new Date().toISOString(),
      history:[],
      // ── NEW: Request approval workflow
      requestApprovalStatus: user?.role === 'Admin' ? 'direct' : 'pending',
      requestedBy: user?.role === 'Admin' ? null : user?.id,
      requestDate: new Date().toISOString(),
    }])
    const msg = user?.role === 'Admin' 
      ? 'Resident added!' 
      : 'Family member request submitted for approval!'
    notify(msg)
  }, [user, notify])

  const updateResident = useCallback((id, data) => {
    const parse = s => (!s ? [] : Array.isArray(s) ? s : s.split(',').map(x=>x.trim()).filter(Boolean))
    setResidents(p => p.map(r => r.id===id ? {
      ...r, ...data,
      allergies:   parse(data.allergies),
      medications: parse(data.medications),
      lastUpdated: new Date().toISOString(),
    } : r))
    notify('Resident updated!')
  }, [notify])

  const deleteResident = useCallback(id => {
    if (!window.confirm('Delete this resident? This cannot be undone.')) return
    setResidents(p => p.filter(r => r.id!==id))
    notify('Resident deleted','info')
  }, [notify])

  // ── NEW: Admin can assign residents to parents ───────────────────────────────
  const assignResidentToParent = useCallback((residentId, parentId) => {
    setResidents(p => p.map(r => r.id===residentId ? {
      ...r,
      assignedParents: [
        ...(r.assignedParents || []).filter(pid => pid !== parentId),
        parentId
      ]
    } : r))
    notify('Resident assigned to parent!')
  }, [notify])

  // ── NEW: Admin can remove parent assignment ────────────────────────────────
  const unassignResidentFromParent = useCallback((residentId, parentId) => {
    setResidents(p => p.map(r => r.id===residentId ? {
      ...r,
      assignedParents: (r.assignedParents || []).filter(pid => pid !== parentId)
    } : r))
    notify('Assignment removed!')
  }, [notify])

  // ── NEW: Admin approves parent's family member request ────────────────────
  const approveResidentRequest = useCallback((residentId) => {
    setResidents(p => p.map(r => r.id===residentId ? {
      ...r,
      requestApprovalStatus: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: user?.id,
    } : r))
    notify('✅ Family member approved!', 'success')
  }, [user, notify])

  // ── NEW: Admin rejects parent's family member request ────────────────────
  const rejectResidentRequest = useCallback((residentId) => {
    setResidents(p => p.map(r => r.id===residentId ? {
      ...r,
      requestApprovalStatus: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectedBy: user?.id,
    } : r))
    notify('❌ Family member rejected!', 'info')
  }, [user, notify])

  const importResidents = useCallback(imported => {
    const { valid, invalid } = validateResidentBatch(imported)
    if (invalid.length > 0) {
      const sample = invalid.slice(0, 3).map(i => `Row ${i.row}: ${i.errors[0]}`).join(' | ')
      notify(`Skipped ${invalid.length} invalid row(s): ${sample}`, 'warning')
    }
    if (valid.length === 0) {
      notify('No valid records to import. Check your data.', 'error')
      return
    }
    const tagged = valid.map(r => ({
      ...r,
      id: Date.now() + Math.random(),
      registeredBy: user?.id ?? null,
      assignedParents: r.assignedParents || [],
      registrationDate: new Date().toISOString(),
      requestApprovalStatus: user?.role === 'Admin' ? 'direct' : 'pending',
      history: [],
    }))
    setResidents(p => [...p, ...tagged])
    notify(`${valid.length} residents imported successfully!`)
  }, [user, notify])

  const updateResidentVax = useCallback((id, vax) => {
    setResidents(p => p.map(r => r.id===id ? { ...r, vax, lastUpdated: new Date().toISOString() } : r))
    notify('Vaccination record updated!')
  }, [notify])

  // ── Nutrition CRUD ─────────────────────────────────────────────────────────
  const addNutritionRecord = useCallback(record => {
    setRecords(p => [...p, {
      ...record, id: Date.now(),
      date:      new Date().toLocaleDateString('en-US', { year:'numeric', month:'2-digit', day:'2-digit' }),
      timestamp: new Date().toISOString(),
      // ── NEW: BHW records need admin approval
      approvalStatus: user?.role === 'Admin' ? 'approved' : 'pending',
      submittedBy: user?.id ?? null,
    }])
    const msg = user?.role === 'Admin' ? 'Nutrition record saved!' : 'Record submitted for approval!'
    notify(msg)
  }, [user, notify])

  const updateNutritionRecord = useCallback((id, data) => {
    setRecords(p => p.map(r => r.id===id ? { ...r, ...data, lastUpdated: new Date().toISOString() } : r))
    notify('Record updated!')
  }, [notify])

  const deleteNutritionRecord = useCallback(id => {
    if (!window.confirm('Delete this nutrition record?')) return
    setRecords(p => p.filter(r => r.id!==id))
    notify('Record deleted','info')
  }, [notify])

  // ── NEW: Admin approves/rejects BHW records ────────────────────────────────
  const approveRecord = useCallback((recordId, approved = true) => {
    setRecords(p => p.map(r => r.id===recordId ? {
      ...r,
      approvalStatus: approved ? 'approved' : 'rejected',
      approvedBy: user?.id ?? null,
      approvedAt: new Date().toISOString(),
    } : r))
    notify(approved ? 'Record approved!' : 'Record rejected!', 'info')
  }, [user, notify])

  // ── FIX: Parent/Guardian sees their own residents + admin-assigned residents ──
  // Admin and BHW see everyone; parent sees:
  // 1. Residents they registered themselves (registeredBy === user.id) AND approved
  // 2. Residents assigned to them by admin (assignedParents includes user.id)
  const visibleResidents = useMemo(() => {
    if (!user) return []
    if (user.role === 'Parent/Guardian') {
      return residents.filter(r => {
        // Show assigned residents
        if (r.assignedParents?.includes(user.id) || r.assignedParents?.includes(user.id?.toString())) {
          return true
        }
        // Show own residents only if approved or direct
        if (r.registeredBy === user.id || r.registeredBy === user.id?.toString()) {
          return r.requestApprovalStatus !== 'rejected' && r.requestApprovalStatus !== 'pending'
        }
        return false
      })
    }
    return residents
  }, [residents, user])

  const filteredResidents = useMemo(() => {
    const s = searchTerm.toLowerCase().trim()
    if (!s) return visibleResidents
    return visibleResidents.filter(r =>
      `${r.firstName} ${r.middleName||''} ${r.lastName}`.toLowerCase().includes(s) ||
      r.place?.toLowerCase().includes(s) || r.contact?.includes(s) ||
      r.bloodType?.toLowerCase().includes(s)
    )
  }, [visibleResidents, searchTerm])

  // ── FIX: Parent's nutrition records scoped to their own residents ──────────
  const visibleRecords = useMemo(() => {
    if (!user) return []
    if (user.role === 'Parent/Guardian') {
      const myIds = new Set(visibleResidents.map(r => String(r.id)))
      return records.filter(r => myIds.has(String(r.residentId)) || !r.residentId)
    }
    return records
  }, [records, visibleResidents, user])

  const tabs = useMemo(() => ALL_TABS.filter(t => !user || t.roles.includes(user.role)), [user])

  if (!user) return <Login onLogin={handleLogin} />

  const isAdmin  = user.role==='Admin'
  const isParent = user.role==='Parent/Guardian'

  if (isParent) {
    return (
      <>
        <Toast n={notification} />
        <ParentPortal
          user={user} residents={visibleResidents} records={visibleRecords}
          onLogout={handleLogout} notify={notify}
          addResident={addResident} importResidents={importResidents}
          addNutritionRecord={addNutritionRecord}
          updateNutritionRecord={updateNutritionRecord}
          deleteNutritionRecord={deleteNutritionRecord}
          updateResidentVax={updateResidentVax}
          approveRecord={approveRecord}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <Toast n={notification} />

      {/* HEADER */}
      <header className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 sticky top-0 z-50 shadow-xl">
        <div className="w-full px-3 sm:px-5">
          <div className="flex items-center h-14 gap-2">
            <button onClick={() => setSidebarOpen(p=>!p)}
              className="lg:hidden w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={sidebarOpen?'M6 18L18 6M6 6l12 12':'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>

            <div className="flex items-center gap-2 flex-shrink-0 min-w-0 w-[180px] xl:w-[210px]">
              <BHWLogo size={36} />
              <div className="hidden sm:block leading-none">
                <p className="text-white font-black text-[13px] tracking-tight whitespace-nowrap">BHW <span className="text-emerald-300">Nutrition</span> Tracker</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                  <span className="text-emerald-500 text-[8px] font-bold uppercase tracking-widest">Brgy Health System</span>
                  <span className="ml-0.5 px-1 py-0.5 bg-emerald-800/70 border border-emerald-700/50 text-emerald-300 text-[8px] font-bold rounded">v2.0</span>
                </div>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center overflow-x-auto min-w-0 px-2">
              {tabs.map(tab => {
                const pendingCount = tab.id === 'management' 
                  ? residents.filter(r => r.requestApprovalStatus === 'pending').length 
                  : 0
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide whitespace-nowrap transition-all flex-shrink-0 ${activeTab===tab.id?'bg-white/15 text-white':'text-emerald-400 hover:text-white hover:bg-white/10'}`}>
                    <span className="text-sm">{tab.icon}</span>
                    <span>{tab.short || tab.label}</span>
                    {pendingCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-full">
                        {pendingCount}
                      </span>
                    )}
                    {activeTab===tab.id && <motion.span layoutId="ul" className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-emerald-400 rounded-full"/>}
                  </button>
                )
              })}
            </nav>

            <div className="flex items-center gap-1 flex-shrink-0 ml-auto overflow-hidden">
              <div className="relative hidden md:block">
                <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); if(e.target.value && activeTab!=='residents') setActiveTab('residents') }} placeholder="Search residents…"
                  className="w-36 focus:w-48 pl-6 pr-6 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all duration-200"/>
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs">✕</button>}
              </div>

              {isAdmin && (
                <button onClick={handleBackup} disabled={isLoading} title="Backup"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-emerald-950 rounded-lg text-[11px] font-black uppercase disabled:opacity-50">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
                  <span className="hidden xl:inline">Backup</span>
                </button>
              )}
              {isAdmin && (
                <label title="Restore" className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-black uppercase cursor-pointer">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  <span className="hidden xl:inline">Restore</span>
                  <input type="file" className="hidden" accept=".json" onChange={handleRestore} disabled={isLoading}/>
                </label>
              )}

              <div className="w-px h-5 bg-white/15"/>

              <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-lg px-2 py-1.5">
                <div className="w-5 h-5 bg-emerald-400 rounded-md flex items-center justify-center text-emerald-950 font-black text-[9px] uppercase flex-shrink-0">
                  {user.username?.[0]}
                </div>
                <div className="hidden sm:block leading-none">
                  <p className="text-white text-[11px] font-bold leading-tight">{user.username}</p>
                  <p className={`text-[8px] font-bold uppercase tracking-wide ${user.role==='Admin'?'text-yellow-400':user.role==='BHW'?'text-emerald-400':'text-violet-300'}`}>
                    {user.role==='Admin'?'Administrator':user.role==='BHW'?'BHW Staff':'Parent / Guardian'}
                  </p>
                </div>
              </div>

              <button onClick={handleLogout} title="Logout"
                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-[11px] font-black uppercase">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                <span className="hidden xl:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        <div className="md:hidden px-3 pb-2.5">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search residents…"
              className="w-full pl-8 pr-8 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/35 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">✕</button>}
          </div>
        </div>
      </header>

      {/* MOBILE SIDEBAR */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}/>
            <motion.aside initial={{x:-288}} animate={{x:0}} exit={{x:-288}}
              transition={{type:'spring',stiffness:300,damping:30}}
              className="fixed left-0 top-0 bottom-0 w-72 bg-emerald-950 z-50 flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-emerald-800/60">
                <div className="flex items-center gap-2.5"><BHWLogo size={30}/>
                  <div><p className="text-white font-black text-sm">BHW Tracker</p><p className="text-emerald-500 text-[9px] font-bold uppercase tracking-widest">v2.0</p></div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-900 text-emerald-400 hover:text-white">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {tabs.map(tab => (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-left transition-all ${activeTab===tab.id?'bg-emerald-500 text-white':'text-emerald-300 hover:bg-emerald-900 hover:text-white'}`}>
                    <span className="w-5 text-center">{tab.icon}</span>{tab.label}
                    {activeTab===tab.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white"/>}
                  </button>
                ))}
              </nav>
              <div className="p-3 border-t border-emerald-800/60 space-y-2">
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-emerald-900/60 rounded-xl">
                  <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center text-emerald-950 font-black text-sm uppercase">{user.username?.[0]}</div>
                  <div><p className="text-white text-xs font-bold">{user.username}</p>
                    <p className="text-emerald-400 text-[10px] font-bold uppercase">{user.role==='Admin'?'Administrator':user.role==='BHW'?'BHW Staff':'Parent / Guardian'}</p></div>
                </div>
                <button onClick={() => { handleLogout(); setSidebarOpen(false) }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white rounded-xl text-xs font-bold uppercase transition-all">
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* CONTENT */}
      <main className="w-full max-w-screen-2xl mx-auto px-3 sm:px-5 lg:px-6 py-5 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:0.2}}>
            {activeTab==='dashboard' && <Dashboard residents={residents} records={records} inventory={inventory} user={user} onNavigate={setActiveTab}/>}
            {activeTab==='residents' && (
              <ResidentsTab
                filteredResidents={filteredResidents}
                addResident={addResident} updateResident={updateResident}
                deleteResident={deleteResident} importResidents={importResidents}
                canEdit={isAdmin || user.role==='BHW'}
                isParent={isParent} userRole={user.role} notify={notify}
                assignResidentToParent={assignResidentToParent}
                unassignResidentFromParent={unassignResidentFromParent}
                allResidents={residents}
              />
            )}
            {activeTab==='management' && (
              <ResidentApprovalPanel
                residents={residents}
                onApprove={approveResidentRequest}
                onReject={rejectResidentRequest}
                onDelete={deleteResident}
                notify={notify}
                userRole={user?.role}
                records={records}
                onApproveRecord={approveRecord}
              />
            )}
            {activeTab==='nutrition' && (
              <NutritionEntry residents={residents} records={visibleRecords}
                onSave={addNutritionRecord} onUpdate={updateNutritionRecord}
                onDelete={isParent ? undefined : deleteNutritionRecord} readOnly={false}
                userRole={user?.role} onApprove={approveRecord}/>
            )}
            {activeTab==='vaccines' && (
              <VaxTracker residents={residents} onUpdate={isParent ? undefined : updateResidentVax} readOnly={isParent}/>
            )}
            {activeTab==='inventory' && !isParent && (
              <Inventory inventory={inventory} setInventory={setInventory}/>
            )}
            {activeTab==='report' && (
              <MonthlyReport residents={residents} records={records} inventory={inventory}/>
            )}
            {activeTab==='users' && isAdmin && (
              <UserManagement notify={notify}/>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
