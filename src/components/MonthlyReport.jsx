import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

function StatBadge({ icon, label, value, color }) {
  const c = { emerald: 'from-emerald-500 to-teal-500', blue: 'from-blue-500 to-indigo-500', amber: 'from-amber-400 to-orange-500', red: 'from-red-500 to-rose-500', violet: 'from-violet-500 to-purple-500' }
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c[color] || c.emerald} flex items-center justify-center mb-3 text-base`}>{icon}</div>
      <p className="text-2xl font-extrabold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
    </div>
  )
}

export default function MonthlyReport({ residents, records, inventory }) {
  const [exporting, setExporting] = useState(false)

  const report = useMemo(() => {
    const now = new Date()
    const m = now.getMonth(), y = now.getFullYear()

    const newResidents = residents.filter(r => {
      try { const d = new Date(r.registrationDate || r.id); return d.getMonth() === m && d.getFullYear() === y } catch { return false }
    })

    const monthlyLogs = records.filter(r => {
      try { const d = new Date(r.timestamp || r.date); return d.getMonth() === m && d.getFullYear() === y } catch { return false }
    })

    const normal      = monthlyLogs.filter(l => l.status === 'Normal').length
    const underweight = monthlyLogs.filter(l => l.status === 'Underweight').length
    const overweight  = monthlyLogs.filter(l => l.status === 'Overweight').length
    const vaccinated  = residents.filter(r => r.vax && r.vax.length > 0).length
    const withConditions = residents.filter(r =>
      r.medicalHistory && r.medicalHistory.trim() && !r.medicalHistory.toLowerCase().match(/^(none|n\/a|no known)/)
    ).length
    const lowStock    = inventory.filter(i => parseInt(i.quantity) < 10).length
    const vacRate     = residents.length > 0 ? ((vaccinated / residents.length) * 100).toFixed(1) : 0

    return {
      date: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      generatedAt: now.toLocaleString(),
      total: residents.length,
      active: residents.filter(r => r.status === 'active').length,
      newResidents,
      monthlyLogs,
      normal, underweight, overweight,
      totalLogs: monthlyLogs.length,
      vaccinated, vacRate, withConditions, lowStock,
    }
  }, [residents, records, inventory])

  const downloadCSV = () => {
    setExporting(true)
    try {
      let csv = 'Category,Name,Status,BMI,Date,Medical History,Blood Type\n'
      report.newResidents.forEach(r => {
        csv += `New Resident,${r.firstName || ''} ${r.lastName || ''},,,${r.registrationDate?.split('T')[0] || ''},${(r.medicalHistory || 'None').replace(/,/g, ';')},${r.bloodType || 'Unknown'}\n`
      })
      report.monthlyLogs.forEach(log => {
        csv += `Nutrition Log,${(log.childName || '').replace(/,/g, ' ')},${log.status || ''},${log.bmi || ''},${log.date || ''},,\n`
      })
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `BHW_Report_${report.date.replaceAll(' ', '_')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const noBars = report.totalLogs === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-700 to-teal-700 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">Monthly Health Report</p>
          <h2 className="text-white font-extrabold text-2xl">{report.date}</h2>
          <p className="text-emerald-200 text-xs mt-1">Generated {report.generatedAt}</p>
        </div>
        <div className="flex gap-2 no-print">
          <button onClick={downloadCSV} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50">
            {exporting ? '⏳' : '📥'} Export CSV
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all">
            🖨️ Print
          </button>
        </div>
      </motion.div>

      {/* Summary grid */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatBadge icon="👥" label="Total Residents" value={report.total} color="emerald" />
        <StatBadge icon="🆕" label="New This Month" value={report.newResidents.length} color="blue" />
        <StatBadge icon="🥗" label="Nutrition Logs" value={report.totalLogs} color="amber" />
        <StatBadge icon="✅" label="Normal BMI" value={report.normal} color="emerald" />
        <StatBadge icon="💉" label="Vaccinated" value={report.vaccinated} color="violet" />
        <StatBadge icon="🩺" label="With Conditions" value={report.withConditions} color="red" />
      </motion.div>

      {/* Detail panels */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Nutrition distribution */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider mb-4">Nutrition Distribution</h3>
          {noBars ? (
            <p className="text-slate-400 text-sm text-center py-6">No nutrition logs this month</p>
          ) : (
            <div className="space-y-4">
              {[
                { label: 'Normal BMI', val: report.normal, color: 'bg-emerald-500', text: 'text-emerald-700' },
                { label: 'Underweight', val: report.underweight, color: 'bg-red-400', text: 'text-red-600' },
                { label: 'Overweight', val: report.overweight, color: 'bg-orange-400', text: 'text-orange-600' },
              ].map(({ label, val, color, text }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-semibold text-slate-600">{label}</span>
                    <span className={`text-sm font-extrabold ${text}`}>{val} <span className="text-slate-400 font-normal text-xs">({report.totalLogs > 0 ? ((val/report.totalLogs)*100).toFixed(1) : 0}%)</span></span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${report.totalLogs > 0 ? (val/report.totalLogs)*100 : 0}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }} className={`h-full ${color} rounded-full`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* System metrics */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider mb-4">System Overview</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm font-semibold text-slate-600">Vaccination Coverage</span>
                <span className="text-sm font-extrabold text-violet-600">{report.vacRate}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${report.vacRate}%` }}
                  transition={{ duration: 0.8, delay: 0.4 }} className="h-full bg-violet-500 rounded-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Residents</p>
                <p className="text-xl font-extrabold text-slate-700 mt-0.5">{report.active}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Low Stock Items</p>
                <p className={`text-xl font-extrabold mt-0.5 ${report.lowStock > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{report.lowStock}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* New residents list */}
      {report.newResidents.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider mb-4">
            🆕 New Residents This Month ({report.newResidents.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.newResidents.map((r, i) => (
              <div key={r.id || i} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="w-9 h-9 bg-emerald-200 text-emerald-700 rounded-xl flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                  {r.firstName?.[0]}{r.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-700 text-sm truncate">{r.firstName} {r.lastName}</p>
                  <p className="text-[10px] text-slate-400">#{String(r.id).slice(-6)}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent nutrition logs */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider">
            🥗 Nutrition Logs This Month ({report.monthlyLogs.length})
          </h3>
        </div>
        {report.monthlyLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <div className="text-4xl mb-2">🥗</div>
            <p className="text-sm">No nutrition logs recorded this month</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {[...report.monthlyLogs].reverse().slice(0, 10).map((log, i) => {
              const style = { Normal: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '✅' }, Underweight: { bg: 'bg-red-100', text: 'text-red-600', icon: '⚠️' }, Overweight: { bg: 'bg-orange-100', text: 'text-orange-600', icon: '📊' } }[log.status] || { bg: 'bg-slate-100', text: 'text-slate-600', icon: '❓' }
              return (
                <div key={log.id || i} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${style.bg} rounded-xl flex items-center justify-center text-sm`}>{style.icon}</div>
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">{log.childName || 'Unknown'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{log.date} · BMI {log.bmi ?? '—'}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
                    {log.status || '—'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-300 pb-2">
        BHW Nutrition Tracker v2.0 · Barangay Health System · Auto-generated report
      </div>
    </div>
  )
}
