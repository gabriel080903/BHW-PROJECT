import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts'
import { motion } from 'framer-motion'
import { getBMIClassification, ALERT_STATUSES } from '../utils/bmiClassify'

const COLORS = ['#10b981','#f59e0b','#ef4444','#6366f1','#06b6d4','#8b5cf6']
const fade = (d = 0) => ({ initial:{ opacity:0, y:16 }, animate:{ opacity:1, y:0 }, transition:{ duration:0.3, delay:d } })

// ─── Shared UI ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = 'emerald', delay = 0 }) {
  const grads = {
    emerald: 'from-emerald-500 to-teal-600',
    amber:   'from-amber-400 to-orange-500',
    red:     'from-red-500 to-rose-600',
    blue:    'from-blue-500 to-indigo-600',
    purple:  'from-purple-500 to-violet-600',
    teal:    'from-teal-400 to-cyan-500',
    pink:    'from-pink-500 to-rose-500',
  }
  return (
    <motion.div {...fade(delay)}
      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grads[color] || grads.emerald} flex items-center justify-center text-xl shadow-sm flex-shrink-0`}>
          {icon}
        </div>
        {sub != null && (
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{sub}</span>
        )}
      </div>
      <p className="text-[2rem] font-black text-slate-800 leading-none">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-slate-500 font-medium mt-1.5">{label}</p>
    </motion.div>
  )
}

function SectionCard({ title, icon, children, delay = 0, className = '' }) {
  return (
    <motion.div {...fade(delay)} className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        {icon && <span className="text-base">{icon}</span>}
        <h3 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  )
}

function ProgressBar({ label, value, max, color = 'bg-emerald-500' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-slate-600">{label}</span>
        <span className="text-sm font-bold text-slate-700">
          {value} <span className="text-slate-400 font-normal text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
    </div>
  )
}

function EmptyChart({ label }) {
  return (
    <div className="h-[180px] flex flex-col items-center justify-center text-slate-300 gap-2">
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm">{label}</p>
    </div>
  )
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard({ residents, records, inventory }) {
  const s = useMemo(() => {
    const total      = residents.length
    const active     = residents.filter(r => r.status === 'active').length
    const inactive   = residents.filter(r => r.status !== 'active').length
    const vaccinated = residents.filter(r => r.vax?.length > 0).length
    const withCond   = residents.filter(r => r.medicalHistory?.trim() && !/^(none|n\/a|no known)/i.test(r.medicalHistory)).length
    const male       = residents.filter(r => r.gender === 'Male').length
    const female     = residents.filter(r => r.gender === 'Female').length
    const other      = residents.filter(r => r.gender !== 'Male' && r.gender !== 'Female' && r.gender).length
    const vacRate    = total > 0 ? Math.round((vaccinated / total) * 100) : 0

    const normal      = records.filter(r => r.status === 'Normal').length
    const underweight = records.filter(r => r.status === 'Underweight' || r.status === 'Severely Underweight').length
    const overweight  = records.filter(r => r.status === 'Overweight' || r.status === 'Obese').length
    const stunted     = records.filter(r => r.status === 'Stunted').length
    const wasted      = records.filter(r => r.status === 'Wasted').length
    const totalRecs   = records.length

    const lowStock   = inventory.filter(i => parseInt(i.quantity || 0) < 10).length
    const totalItems = inventory.length

    // Monthly registrations 6mo
    const monthly = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const m = d.getMonth(), y = d.getFullYear()
      const cnt = residents.filter(r => {
        try { const rd = new Date(r.registrationDate || r.id); return rd.getMonth() === m && rd.getFullYear() === y } catch { return false }
      }).length
      monthly.push({ month: d.toLocaleDateString('en-US', { month: 'short' }), residents: cnt })
    }

    // Blood type
    const bt = {}
    residents.forEach(r => { const b = r.bloodType || 'Unknown'; bt[b] = (bt[b] || 0) + 1 })
    const bloodData = Object.entries(bt).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8)

    // Place breakdown top 5
    const places = {}
    residents.forEach(r => { const p = r.place?.trim() || 'Unknown'; places[p] = (places[p] || 0) + 1 })
    const placeData = Object.entries(places).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5)

    // Purok / Zone breakdown for admin
    const puroksAdmin = {}
    residents.forEach(r => { const p = r.purok?.trim() || 'Unassigned'; puroksAdmin[p] = (puroksAdmin[p] || 0) + 1 })
    const purokData = Object.entries(puroksAdmin).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

    const sevUnderweight = records.filter(r => r.status === 'Severely Underweight').length
    const wasting = records.filter(r => r.status === 'Severe Wasting (SAM)' || r.status === 'Moderate Wasting').length
    const nutritionPie = [
      { name: 'Normal', value: normal },
      { name: 'Underweight', value: underweight },
      { name: 'Overweight/Obese', value: overweight },
      { name: 'Stunted', value: stunted },
      { name: 'Wasted', value: wasted },
    ].filter(d => d.value > 0)

    const recentRes = [...residents]
      .sort((a, b) => new Date(b.registrationDate || 0) - new Date(a.registrationDate || 0))
      .slice(0, 5)

    // ── NEW: Pending approvals
    const pendingApprovals = records.filter(r => r.approvalStatus === 'pending').length

    return { total, active, inactive, vaccinated, withCond, male, female, other, vacRate, normal, underweight, overweight, stunted, wasted, totalRecs, lowStock, totalItems, monthly, bloodData, placeData, purokData, nutritionPie, recentRes, pendingApprovals }
  }, [residents, records, inventory])

  return (
    <div className="space-y-6">
      {/* Banner */}
      <motion.div {...fade(0)} className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 bg-white/30 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">👑</div>
        <div className="flex-1">
          <p className="font-black text-amber-950 text-base">Admin Dashboard</p>
          <p className="text-amber-800 text-xs mt-0.5">Full system access — all modules, all data</p>
        </div>
        <div className="hidden sm:grid grid-cols-3 gap-3 text-center">
          {[{ v: s.total, l: 'Residents' }, { v: s.totalRecs, l: 'Records' }, { v: s.totalItems, l: 'Inventory' }].map(({ v, l }) => (
            <div key={l} className="bg-white/30 rounded-xl px-4 py-2">
              <p className="text-xl font-black text-amber-900">{v}</p>
              <p className="text-[10px] font-bold text-amber-800 uppercase">{l}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Pending Approvals Alert */}
      {s.pendingApprovals > 0 && (
        <motion.div {...fade(0.02)} className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">⏳</div>
          <div className="flex-1">
            <p className="font-black text-amber-950 text-base">Pending Approvals</p>
            <p className="text-amber-700 text-xs mt-0.5">{s.pendingApprovals} BHW record{s.pendingApprovals !== 1 ? 's' : ''} waiting for your review</p>
          </div>
          <button onClick={() => onNavigate('nutrition')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm whitespace-nowrap transition-all">
            Review →
          </button>
        </motion.div>
      )}

      {/* Stat rows */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="👥" label="Total Residents" value={s.total} color="emerald" delay={0.05} />
        <StatCard icon="✅" label="Active Residents" value={s.active} color="blue" delay={0.08} sub={`${s.total > 0 ? Math.round(s.active/s.total*100) : 0}%`} />
        <StatCard icon="💉" label="Vaccinated" value={s.vaccinated} color="purple" delay={0.11} sub={`${s.vacRate}%`} />
        <StatCard icon="📦" label="Low Stock Items" value={s.lowStock} color={s.lowStock > 0 ? 'red' : 'teal'} delay={0.14} sub={`of ${s.totalItems}`} />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="📋" label="Total Records" value={s.totalRecs} color="teal" delay={0.17} />
        <StatCard icon="🥗" label="Normal BMI" value={s.normal} color="emerald" delay={0.2} />
        <StatCard icon="⚠️" label="Underweight" value={s.underweight} color="amber" delay={0.23} />
        <StatCard icon="⏳" label="Pending Approvals" value={s.pendingApprovals} color={s.pendingApprovals > 0 ? "amber" : "teal"} delay={0.26} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Monthly Registrations" icon="📈" delay={0.3}>
          {s.total > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={s.monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="adm-reg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.1)', fontSize: 12 }} />
                <Area type="monotone" dataKey="residents" stroke="#10b981" strokeWidth={2.5} fill="url(#adm-reg)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart label="No residents yet" />}
        </SectionCard>

        <SectionCard title="Nutrition Status" icon="🥗" delay={0.33}>
          {s.nutritionPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={s.nutritionPie} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                  {s.nutritionPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 12, color: '#64748b' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart label="No nutrition records yet" />}
        </SectionCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Gender Breakdown" icon="👤" delay={0.36}>
          <div className="space-y-4 pt-1">
            <ProgressBar label="Male" value={s.male} max={s.total} color="bg-blue-500" />
            <ProgressBar label="Female" value={s.female} max={s.total} color="bg-pink-500" />
            <ProgressBar label="Other" value={s.other} max={s.total} color="bg-purple-400" />
          </div>
        </SectionCard>

        <SectionCard title="Blood Type Distribution" icon="🩸" delay={0.39}>
          {s.bloodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={s.bloodData} barSize={22} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {s.bloodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart label="No blood type data" />}
        </SectionCard>
      </div>

      {/* Vaccination + Top places */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Vaccination Coverage" icon="💉" delay={0.42}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-3xl font-black text-emerald-600">{s.vacRate}%</p>
            <p className="text-sm text-slate-500">{s.vaccinated} of {s.total} residents</p>
          </div>
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${s.vacRate}%` }} transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Active', val: s.active, c: 'text-blue-600' },
              { label: 'Inactive', val: s.inactive, c: 'text-slate-400' },
              { label: 'With Conditions', val: s.withCond, c: 'text-purple-600' },
            ].map(({ label, val, c }) => (
              <div key={label} className="bg-slate-50 rounded-xl py-2.5">
                <p className={`text-xl font-black ${c}`}>{val}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Top Barangays" icon="📍" delay={0.45}>
          {s.placeData.length > 0 ? (
            <div className="space-y-3 pt-1">
              {s.placeData.map((p, i) => (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{p.name}</span>
                  <span className="text-sm font-bold text-slate-500">{p.value}</span>
                  <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${s.total > 0 ? (p.value / s.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyChart label="No barangay data" />}
        </SectionCard>
      </div>

      {/* Recent registrations */}
      <SectionCard title="Recent Registrations" icon="🆕" delay={0.48}>
        {s.recentRes.length > 0 ? (
          <div className="divide-y divide-slate-50 -mx-5 -mb-5">
            {s.recentRes.map((r, i) => (
              <motion.div key={r.id} {...fade(0.5 + i * 0.04)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-black text-[11px] flex-shrink-0">
                  {(r.firstName?.[0] || '?').toUpperCase()}{(r.lastName?.[0] || '').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{r.firstName} {r.lastName}</p>
                  <p className="text-xs text-slate-400 truncate">{r.place || '—'}{r.purok ? ` · ${r.purok}` : ''} · {r.gender || '—'}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {r.status || 'active'}
                </span>
                <p className="text-xs text-slate-400 hidden sm:block whitespace-nowrap">
                  {r.registrationDate ? new Date(r.registrationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400 text-sm">No residents registered yet</div>
        )}
      </SectionCard>

      {/* Purok / Zone Breakdown */}
      <SectionCard title="Residents per Purok / Zone" icon="🏘️" delay={0.52}>
        {s.purokData.filter(p => p.name !== 'Unassigned').length > 0 ? (
          <div className="space-y-0 -mx-5 -mb-5">
            <div className="grid grid-cols-[1fr_60px_140px_80px] gap-2 px-5 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wide">
              <span>Purok / Zone</span><span className="text-center">Count</span><span>Distribution</span><span className="text-right">Share</span>
            </div>
            {s.purokData.map((p, i) => {
              const pct = s.total > 0 ? Math.round((p.value / s.total) * 100) : 0
              return (
                <motion.div key={p.name} {...fade(0.54 + i * 0.03)}
                  className="grid grid-cols-[1fr_60px_140px_80px] gap-2 items-center px-5 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}>{i + 1}</span>
                    <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                  </div>
                  <p className="text-center font-black text-slate-800">{p.value}</p>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: 0.3 + i * 0.05 }}
                      className="h-full rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                  <p className="text-right text-xs font-bold text-slate-500">{pct}%</p>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="py-10 text-center">
            <span className="text-4xl block mb-2">📍</span>
            <p className="font-bold text-slate-600 text-sm">No Purok / Zone data yet</p>
            <p className="text-xs text-slate-400 mt-1">Add Purok/Zone when registering residents to see this breakdown</p>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ─── BHW STAFF DASHBOARD ──────────────────────────────────────────────────────
function StaffDashboard({ residents, records }) {
  const [activeSection, setActiveSection] = useState('overview')

  const s = useMemo(() => {
    const total      = residents.length
    const active     = residents.filter(r => r.status === 'active').length
    const inactive   = total - active
    const vaccinated = residents.filter(r => r.vax?.length > 0).length
    const unvax      = total - vaccinated
    const vacRate    = total > 0 ? Math.round((vaccinated / total) * 100) : 0

    const male   = residents.filter(r => r.gender === 'Male').length
    const female = residents.filter(r => r.gender === 'Female').length
    const other  = residents.filter(r => r.gender !== 'Male' && r.gender !== 'Female' && r.gender).length

    // Ages
    const ages = residents.map(r => {
      if (!r.birthDate) return null
      return Math.floor((Date.now() - new Date(r.birthDate)) / (1000*60*60*24*365.25))
    }).filter(a => a !== null && a >= 0)
    const children  = ages.filter(a => a < 5).length
    const schoolAge = ages.filter(a => a >= 5 && a < 18).length
    const adults    = ages.filter(a => a >= 18 && a < 60).length
    const seniors   = ages.filter(a => a >= 60).length
    const ageGroups = [
      { name: '0–4 yrs', value: children,  fill: '#06b6d4' },
      { name: '5–17 yrs', value: schoolAge, fill: '#6366f1' },
      { name: '18–59 yrs', value: adults,   fill: '#10b981' },
      { name: '60+ yrs', value: seniors,   fill: '#f59e0b' },
    ].filter(d => d.value > 0)

    const normal         = records.filter(r => r.status === 'Normal').length
    const underweight    = records.filter(r => r.status === 'Underweight' || r.status === 'Severely Underweight').length
    const sevUnderweight = records.filter(r => r.status === 'Severely Underweight').length
    const overweight     = records.filter(r => r.status === 'Overweight').length
    const obese          = records.filter(r => r.status === 'Obese').length
    const stunted        = records.filter(r => r.status === 'Stunted').length
    const wasted         = records.filter(r => r.status === 'Wasted').length
    const wasting        = stunted + wasted
    const totalRecs      = records.length

    // Today & this month
    const todayKey = new Date().toLocaleDateString('en-US', { year:'numeric', month:'2-digit', day:'2-digit' })
    const todayLogs = records.filter(r => r.date === todayKey).length
    const now = new Date(), cm = now.getMonth(), cy = now.getFullYear()
    const newThisMonth = residents.filter(r => {
      try { const d = new Date(r.registrationDate || r.id); return d.getMonth() === cm && d.getFullYear() === cy } catch { return false }
    }).length

    // Monthly trend 6mo
    const monthly = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const m = d.getMonth(), y = d.getFullYear()
      const reg = residents.filter(r => { try { const rd = new Date(r.registrationDate||r.id); return rd.getMonth()===m&&rd.getFullYear()===y } catch { return false } }).length
      const rec = records.filter(r => { try { const rd = new Date(r.timestamp||r.id); return rd.getMonth()===m&&rd.getFullYear()===y } catch { return false } }).length
      monthly.push({ month: d.toLocaleDateString('en-US',{month:'short'}), residents: reg, records: rec })
    }

    // Weekly logs 7 days
    const weekly = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('en-US',{year:'numeric',month:'2-digit',day:'2-digit'})
      weekly.push({ day: d.toLocaleDateString('en-US',{weekday:'short'}), logs: records.filter(r => r.date===key).length })
    }

    // Purok / Zone breakdown
    const puroks = {}
    residents.forEach(r => {
      const p = r.purok?.trim() || r.zone?.trim() || 'Unassigned'
      puroks[p] = (puroks[p] || 0) + 1
    })
    const purokData = Object.entries(puroks)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // Purok with underweight
    const purokUnderweight = {}
    records.filter(r => ALERT_STATUSES.has(r.status)).forEach(rec => {
      const res = residents.find(r => String(r.id) === String(rec.residentId))
      const p = res?.purok?.trim() || res?.zone?.trim() || 'Unassigned'
      purokUnderweight[p] = (purokUnderweight[p] || 0) + 1
    })

    // Underweight alerts with purok info
    // ALERT_STATUSES imported from bmiClassify utility
    const uwAlerts = [...new Set(records.filter(r => ALERT_STATUSES.has(r.status)).map(r=>r.residentId))]
      .slice(0, 8)
      .map(id => {
        const res = residents.find(r => String(r.id) === String(id))
        const recs = records.filter(r => String(r.residentId)===String(id))
          .sort((a,b) => new Date(b.timestamp||b.id) - new Date(a.timestamp||a.id))
        const latest = recs[0]
        return res ? {
          name: `${res.firstName} ${res.lastName}`,
          purok: res.purok || res.zone || '—',
          age: res.birthDate ? Math.floor((Date.now()-new Date(res.birthDate))/(1000*60*60*24*365.25)) : '?',
          bmi: latest?.bmi,
          date: latest?.date,
        } : null
      })
      .filter(Boolean)

    // Medical conditions
    const conditions = {}
    residents.forEach(r => {
      if (r.medicalHistory?.trim() && !/^(none|n\/a|no known|—)/i.test(r.medicalHistory)) {
        const cond = r.medicalHistory.trim().toLowerCase()
        conditions[cond] = (conditions[cond] || 0) + 1
      }
    })
    const topConditions = Object.entries(conditions)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase()+name.slice(1), value }))
      .sort((a,b)=>b.value-a.value).slice(0,5)

    const nutritionPie = [
      { name:'Normal',      value:normal },
      { name:'Underweight', value:underweight },
      { name:'Overweight',  value:overweight },
      { name:'Obese',       value:obese },
      { name:'Stunted',     value:stunted },
      { name:'Wasted',      value:wasted },
    ].filter(d => d.value > 0)

    // Recent logs
    const recentLogs = [...records]
      .sort((a,b) => new Date(b.timestamp||b.id)-new Date(a.timestamp||a.id))
      .slice(0, 10)

    // Unvaccinated residents list
    const unvaxList = residents.filter(r => !r.vax?.length).slice(0,6)

    return {
      total, active, inactive, vaccinated, unvax, vacRate, male, female, other,
      ageGroups, children, schoolAge, adults, seniors,
      normal, underweight, sevUnderweight, overweight, obese, stunted, wasted, totalRecs,
      todayLogs, newThisMonth, monthly, weekly,
      purokData, purokUnderweight,
      uwAlerts, topConditions, nutritionPie, recentLogs, unvaxList,
    }
  }, [residents, records])

  const sections = [
    { id: 'overview',   icon: '📊', label: 'Overview' },
    { id: 'nutrition',  icon: '🥗', label: 'Nutrition' },
    { id: 'purok',      icon: '📍', label: 'Purok / Zone' },
    { id: 'population', icon: '👥', label: 'Population' },
    { id: 'alerts',     icon: '⚠️', label: 'Alerts' },
  ]

  const statusBadge = {
    Normal:'bg-emerald-100 text-emerald-700',
    Underweight:'bg-amber-100 text-amber-700',
    Overweight:'bg-orange-100 text-orange-700',
    Obese:'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-5">
      {/* Banner */}
      <motion.div {...fade(0)}
        className="relative overflow-hidden bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 rounded-2xl p-5 shadow-lg">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 border border-white/30">🏥</div>
          <div className="flex-1">
            <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-0.5">BHW Staff Dashboard</p>
            <p className="font-black text-white text-xl leading-tight">Health Worker Overview</p>
            <p className="text-emerald-200 text-xs mt-1">{new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
          </div>
          <div className="hidden sm:grid grid-cols-4 gap-2 flex-shrink-0">
            {[
              { v: s.total,      l: 'Residents',    icon: '👥' },
              { v: s.todayLogs,  l: "Today's Logs", icon: '📋' },
              { v: s.newThisMonth, l: 'New/Month',  icon: '🆕' },
              { v: s.underweight+s.overweight+s.obese+s.stunted+s.wasted, l: 'BMI Alerts', icon: '⚠️' },
            ].map(({ v, l, icon }) => (
              <div key={l} className="bg-white/15 border border-white/20 rounded-xl px-3 py-2 text-center">
                <p className="text-lg">{icon}</p>
                <p className="text-lg font-black text-white leading-none">{v}</p>
                <p className="text-[9px] font-bold text-emerald-200 uppercase mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Section tabs */}
      <div className="flex gap-1.5 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 overflow-x-auto">
        {sections.map(sec => (
          <button key={sec.id} onClick={() => setActiveSection(sec.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all flex-shrink-0 ${
              activeSection === sec.id
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}>
            <span>{sec.icon}</span><span>{sec.label}</span>
            {sec.id === 'alerts' && (s.uwAlerts.length > 0) && (
              <span className="w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">{s.uwAlerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeSection === 'overview' && (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon="👥" label="Total Residents" value={s.total}     color="emerald" delay={0.05} />
            <StatCard icon="✅" label="Active"          value={s.active}    color="blue"    delay={0.08} sub={`${s.total>0?Math.round(s.active/s.total*100):0}%`}/>
            <StatCard icon="💉" label="Vaccinated"      value={s.vaccinated} color="purple" delay={0.11} sub={`${s.vacRate}%`}/>
            <StatCard icon="📋" label="Total Records"   value={s.totalRecs} color="teal"    delay={0.14} />
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon="🥗" label="Normal BMI"    value={s.normal}      color="emerald" delay={0.17}/>
            <StatCard icon="⚠️" label="Underweight"   value={s.underweight} color="amber"   delay={0.2}/>
            <StatCard icon="📊" label="Overweight"    value={s.overweight}  color="red"     delay={0.23}/>
            <StatCard icon="🔴" label="Obese"         value={s.obese}       color="red"     delay={0.26}/>
          </div>

          {/* Monthly trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SectionCard title="Monthly Registrations & Records" icon="📈" delay={0.3}>
              {s.total > 0 ? (
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={s.monthly} margin={{top:4,right:4,left:-20,bottom:0}}>
                    <defs>
                      <linearGradient id="bhw-r" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="bhw-n" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="month" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip contentStyle={{borderRadius:12,border:'none',fontSize:12}}/>
                    <Legend iconType="circle" iconSize={8} formatter={v=><span style={{fontSize:11,color:'#64748b'}}>{v}</span>}/>
                    <Area type="monotone" dataKey="residents" name="Registrations" stroke="#10b981" strokeWidth={2} fill="url(#bhw-r)"/>
                    <Area type="monotone" dataKey="records"   name="Nutrition Logs" stroke="#6366f1" strokeWidth={2} fill="url(#bhw-n)"/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyChart label="No data yet"/>}
            </SectionCard>

            <SectionCard title="7-Day Activity" icon="📅" delay={0.33}>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={s.weekly} barSize={26} margin={{top:4,right:4,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="day" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip contentStyle={{borderRadius:12,border:'none',fontSize:12}}/>
                  <Bar dataKey="logs" name="Logs" fill="#10b981" radius={[6,6,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          {/* Vaccination + recent logs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SectionCard title="Vaccination Coverage" icon="💉" delay={0.36}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-4xl font-black text-emerald-600">{s.vacRate}%</p>
                <p className="text-sm text-slate-400">{s.vaccinated} / {s.total}</p>
              </div>
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden mb-4">
                <motion.div initial={{width:0}} animate={{width:`${s.vacRate}%`}} transition={{duration:1,delay:0.4}}
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {label:'Vaccinated',   val:s.vaccinated, c:'text-emerald-700', bg:'bg-emerald-50'},
                  {label:'No Record',    val:s.unvax,      c:'text-amber-700',   bg:'bg-amber-50'},
                  {label:'Active',       val:s.active,     c:'text-blue-700',    bg:'bg-blue-50'},
                  {label:'Inactive',     val:s.inactive,   c:'text-slate-500',   bg:'bg-slate-50'},
                ].map(({label,val,c,bg})=>(
                  <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                    <p className={`text-xl font-black ${c}`}>{val}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Recent Nutrition Logs" icon="📝" delay={0.39}>
              {s.recentLogs.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">No logs yet</div>
              ) : (
                <div className="divide-y divide-slate-50 -mx-5 -mb-5">
                  {s.recentLogs.slice(0,6).map((rec,i) => (
                    <div key={rec.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-black text-[10px] flex-shrink-0">
                        {rec.childName?.[0]?.toUpperCase()||'?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{rec.childName||'Unknown'}</p>
                        <p className="text-[10px] text-slate-400">{rec.date} · BMI {rec.bmi}</p>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${statusBadge[rec.status]||'bg-slate-100 text-slate-600'}`}>
                        {rec.status||'—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── NUTRITION ── */}
      {activeSection === 'nutrition' && (
        <div className="space-y-5">
          {/* BMI status cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              {label:'Normal BMI',  val:s.normal,      icon:'✅', bg:'from-emerald-50 to-teal-50 border-emerald-200', tx:'text-emerald-700'},
              {label:'Underweight', val:s.underweight,  icon:'⚠️', bg:'from-amber-50 to-yellow-50 border-amber-200',  tx:'text-amber-700'},
              {label:'Overweight',  val:s.overweight,  icon:'📊', bg:'from-orange-50 to-amber-50 border-orange-200', tx:'text-orange-700'},
              {label:'Obese',       val:s.obese,       icon:'🔴', bg:'from-red-50 to-rose-50 border-red-200',        tx:'text-red-700'},
              {label:'Stunted',     val:s.stunted,     icon:'📏', bg:'from-purple-50 to-violet-50 border-purple-200', tx:'text-purple-700'},
              {label:'Wasted',      val:s.wasted,      icon:'⚡', bg:'from-red-50 to-pink-50 border-red-200',         tx:'text-red-700'},
            ].map(({label,val,icon,bg,tx},i)=>(
              <motion.div key={label} {...fade(0.05+i*0.04)} className={`bg-gradient-to-br ${bg} border rounded-2xl p-5 text-center`}>
                <span className="text-2xl">{icon}</span>
                <p className={`text-4xl font-black ${tx} mt-1`}>{val}</p>
                <p className={`text-[10px] font-bold uppercase mt-1.5 ${tx}`}>{label}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{s.totalRecs>0?Math.round(val/s.totalRecs*100):0}% of records</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Nutrition pie */}
            <SectionCard title="BMI Distribution" icon="🥗" delay={0.2}>
              {s.nutritionPie.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={s.nutritionPie} cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={3} dataKey="value">
                      {s.nutritionPie.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius:12,border:'none',fontSize:12}}/>
                    <Legend iconType="circle" iconSize={8} formatter={v=><span style={{fontSize:12,color:'#64748b'}}>{v}</span>}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart label="No nutrition records yet"/>}
            </SectionCard>

            {/* Monthly nutrition trend */}
            <SectionCard title="6-Month Nutrition Logs" icon="📈" delay={0.23}>
              {s.totalRecs > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={s.monthly} margin={{top:4,right:4,left:-20,bottom:0}}>
                    <defs>
                      <linearGradient id="nutr-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="month" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip contentStyle={{borderRadius:12,border:'none',fontSize:12}}/>
                    <Area type="monotone" dataKey="records" name="Logs" stroke="#10b981" strokeWidth={2.5} fill="url(#nutr-grad)"/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyChart label="No records yet"/>}
            </SectionCard>
          </div>

          {/* Medical conditions */}
          <SectionCard title="Common Medical Conditions" icon="🩺" delay={0.26}>
            {s.topConditions.length > 0 ? (
              <div className="space-y-3 pt-1">
                {s.topConditions.map((c,i)=>(
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black flex items-center justify-center flex-shrink-0">{i+1}</span>
                    <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{c.name}</span>
                    <span className="text-sm font-bold text-slate-500 flex-shrink-0">{c.value}</span>
                    <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div initial={{width:0}} animate={{width:`${s.total>0?(c.value/s.total)*100:0}%`}} transition={{duration:0.8,delay:0.3+i*0.05}}
                        className="h-full bg-purple-400 rounded-full"/>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">No medical conditions recorded</div>
            )}
          </SectionCard>

          {/* All recent logs */}
          <SectionCard title="All Recent Nutrition Logs" icon="📋" delay={0.29}>
            {s.recentLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">No logs yet</div>
            ) : (
              <div className="overflow-x-auto -mx-5 -mb-5">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Name','Purok/Zone','Date','Weight','Height','BMI','Status'].map(h=>(
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {s.recentLogs.map((rec,i)=>{
                      const res = residents.find(r => String(r.id)===String(rec.residentId))
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{rec.childName||'—'}</td>
                          <td className="px-4 py-2.5 text-slate-500">{res?.purok||res?.zone||'—'}</td>
                          <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{rec.date}</td>
                          <td className="px-4 py-2.5 text-slate-600">{rec.weight} kg</td>
                          <td className="px-4 py-2.5 text-slate-600">{rec.height} cm</td>
                          <td className="px-4 py-2.5 font-bold text-slate-800">{rec.bmi}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusBadge[rec.status]||'bg-slate-100 text-slate-600'}`}>{rec.status||'—'}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── PUROK / ZONE ── */}
      {activeSection === 'purok' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Purok bar chart */}
            <SectionCard title="Residents per Purok / Zone" icon="📍" delay={0.05}>
              {s.purokData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(200, s.purokData.length * 38)}>
                  <BarChart data={s.purokData} layout="vertical" barSize={20} margin={{top:4,right:40,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:'#475569'}} axisLine={false} tickLine={false} width={100}/>
                    <Tooltip contentStyle={{borderRadius:12,border:'none',fontSize:12}}/>
                    <Bar dataKey="value" name="Residents" radius={[0,6,6,0]}>
                      {s.purokData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart label="No purok/zone data — add purok field to residents"/>}
            </SectionCard>

            {/* Purok pie */}
            <SectionCard title="Purok Distribution" icon="🗺️" delay={0.1}>
              {s.purokData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={s.purokData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value">
                      {s.purokData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius:12,border:'none',fontSize:12}}/>
                    <Legend iconType="circle" iconSize={8} formatter={v=><span style={{fontSize:11,color:'#64748b'}}>{v}</span>}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart label="No purok data yet"/>}
            </SectionCard>
          </div>

          {/* Purok detail table */}
          <SectionCard title="Purok / Zone Breakdown" icon="📋" delay={0.15}>
            {s.purokData.length > 0 ? (
              <div className="overflow-x-auto -mx-5 -mb-5">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Purok / Zone','Residents','% of Total','Underweight Cases','Action'].map(h=>(
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {s.purokData.map((p,i)=>{
                      const pct = s.total > 0 ? Math.round((p.value/s.total)*100) : 0
                      const uw  = s.purokUnderweight[p.name] || 0
                      return (
                        <tr key={p.name} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                                style={{backgroundColor: COLORS[i%COLORS.length]}}>{i+1}</span>
                              <span className="font-bold text-slate-800">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-black text-slate-800 text-sm">{p.value}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:COLORS[i%COLORS.length]}}/>
                              </div>
                              <span className="text-slate-600 font-medium">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {uw > 0
                              ? <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">{uw} alert{uw>1?'s':''}</span>
                              : <span className="text-[10px] font-medium text-emerald-600">✓ None</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] text-slate-400">📍 {p.name}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <span className="text-4xl block mb-3">📍</span>
                <p className="font-bold text-slate-600">No Purok / Zone Data Yet</p>
                <p className="text-sm text-slate-400 mt-1">Add the Purok/Zone field when registering residents to see this breakdown.</p>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── POPULATION ── */}
      {activeSection === 'population' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              {label:'Children (0–4)',   val:s.children,   icon:'👶', color:'teal'},
              {label:'School Age (5–17)',val:s.schoolAge,  icon:'🧒', color:'blue'},
              {label:'Adults (18–59)',   val:s.adults,     icon:'🧑', color:'emerald'},
              {label:'Senior (60+)',     val:s.seniors,    icon:'👴', color:'amber'},
            ].map(({label,val,icon,color},i)=>(
              <StatCard key={label} icon={icon} label={label} value={val} color={color} delay={0.05+i*0.04}/>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Age group pie */}
            <SectionCard title="Age Group Distribution" icon="👤" delay={0.2}>
              {s.ageGroups.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={s.ageGroups} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {s.ageGroups.map((d,i)=><Cell key={i} fill={d.fill}/>)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius:12,border:'none',fontSize:12}}/>
                    <Legend iconType="circle" iconSize={8} formatter={v=><span style={{fontSize:11,color:'#64748b'}}>{v}</span>}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart label="No age data"/>}
            </SectionCard>

            {/* Gender breakdown */}
            <SectionCard title="Gender Breakdown" icon="⚥" delay={0.23}>
              <div className="space-y-4 pt-2">
                <ProgressBar label="Male"   value={s.male}   max={s.total} color="bg-blue-500"/>
                <ProgressBar label="Female" value={s.female} max={s.total} color="bg-pink-500"/>
                <ProgressBar label="Other"  value={s.other}  max={s.total} color="bg-purple-400"/>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-5">
                {[
                  {label:'Male',   val:s.male,   c:'text-blue-700',   bg:'bg-blue-50'},
                  {label:'Female', val:s.female, c:'text-pink-700',   bg:'bg-pink-50'},
                  {label:'Other',  val:s.other,  c:'text-purple-700', bg:'bg-purple-50'},
                ].map(({label,val,c,bg})=>(
                  <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                    <p className={`text-2xl font-black ${c}`}>{val}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Unvaccinated list */}
          <SectionCard title="Residents Without Vaccination Record" icon="💉" delay={0.26}>
            {s.unvaxList.length === 0 ? (
              <div className="py-8 text-center">
                <span className="text-4xl block mb-2">🎉</span>
                <p className="font-bold text-emerald-700">All residents have vaccination records!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {s.unvaxList.map((r,i)=>{
                  const age = r.birthDate ? Math.floor((Date.now()-new Date(r.birthDate))/(1000*60*60*24*365.25)) : '?'
                  const avatarGrad = r.gender==='Female'?'from-pink-400 to-rose-500':'from-blue-400 to-indigo-500'
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white font-black text-[10px] flex-shrink-0`}>
                        {(r.firstName?.[0]||'?').toUpperCase()}{(r.lastName?.[0]||'').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{r.firstName} {r.lastName}</p>
                        <p className="text-xs text-slate-400">{r.purok||r.zone||r.place||'—'} · {age} yrs · {r.gender||'—'}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full flex-shrink-0">No Vax</span>
                    </div>
                  )
                })}
                {s.unvax > s.unvaxList.length && (
                  <p className="text-xs text-slate-400 text-center mt-1">+{s.unvax - s.unvaxList.length} more without vaccination records</p>
                )}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── ALERTS ── */}
      {activeSection === 'alerts' && (
        <div className="space-y-5">
          {/* Summary alert cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              {label:'Underweight',    val:s.underweight, icon:'⚠️', color:'amber'},
              {label:'Overweight',     val:s.overweight,  icon:'📊', color:'red'},
              {label:'Obese',          val:s.obese,       icon:'🔴', color:'red'},
              {label:'No Vaccination', val:s.unvax,       icon:'💉', color:'purple'},
            ].map(({label,val,icon,color},i)=>(
              <StatCard key={label} icon={icon} label={label} value={val} color={color} delay={0.04*i}/>
            ))}
          </div>

          {/* Underweight detailed list */}
          <SectionCard title="Underweight Resident Alerts" icon="⚠️" delay={0.2}>
            {s.uwAlerts.length === 0 ? (
              <div className="py-10 text-center">
                <span className="text-4xl block mb-2">✅</span>
                <p className="font-bold text-emerald-700 text-sm">No underweight alerts!</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 -mb-5">
                <table className="w-full text-xs">
                  <thead className="bg-amber-50 border-b border-amber-100">
                    <tr>
                      {['Resident','Purok/Zone','Age','Latest BMI','Last Check','Status'].map(h=>(
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-amber-700 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    {s.uwAlerts.map((a,i)=>(
                      <tr key={i} className="hover:bg-amber-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{a.name}</td>
                        <td className="px-4 py-3 text-slate-500">{a.purok}</td>
                        <td className="px-4 py-3 text-slate-600">{a.age} yrs</td>
                        <td className="px-4 py-3 font-black text-amber-700">{a.bmi||'—'}</td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{a.date||'—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 uppercase">Underweight</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Overweight + Obese */}
          {(s.overweight > 0 || s.obese > 0) && (
            <SectionCard title="Overweight / Obese Residents" icon="📊" delay={0.25}>
              <div className="overflow-x-auto -mx-5 -mb-5">
                <table className="w-full text-xs">
                  <thead className="bg-red-50 border-b border-red-100">
                    <tr>
                      {['Resident','Purok/Zone','BMI','Status','Last Check'].map(h=>(
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-red-700 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-50">
                    {records.filter(r=>r.status==='Overweight'||r.status==='Obese')
                      .sort((a,b)=>new Date(b.timestamp||b.id)-new Date(a.timestamp||a.id))
                      .slice(0,8)
                      .map((rec,i)=>{
                        const res = residents.find(r=>String(r.id)===String(rec.residentId))
                        return (
                          <tr key={i} className="hover:bg-red-50/40 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-800">{rec.childName||'—'}</td>
                            <td className="px-4 py-3 text-slate-500">{res?.purok||res?.zone||'—'}</td>
                            <td className="px-4 py-3 font-black text-red-700">{rec.bmi||'—'}</td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${statusBadge[rec.status]||'bg-slate-100 text-slate-600'}`}>{rec.status}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-400">{rec.date||'—'}</td>
                          </tr>
                        )
                      })
                    }
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  )
}

// ─── USER DASHBOARD ───────────────────────────────────────────────────────────
// ─── PARENT DASHBOARD ─────────────────────────────────────────────────────────
function calcAge(birthDate) {
  if (!birthDate) return null
  try {
    const diff = Date.now() - new Date(birthDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  } catch { return null }
}

function bmiVal(weight, height) {
  const w = parseFloat(weight), h = parseFloat(height)
  if (!w || !h || h <= 0) return null
  return parseFloat((w / ((h / 100) ** 2)).toFixed(1))
}
function bmiLabel(b) {
  if (b === null) return { label: '—', color: 'slate' }
  if (b < 18.5) return { label: 'Underweight', color: 'amber' }
  if (b < 25)   return { label: 'Normal',      color: 'emerald' }
  if (b < 30)   return { label: 'Overweight',  color: 'orange' }
  return               { label: 'Obese',        color: 'red' }
}

const BMI_BADGE = {
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber:   'bg-amber-100 text-amber-700 border-amber-200',
  orange:  'bg-orange-100 text-orange-700 border-orange-200',
  red:     'bg-red-100 text-red-700 border-red-200',
  slate:   'bg-slate-100 text-slate-500 border-slate-200',
}

function FamilyMemberCard({ member, records, onNavigate }) {
  const age = calcAge(member.birthDate)
  const myRecords = records.filter(r => String(r.residentId) === String(member.id))
  const latestRec = myRecords.sort((a, b) => new Date(b.timestamp || b.id) - new Date(a.timestamp || a.id))[0]
  const bmi = latestRec ? parseFloat(latestRec.bmi) : null
  const { label: bmiLbl, color: bmiColor } = bmiLabel(bmi)
  const vaccinated = member.vax?.length > 0
  const vaxCount = member.vax?.length || 0

  const relation = member.relation || (member.gender === 'Male' ? 'Member' : 'Member')
  const avatarGrad = member.gender === 'Female'
    ? 'from-pink-400 to-rose-500'
    : member.gender === 'Male'
    ? 'from-blue-400 to-indigo-500'
    : 'from-purple-400 to-violet-500'

  return (
    <motion.div {...fade(0.1)}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
      {/* Card top strip */}
      <div className={`h-1.5 bg-gradient-to-r ${avatarGrad}`} />
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white font-black text-base flex-shrink-0 shadow-sm`}>
            {(member.firstName?.[0] || '?').toUpperCase()}{(member.lastName?.[0] || '').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-slate-800 text-sm truncate">{member.firstName} {member.lastName}</p>
            <p className="text-xs text-slate-400 mt-0.5">{relation} · {age != null ? `${age} yrs` : '—'} · {member.gender || '—'}</p>
            {member.place && <p className="text-[10px] text-slate-400 truncate mt-0.5">📍 {member.place}</p>}
          </div>
        </div>

        {/* Health snapshot */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-slate-50 rounded-xl p-2 text-center">
            <p className="text-xs font-black text-slate-700">{bmi ?? '—'}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">BMI</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2 text-center">
            <p className="text-xs font-black text-slate-700">{latestRec?.weight ?? '—'}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">kg</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2 text-center">
            <p className="text-xs font-black text-slate-700">{vaxCount}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Vax</p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          {bmi !== null && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${BMI_BADGE[bmiColor]}`}>
              {bmiLbl}
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${vaccinated ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
            {vaccinated ? '✓ Vaccinated' : '⚠ No Vax Record'}
          </span>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => onNavigate?.('nutrition')}
            className="flex items-center justify-center gap-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold transition-colors border border-emerald-200">
            🥗 Nutrition
          </button>
          <button onClick={() => onNavigate?.('vaccines')}
            className="flex items-center justify-center gap-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition-colors border border-blue-200">
            💉 Vaccines
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function ParentDashboard({ residents, records, user, onNavigate }) {
  const [activeSection, setActiveSection] = useState('overview')

  // Derive family members — for demo, show all residents this parent can see
  // In production you'd filter by family linkage; here we show all as community
  const myFamily = useMemo(() => residents.slice(0, 6), [residents])

  const s = useMemo(() => {
    const total      = residents.length
    const vaccinated = residents.filter(r => r.vax?.length > 0).length
    const normal      = records.filter(r => r.status === 'Normal').length
    const underweight = records.filter(r => r.status === 'Underweight' || r.status === 'Severely Underweight').length
    const overweight  = records.filter(r => r.status === 'Overweight' || r.status === 'Obese').length
    const stunted     = records.filter(r => r.status === 'Stunted').length
    const wasted      = records.filter(r => r.status === 'Wasted').length

    // My family's nutrition records
    const familyIds = new Set(myFamily.map(m => String(m.id)))
    const familyRecords = records.filter(r => familyIds.has(String(r.residentId)))
    const latestFamilyRecs = myFamily.map(m => {
      const recs = records.filter(r => String(r.residentId) === String(m.id))
      return recs.sort((a, b) => new Date(b.timestamp || b.id) - new Date(a.timestamp || a.id))[0]
    }).filter(Boolean)

    const familyVaxed = myFamily.filter(m => m.vax?.length > 0).length
    const familyNormal = latestFamilyRecs.filter(r => r.status === 'Normal').length
    const familyAlert = latestFamilyRecs.filter(r => ['Underweight','Severely Underweight','Obese','Overweight','Stunted','Wasted'].includes(r.status)).length

    // Upcoming or recent vax
    const allVax = myFamily.flatMap(m =>
      (m.vax || []).map(v => ({ ...v, memberName: `${m.firstName} ${m.lastName}` }))
    ).slice(0, 5)

    // Nutrition trend for family
    const sevUnderweight = records.filter(r => r.status === 'Severely Underweight').length
    const wasting = records.filter(r => r.status === 'Severe Wasting (SAM)' || r.status === 'Moderate Wasting').length
    const nutritionPie = [
      { name: 'Normal', value: normal },
      { name: 'Underweight', value: underweight },
      { name: 'Severely Underweight', value: sevUnderweight },
      { name: 'Overweight/Obese', value: overweight },
      { name: 'Wasting (MUAC)', value: wasting },
    ].filter(d => d.value > 0)

    return { total, vaccinated, normal, underweight, overweight, familyVaxed, familyNormal, familyAlert, allVax, nutritionPie, familyRecords, latestFamilyRecs }
  }, [residents, records, myFamily])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const sections = [
    { id: 'overview', label: 'Overview',  icon: '🏠' },
    { id: 'family',   label: 'My Family', icon: '👨‍👩‍👧‍👦' },
  ]

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <motion.div {...fade(0)}
        className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-5 shadow-lg">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 border border-white/30">
            👨‍👩‍👧‍👦
          </div>
          <div className="flex-1">
            <p className="text-violet-200 text-xs font-bold uppercase tracking-widest mb-0.5">Parent / Guardian</p>
            <p className="font-black text-white text-xl leading-tight">Welcome, {user?.username || 'Parent/Guardian'}!</p>
            <p className="text-violet-200 text-xs mt-1">{today}</p>
          </div>
          <div className="hidden sm:flex gap-2 flex-shrink-0">
            {[
              { v: residents.length, l: 'Residents', icon: '👥' },
              { v: s.familyVaxed,    l: 'Vaccinated', icon: '💉' },
              { v: s.familyAlert,    l: 'Alerts',      icon: '⚠️' },
            ].map(({ v, l, icon }) => (
              <div key={l} className="bg-white/15 border border-white/20 rounded-xl px-3 py-2 text-center min-w-[64px]">
                <p className="text-lg">{icon}</p>
                <p className="text-lg font-black text-white leading-none">{v}</p>
                <p className="text-[9px] font-bold text-violet-200 uppercase mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Section tabs — Overview and My Family only */}
      <div className="flex gap-1.5 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 overflow-x-auto">
        {sections.map(sec => (
          <button key={sec.id} onClick={() => setActiveSection(sec.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all flex-shrink-0 ${
              activeSection === sec.id
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}>
            <span>{sec.icon}</span><span>{sec.label}</span>
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeSection === 'overview' && (
        <div className="space-y-5">
          {/* Health summary cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { icon: '👥', label: 'Total Residents', val: residents.length, color: 'violet', sub: null },
              { icon: '💉', label: 'Vaccinated', val: s.vaccinated, color: 'blue', sub: `${residents.length > 0 ? Math.round(s.vaccinated/residents.length*100) : 0}%` },
              { icon: '✅', label: 'Normal BMI', val: s.normal, color: 'emerald', sub: null },
              { icon: '⚠️', label: 'Needs Attention', val: s.underweight + s.overweight, color: s.underweight + s.overweight > 0 ? 'red' : 'teal', sub: null },
            ].map(({ icon, label, val, color, sub }, i) => (
              <StatCard key={label} icon={icon} label={label} value={val} color={color} delay={0.05 + i * 0.04} sub={sub} />
            ))}
          </div>

          {/* Quick actions — all navigate to real top-level tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '➕', label: 'Add Resident',  sub: 'Register family member',  color: 'from-emerald-500 to-teal-600',   tab: 'residents' },
              { icon: '🥗', label: 'Log Nutrition', sub: 'Record weight & BMI',     color: 'from-violet-500 to-purple-600',  tab: 'nutrition' },
              { icon: '💉', label: 'Vaccines',      sub: 'Track immunizations',      color: 'from-blue-500 to-indigo-600',    tab: 'vaccines'  },
              { icon: '📋', label: 'Reports',       sub: 'View health summary',      color: 'from-amber-500 to-orange-500',   tab: 'report'    },
            ].map(({ icon, label, sub, color, tab }, i) => (
              <motion.button key={label} {...fade(0.2 + i * 0.04)}
                onClick={() => onNavigate?.(tab)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:border-violet-200 transition-all text-left group">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform shadow-sm`}>
                  {icon}
                </div>
                <p className="font-extrabold text-slate-800 text-xs">{label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
              </motion.button>
            ))}
          </div>

          {/* Nutrition status donut + Health alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SectionCard title="Community Nutrition Status" icon="🥗" delay={0.3}>
              {s.nutritionPie.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={s.nutritionPie} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} dataKey="value">
                      {s.nutritionPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 12, color: '#64748b' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart label="No nutrition records yet" />}
            </SectionCard>

            <SectionCard title="Health Alerts" icon="🔔" delay={0.33}>
              <div className="space-y-2">
                {s.underweight > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <span className="text-xl">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-amber-800">{s.underweight} Underweight Record{s.underweight > 1 ? 's' : ''}</p>
                      <p className="text-xs text-amber-600">Consult your BHW for nutrition advice</p>
                    </div>
                    <button onClick={() => onNavigate?.('nutrition')}
                      className="text-[10px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-lg transition-colors flex-shrink-0">
                      View →
                    </button>
                  </div>
                )}
                {s.overweight > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <span className="text-xl">📊</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-800">{s.overweight} Overweight/Obese Record{s.overweight > 1 ? 's' : ''}</p>
                      <p className="text-xs text-red-600">Regular monitoring recommended</p>
                    </div>
                    <button onClick={() => onNavigate?.('nutrition')}
                      className="text-[10px] font-bold text-red-700 bg-red-100 hover:bg-red-200 px-2 py-1 rounded-lg transition-colors flex-shrink-0">
                      View →
                    </button>
                  </div>
                )}
                {s.vaccinated < residents.length && residents.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <span className="text-xl">💉</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-blue-800">{residents.length - s.vaccinated} Without Vaccination Record</p>
                      <p className="text-xs text-blue-600">Check immunization schedules</p>
                    </div>
                    <button onClick={() => onNavigate?.('vaccines')}
                      className="text-[10px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded-lg transition-colors flex-shrink-0">
                      View →
                    </button>
                  </div>
                )}
                {s.underweight === 0 && s.overweight === 0 && s.vaccinated >= residents.length && residents.length > 0 && (
                  <div className="py-8 text-center">
                    <span className="text-4xl block mb-2">🎉</span>
                    <p className="font-bold text-emerald-700">All clear! No health alerts</p>
                    <p className="text-xs text-slate-400 mt-1">Keep up the good health habits</p>
                  </div>
                )}
                {residents.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    <span className="text-3xl block mb-2">👥</span>
                    No residents registered yet
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── MY FAMILY ── */}
      {activeSection === 'family' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-slate-800 text-base">Registered Residents</h2>
              <p className="text-xs text-slate-400 mt-0.5">{residents.length} member{residents.length !== 1 ? 's' : ''} in the system</p>
            </div>
            <button onClick={() => onNavigate?.('residents')}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold uppercase transition-colors shadow-sm">
              ➕ Add Member
            </button>
          </div>

          {residents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
              <span className="text-5xl block mb-3">👨‍👩‍👧‍👦</span>
              <p className="font-bold text-slate-600">No residents registered yet</p>
              <p className="text-sm text-slate-400 mt-1">Add your family members to get started</p>
              <button onClick={() => onNavigate?.('residents')}
                className="mt-4 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-bold transition-colors">
                ➕ Register Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {residents.map(member => (
                <FamilyMemberCard key={member.id} member={member} records={records} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── EXPORT ────────────────────────────────────────────────────────────────────
export default function Dashboard({ residents, records, inventory, user, onNavigate }) {
  const role = user?.role || 'Parent/Guardian'
  if (role === 'Admin') return <AdminDashboard residents={residents} records={records} inventory={inventory} />
  if (role === 'BHW')   return <StaffDashboard residents={residents} records={records} />
  return <ParentDashboard residents={residents} records={records} user={user} onNavigate={onNavigate} />
}
