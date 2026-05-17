import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calcAge, calcBMI, getBMIClassification } from '../utils/bmiClassify'

const colorMap = {
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber:   'bg-amber-100 text-amber-700 border-amber-200',
  orange:  'bg-orange-100 text-orange-700 border-orange-200',
  red:     'bg-red-100 text-red-700 border-red-200',
  purple:  'bg-purple-100 text-purple-700 border-purple-200',
  slate:   'bg-slate-100 text-slate-600 border-slate-200',
}

const statusColors = {
  Normal:                'bg-emerald-100 text-emerald-700',
  Underweight:           'bg-amber-100 text-amber-700',
  'Severely Underweight':'bg-red-100 text-red-700',
  Overweight:            'bg-orange-100 text-orange-700',
  Obese:                 'bg-red-100 text-red-700',
  Stunted:               'bg-purple-100 text-purple-700',
  Wasted:                'bg-red-100 text-red-700',
}

const EMPTY = { residentId: '', childName: '', weight: '', height: '', muac: '', notes: '' }

// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX: NutField defined OUTSIDE NutritionForm.
// Previously "const F = ..." was inside NutritionForm — React treated it as a
// new component every render, causing inputs to lose focus after each keystroke.
// ─────────────────────────────────────────────────────────────────────────────
function NutField({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

const nutInputCls = (hasError) =>
  `w-full px-3 py-2.5 rounded-xl border text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all ${hasError ? 'border-red-300 bg-red-50' : 'border-slate-200'}`

function NutritionForm({ residents, onSave, editRecord, onCancelEdit }) {
  const isEditing = !!editRecord
  const today = new Date().toLocaleDateString('en-US', { year:'numeric', month:'2-digit', day:'2-digit' })
  const [form, setForm] = useState(isEditing ? {
    residentId: editRecord.residentId || '',
    childName:  editRecord.childName  || '',
    weight:     editRecord.weight     || '',
    height:     editRecord.height     || '',
    muac:       editRecord.muac       || '',
    notes:      editRecord.notes      || '',
  } : EMPTY)
  const [errors, setErrors] = useState({})
  const [saved,  setSaved]  = useState(false)

  const linkedResident = useMemo(() =>
    residents.find(r => String(r.id) === String(form.residentId)) || null,
  [residents, form.residentId])

  const bmiVal = calcBMI(form.weight, form.height)
  const classification = getBMIClassification(bmiVal, linkedResident?.birthDate, form.height)

  const set = e => {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }))
  }

  const selectResident = e => {
    const id = e.target.value
    const r  = residents.find(r => String(r.id) === String(id))
    setForm(p => ({ ...p, residentId: id, childName: r ? `${r.firstName} ${r.lastName}` : p.childName }))
  }

  const validate = () => {
    const e = {}
    if (!form.childName.trim()) e.childName = 'Required'
    if (!form.weight)           e.weight    = 'Required'
    if (!form.height)           e.height    = 'Required'
    return e
  }

  const handleSubmit = e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave({
      ...form,
      date:      today,
      bmi:       bmiVal?.toString() || '—',
      status:    classification.label,
      timestamp: new Date().toISOString(),
    })
    if (!isEditing) { setForm(EMPTY); setErrors({}) }
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const residentAge = linkedResident ? calcAge(linkedResident.birthDate) : null

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

      {/* Resident selector */}
      <NutField label="Link to Resident (optional)">
        <select name="residentId" value={form.residentId || ''} onChange={selectResident}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all">
          <option value="">— Unlinked / Manual entry —</option>
          {residents.filter(r => r.status !== 'inactive').map(r => {
            const age = calcAge(r.birthDate)
            return (
              <option key={r.id} value={r.id}>
                {r.firstName} {r.lastName}{age !== null ? ` (${age}y)` : ''}{r.purok ? ` · ${r.purok}` : r.place ? ` · ${r.place}` : ''}
              </option>
            )
          })}
        </select>
      </NutField>

      {linkedResident && (
        <div className="flex flex-wrap gap-1.5">
          {residentAge !== null && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              👤 {residentAge} yrs · {residentAge < 20 ? 'WHO BMI-for-age' : 'WHO Adult BMI'}
            </span>
          )}
          {linkedResident.purok && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              📍 {linkedResident.purok}
            </span>
          )}
          {linkedResident.place && !linkedResident.purok && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              📍 {linkedResident.place}
            </span>
          )}
          {linkedResident.gender && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {linkedResident.gender}
            </span>
          )}
        </div>
      )}

      {/* Name */}
      <NutField label="Name" required error={errors.childName}>
        <input name="childName" value={form.childName || ''} onChange={set} placeholder="Full name" className={nutInputCls(errors.childName)} />
      </NutField>

      {/* Weight & Height */}
      <div className="grid grid-cols-2 gap-3">
        <NutField label="Weight (kg)" required error={errors.weight}>
          <input type="number" name="weight" value={form.weight || ''} onChange={set} placeholder="e.g. 25.5" step="0.1" min="0" className={nutInputCls(errors.weight)} />
        </NutField>
        <NutField label="Height (cm)" required error={errors.height}>
          <input type="number" name="height" value={form.height || ''} onChange={set} placeholder="e.g. 120" step="0.1" min="0" className={nutInputCls(errors.height)} />
        </NutField>
      </div>

      {/* Live BMI */}
      {bmiVal && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className={`p-3.5 rounded-xl border ${colorMap[classification.color]}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">BMI Result</p>
              <p className="text-3xl font-black leading-none mt-0.5">{bmiVal}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold uppercase border ${colorMap[classification.color]}`}>
              {classification.label}
            </span>
          </div>
          {classification.note && (
            <p className="text-[10px] font-medium opacity-70 mt-2">{classification.note}</p>
          )}
          {(classification.label === 'Stunted' || classification.label === 'Wasted' || classification.label === 'Severely Underweight') && (
            <div className="mt-2 pt-2 border-t border-current/20">
              <p className="text-[11px] font-bold opacity-90">⚠ Refer to licensed nutritionist or health officer for clinical assessment</p>
            </div>
          )}
        </motion.div>
      )}

      {/* MUAC */}
      <NutField label="MUAC (cm) — optional">
        <input type="number" name="muac" value={form.muac || ''} onChange={set} placeholder="Mid-upper arm circumference" step="0.1" min="0" className={nutInputCls(false)} />
      </NutField>

      {/* Notes */}
      <NutField label="Notes / Observations">
        <textarea name="notes" value={form.notes || ''} onChange={set} rows={2}
          placeholder="Additional observations..."
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all resize-none" />
      </NutField>

      <div className="flex gap-2 pt-1">
        {isEditing && (
          <button type="button" onClick={onCancelEdit}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm uppercase hover:bg-slate-50 transition-all">
            Cancel
          </button>
        )}
        <motion.button type="submit" whileTap={{ scale: 0.97 }}
          className={`flex-1 py-3 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all shadow-sm ${saved ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
          {saved ? '✅ Saved!' : isEditing ? '💾 Update Record' : '+ Save Record'}
        </motion.button>
      </div>
    </form>
  )
}

export default function NutritionEntry({ residents, records, onSave, onUpdate, onDelete, onApprove, userRole }) {
  const [editRecord,    setEditRecord]   = useState(null)
  const [filterStatus, setFilterStatus] = useState('All')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const PER_PAGE = 10

  const handleSave = data => {
    if (editRecord) { onUpdate(editRecord.id, data); setEditRecord(null) }
    else onSave(data)
  }

  const recentRecords = useMemo(() => {
    let list = [...records].sort((a,b) => new Date(b.timestamp||b.id) - new Date(a.timestamp||a.id))
    if (filterStatus !== 'All') list = list.filter(r => r.status === filterStatus)
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(r =>
        r.childName?.toLowerCase().includes(s) ||
        r.notes?.toLowerCase().includes(s) ||
        r.status?.toLowerCase().includes(s) ||
        r.approvalStatus?.toLowerCase().includes(s)
      )
    }
    return list
  }, [records, filterStatus, search])

  const totalPages = Math.ceil(recentRecords.length / PER_PAGE)
  const paged = recentRecords.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const counts = useMemo(() => {
    const c = {}
    records.forEach(r => { c[r.status] = (c[r.status] || 0) + 1 })
    return c
  }, [records])

  const FILTER_STATUSES = ['All','Normal','Underweight','Overweight','Obese','Stunted','Wasted']

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
      {/* Left: Form */}
      <div className="xl:col-span-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden xl:sticky xl:top-20">
          <div className={`px-5 py-4 ${editRecord ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
            <h2 className="text-white font-extrabold text-base">
              {editRecord ? '✏️ Edit Record' : '🥗 Nutrition Entry'}
            </h2>
            <p className="text-emerald-100 text-xs mt-0.5">
              {editRecord ? `Editing: ${editRecord.childName}` : 'WHO/DOH BMI-for-age auto-classification'}
            </p>
          </div>
          <NutritionForm
            key={editRecord?.id || 'new'}
            residents={residents}
            onSave={handleSave}
            editRecord={editRecord}
            onCancelEdit={() => setEditRecord(null)}
          />
        </div>
      </div>

      {/* Right: Records */}
      <div className="xl:col-span-8 space-y-4">
        {records.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:'Normal',           val: counts['Normal']||0,                                                bg:'from-emerald-50 to-teal-50 border-emerald-200',   tx:'text-emerald-700' },
              { label:'Underweight',      val: (counts['Underweight']||0)+(counts['Severely Underweight']||0),    bg:'from-amber-50 to-yellow-50 border-amber-200',     tx:'text-amber-700' },
              { label:'Overweight/Obese', val: (counts['Overweight']||0)+(counts['Obese']||0),                    bg:'from-red-50 to-rose-50 border-red-200',           tx:'text-red-700' },
              { label:'Stunted/Wasted',   val: (counts['Stunted']||0)+(counts['Wasted']||0),                      bg:'from-purple-50 to-violet-50 border-purple-200',   tx:'text-purple-700' },
            ].map(({ label, val, bg, tx }) => (
              <div key={label} className={`bg-gradient-to-br ${bg} border rounded-xl p-3 text-center`}>
                <p className={`text-2xl font-black ${tx}`}>{val}</p>
                <p className={`text-[10px] font-bold uppercase mt-0.5 ${tx}`}>{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="font-extrabold text-slate-800 text-base">Nutrition Logs</h2>
                <p className="text-xs text-slate-400 mt-0.5">{recentRecords.length} of {records.length} records</p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {FILTER_STATUSES.map(s => (
                  <button key={s} onClick={() => { setFilterStatus(s); setPage(1) }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap ${filterStatus === s
                      ? s==='All'?'bg-slate-700 text-white' : s==='Normal'?'bg-emerald-600 text-white' : s==='Underweight'?'bg-amber-500 text-white' : s==='Stunted'?'bg-purple-600 text-white' : 'bg-red-500 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search by name, status, notes..."
                className="w-full pl-8 pr-8 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all" />
              {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 text-xs">✕</button>}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_68px_68px_68px_120px_100px_100px] items-center px-4 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wide">
            <span>Name / Location</span>
            <span className="text-center">Wt kg</span>
            <span className="text-center">Ht cm</span>
            <span className="text-center">BMI</span>
            <span className="text-center">Status</span>
            <span className="text-center">Approval</span>
            <span className="text-center">Actions</span>
          </div>

          {paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <span className="text-5xl mb-3">🥗</span>
              <p className="font-semibold">{records.length === 0 ? 'No nutrition records yet' : 'No matches found'}</p>
              <p className="text-xs mt-1">Use the form on the left to add records</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              <AnimatePresence>
                {paged.map((rec, i) => {
                  const sc = statusColors[rec.status] || 'bg-slate-100 text-slate-600'
                  const isEdit = editRecord?.id === rec.id
                  const res = residents.find(r => String(r.id) === String(rec.residentId))
                  const location = res?.purok || res?.place || ''
                  const isAdmin = userRole === 'Admin'
                  const approvalStatus = rec.approvalStatus || 'approved'
                  const approvalColor = approvalStatus === 'approved' ? 'bg-emerald-50 text-emerald-700' : 
                                       approvalStatus === 'pending' ? 'bg-amber-50 text-amber-700' : 
                                       'bg-red-50 text-red-700'
                  return (
                    <motion.div key={rec.id}
                      initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                      exit={{ opacity:0, x:8 }} transition={{ delay: i*0.02 }}
                      className={`grid grid-cols-[1fr_68px_68px_68px_120px_100px_100px] items-center px-4 py-3 hover:bg-slate-50 transition-colors ${isEdit ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : ''}`}>
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-bold text-slate-800 truncate">{rec.childName || '—'}</p>
                        <p className="text-[10px] text-slate-400 truncate">{rec.date}{location ? ` · ${location}` : ''}</p>
                      </div>
                      <p className="text-sm font-bold text-slate-700 text-center">{rec.weight || '—'}</p>
                      <p className="text-sm font-bold text-slate-700 text-center">{rec.height || '—'}</p>
                      <p className="text-sm font-bold text-slate-700 text-center">{rec.bmi || '—'}</p>
                      <div className="flex justify-center px-1">
                        <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full uppercase text-center leading-tight ${sc}`}>
                          {rec.status || '—'}
                        </span>
                      </div>
                      <div className="flex justify-center">
                        <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full uppercase ${approvalColor}`}>
                          {approvalStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        {isAdmin && approvalStatus === 'pending' && onApprove && (
                          <>
                            <button onClick={() => onApprove(rec.id, true)} title="Approve"
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors text-xs">✓</button>
                            <button onClick={() => onApprove(rec.id, false)} title="Reject"
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors text-xs">✗</button>
                          </>
                        )}
                        <button onClick={() => setEditRecord(rec)} title="Edit"
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {onDelete && (
                          <button onClick={() => onDelete(rec.id)} title="Delete"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">Page {page} of {totalPages} · {recentRecords.length} records</p>
              <div className="flex gap-1.5">
                <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all">← Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
