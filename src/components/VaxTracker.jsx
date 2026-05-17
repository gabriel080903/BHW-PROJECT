import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const VACCINES = [
  'BCG', 'Hepatitis B', 'DPT', 'OPV/IPV', 'Measles', 'MMR',
  'Varicella', 'Rotavirus', 'PCV', 'Influenza', 'COVID-19', 'Tetanus',
  'Typhoid', 'Rabies', 'Meningococcal', 'HPV',
]

function VaxModal({ resident, onClose, onUpdate }) {
  const current = resident?.vax || []
  const [vaxList, setVaxList] = useState(current.map(v => typeof v === 'string' ? { name: v, date: '' } : v))
  const [newVax, setNewVax] = useState({ name: '', date: '' })
  const [custom, setCustom] = useState(false)

  const addVax = () => {
    if (!newVax.name) return
    setVaxList(p => [...p, { ...newVax }])
    setNewVax({ name: '', date: '' })
    setCustom(false)
  }

  const removeVax = i => setVaxList(p => p.filter((_, idx) => idx !== i))

  const save = () => {
    onUpdate(resident.id, vaxList)
    onClose()
  }

  if (!resident) return null
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}>

          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 rounded-t-3xl flex items-center justify-between">
            <div>
              <h3 className="text-white font-extrabold text-base">💉 Vaccination Record</h3>
              <p className="text-violet-200 text-xs mt-0.5">{resident.firstName} {resident.lastName}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white">✕</button>
          </div>

          <div className="p-5 space-y-4">
            {/* Existing vaccines */}
            {vaxList.length === 0 ? (
              <div className="py-6 text-center text-slate-400">
                <div className="text-4xl mb-2">💉</div>
                <p className="text-sm">No vaccines recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {vaxList.map((v, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 text-base">✅</span>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{v.name}</p>
                        {v.date && <p className="text-[10px] text-slate-400 font-mono">{v.date}</p>}
                      </div>
                    </div>
                    <button onClick={() => removeVax(i)} className="text-red-400 hover:text-red-600 text-xs transition-colors">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Add vaccine */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Add Vaccine</p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  {custom ? (
                    <input value={newVax.name} onChange={e => setNewVax(p => ({ ...p, name: e.target.value }))}
                      placeholder="Custom vaccine name..."
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  ) : (
                    <select value={newVax.name} onChange={e => setNewVax(p => ({ ...p, name: e.target.value }))}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-400">
                      <option value="">Select vaccine...</option>
                      {VACCINES.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  )}
                  <button type="button" onClick={() => setCustom(p => !p)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors">
                    {custom ? 'List' : 'Custom'}
                  </button>
                </div>
                <input type="date" value={newVax.date} onChange={e => setNewVax(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                <button onClick={addVax} disabled={!newVax.name}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all">
                  + Add Vaccine
                </button>
              </div>
            </div>

            <button onClick={save}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl transition-all shadow-sm">
              💾 Save Record
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function VaxTracker({ residents, onUpdate }) {
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = residents.filter(r =>
    `${r.firstName} ${r.lastName}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <VaxModal resident={editing} onClose={() => setEditing(null)} onUpdate={onUpdate} />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-extrabold text-slate-700 text-base">Vaccination Tracker</h2>
            <p className="text-xs text-slate-400 mt-0.5">Click a resident to manage their vaccines</p>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search residents..."
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-full sm:w-52" />
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">💉</div>
            <p className="text-slate-400 font-medium">No residents found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
            {filtered.map((r, i) => {
              const count = r.vax?.length || 0
              const pct = Math.min(100, count * 6)
              return (
                <motion.button key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }} onClick={() => setEditing(r)}
                  className="text-left p-4 rounded-2xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/50 transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-violet-100 text-violet-700 rounded-xl flex items-center justify-center font-extrabold text-sm flex-shrink-0 group-hover:bg-violet-200 transition-colors">
                      {r.firstName?.[0]}{r.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-700 text-sm truncate">{r.firstName} {r.lastName}</p>
                      <p className="text-[10px] text-slate-400">{count} vaccine{count !== 1 ? 's' : ''} recorded</p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 text-right">Tap to edit →</p>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
