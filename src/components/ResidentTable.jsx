import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ROW_H = 56
const BUFFER = 5

function calcAge(birthDate) {
  if (!birthDate) return '—'
  try {
    const d = new Date(birthDate)
    if (isNaN(d)) return '—'
    const diff = Date.now() - d.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  } catch { return '—' }
}

function VirtualTable({ rows, onEdit, onDelete, canEdit, onAssignParent }) {
  const containerRef = useRef(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [height, setHeight]       = useState(500)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeight(el.clientHeight || 500))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const totalH   = rows.length * ROW_H
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - BUFFER)
  const endIdx   = Math.min(rows.length, Math.ceil((scrollTop + height) / ROW_H) + BUFFER)
  const visible  = rows.slice(startIdx, endIdx)

  return (
    <div ref={containerRef} className="overflow-y-auto flex-1 min-h-0"
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
      style={{ height: Math.min(totalH + 56, 520) }}>
      <div style={{ height: totalH, position:'relative' }}>
        <div style={{ position:'absolute', top: startIdx * ROW_H, width:'100%' }}>
          {visible.map((r, i) => {
            const age = calcAge(r.birthDate)
            return (
              <div key={r.id} className={`flex items-center px-4 gap-2 border-b border-slate-50 hover:bg-emerald-50/60 transition-colors ${(startIdx+i)%2===0?'bg-white':'bg-slate-50/40'}`}
                style={{ height: ROW_H }}>
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0">
                  {(r.firstName?.[0]||'?').toUpperCase()}{(r.lastName?.[0]||'').toUpperCase()}
                </div>
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{r.firstName} {r.lastName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{r.place||'—'}{r.purok ? ` · Purok ${r.purok}` : ''}</p>
                </div>
                {/* Age */}
                <div className="w-10 text-center flex-shrink-0 hidden sm:block">
                  <p className="text-sm font-bold text-slate-600">{age}</p>
                  <p className="text-[9px] text-slate-400 uppercase">Age</p>
                </div>
                {/* Gender */}
                <div className="w-14 flex-shrink-0 hidden md:block">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.gender==='Male'?'bg-blue-100 text-blue-700':r.gender==='Female'?'bg-pink-100 text-pink-700':'bg-purple-100 text-purple-700'}`}>
                    {r.gender||'—'}
                  </span>
                </div>
                {/* Blood */}
                <div className="w-12 text-center flex-shrink-0 hidden lg:block">
                  <span className="text-[10px] font-bold bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{r.bloodType||'?'}</span>
                </div>
                {/* Status */}
                <div className="w-16 flex-shrink-0 hidden lg:block">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status==='active'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>
                    {r.status||'active'}
                  </span>
                </div>
                {/* Actions */}
                {canEdit && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {onAssignParent && (
                      <button onClick={() => onAssignParent(r)} title="Assign Parent"
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors text-xs">👨‍👩‍👧</button>
                    )}
                    <button onClick={() => onEdit(r)} title="Edit"
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors text-xs">✏️</button>
                    <button onClick={() => onDelete(r.id)} title="Delete"
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors text-xs">🗑️</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function ResidentTable({ residents, onDelete, onUpdate, canEdit, onEdit: onEditExternal, onAssignParent }) {
  const [search, setSearch]   = useState('')
  const [sortCol, setSortCol] = useState('lastName')
  const [sortAsc, setSortAsc] = useState(true)
  const [filterGender, setFilterGender]   = useState('All')
  const [filterStatus, setFilterStatus]   = useState('All')
  const [filterBlood,  setFilterBlood]    = useState('All')

  // Edit modal state — only used if no external onEdit handler
  const [editingResident, setEditingResident] = useState(null)
  const handleEdit = onEditExternal || setEditingResident

  const bloodTypes = useMemo(() => {
    const s = new Set(residents.map(r=>r.bloodType||'Unknown').filter(Boolean))
    return ['All',...Array.from(s).sort()]
  }, [residents])

  const filtered = useMemo(() => {
    let list = [...residents]
    const s = search.toLowerCase().trim()
    if (s) list = list.filter(r =>
      `${r.firstName} ${r.middleName||''} ${r.lastName}`.toLowerCase().includes(s) ||
      r.place?.toLowerCase().includes(s) || r.contact?.includes(s) ||
      r.bloodType?.toLowerCase().includes(s)
    )
    if (filterGender !== 'All') list = list.filter(r => r.gender === filterGender)
    if (filterStatus !== 'All') list = list.filter(r => (r.status||'active') === filterStatus)
    if (filterBlood  !== 'All') list = list.filter(r => (r.bloodType||'Unknown') === filterBlood)
    list.sort((a,b) => {
      let av = '', bv = ''
      if (sortCol==='lastName')          { av=a.lastName||''; bv=b.lastName||'' }
      else if (sortCol==='age')          { av=calcAge(a.birthDate)||999; bv=calcAge(b.birthDate)||999 }
      else if (sortCol==='place')        { av=a.place||''; bv=b.place||'' }
      else if (sortCol==='registeredAt') { av=a.registrationDate||''; bv=b.registrationDate||'' }
      const cmp = typeof av==='number' ? av-bv : String(av).localeCompare(String(bv))
      return sortAsc ? cmp : -cmp
    })
    return list
  }, [residents, search, filterGender, filterStatus, filterBlood, sortCol, sortAsc])

  const toggleSort = col => {
    if (sortCol === col) setSortAsc(p=>!p)
    else { setSortCol(col); setSortAsc(true) }
  }

  const exportCSV = useCallback(() => {
    const hdr = 'ID,First Name,Last Name,Middle Name,Birth Date,Age,Gender,Place,Purok/Zone,Contact,Blood Type,Status,Medical History,Registered\n'
    const rows = filtered.map(r =>
      [r.id,r.firstName||'',r.lastName||'',r.middleName||'',r.birthDate||'',calcAge(r.birthDate),
       r.gender||'',r.place||'',r.purok||'',r.contact||'',r.bloodType||'Unknown',r.status||'active',
       `"${(r.medicalHistory||'').replace(/"/g,'""')}"`,
       r.registrationDate?new Date(r.registrationDate).toLocaleDateString():''
      ].join(',')
    ).join('\n')
    const url = URL.createObjectURL(new Blob([hdr+rows],{type:'text/csv'}))
    Object.assign(document.createElement('a'),{href:url,download:`BHW_Residents_${new Date().toISOString().split('T')[0]}.csv`}).click()
    URL.revokeObjectURL(url)
  }, [filtered])

  const SortBtn = ({col, label}) => (
    <button onClick={() => toggleSort(col)}
      className={`text-[10px] font-bold uppercase tracking-wide flex items-center gap-0.5 hover:text-emerald-700 transition-colors ${sortCol===col?'text-emerald-600':'text-slate-400'}`}>
      {label}{sortCol===col?(sortAsc?'↑':'↓'):''}
    </button>
  )

  // Edit modal submit
  const handleEditSave = (formData) => {
    const parse = s => !s?[]:(Array.isArray(s)?s:s.split(',').map(x=>x.trim()).filter(Boolean))
    onUpdate(editingResident.id, {
      ...formData,
      allergies:   parse(formData.allergies),
      medications: parse(formData.medications),
      lastUpdated: new Date().toISOString(),
    })
    setEditingResident(null)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-extrabold text-slate-800 text-base">Residents</h2>
            <p className="text-xs text-slate-400 mt-0.5">{filtered.length} of {residents.length} shown</p>
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wide transition-colors flex-shrink-0">
            📥 Export CSV
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, place, blood type..."
            className="w-full pl-8 pr-8 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"/>
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          {search && <button onClick={()=>setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 text-xs">✕</button>}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            {label:'Gender', val:filterGender, set:setFilterGender, opts:['All','Male','Female','Other']},
            {label:'Status', val:filterStatus, set:setFilterStatus, opts:['All','active','inactive']},
            {label:'Blood', val:filterBlood,   set:setFilterBlood,  opts:bloodTypes},
          ].map(f => (
            <div key={f.label} className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase">{f.label}:</span>
              <select value={f.val} onChange={e=>f.set(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-400">
                {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-4 py-2 bg-slate-50 border-b border-slate-100 flex-shrink-0 gap-2">
        <div className="w-8 flex-shrink-0"/>
        <div className="flex-1"><SortBtn col="lastName" label="Name"/></div>
        <div className="w-10 hidden sm:block"><SortBtn col="age" label="Age"/></div>
        <div className="w-14 hidden md:block"><span className="text-[10px] font-bold uppercase text-slate-400">Gender</span></div>
        <div className="w-12 hidden lg:block"><span className="text-[10px] font-bold uppercase text-slate-400">Blood</span></div>
        <div className="w-16 hidden lg:block"><span className="text-[10px] font-bold uppercase text-slate-400">Status</span></div>
        {canEdit && <div className="w-16 flex-shrink-0"><span className="text-[10px] font-bold uppercase text-slate-400">Actions</span></div>}
      </div>

      {/* Virtual table */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-3">👥</span>
          <p className="font-semibold">{residents.length===0?'No residents yet':'No matches found'}</p>
          <p className="text-xs mt-1">{residents.length===0?'Add residents using the form':'Try changing your search or filters'}</p>
        </div>
      ) : (
        <VirtualTable rows={filtered} onEdit={handleEdit} onDelete={onDelete} canEdit={canEdit} onAssignParent={onAssignParent}/>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingResident && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{opacity:0,scale:0.95,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <EditForm resident={editingResident} onSave={handleEditSave} onCancel={() => setEditingResident(null)}/>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Inline Edit Form ──────────────────────────────────────────────────────────
const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown']

function EditForm({ resident, onSave, onCancel }) {
  const [form, setForm] = useState({
    ...resident,
    allergies:   Array.isArray(resident.allergies)   ? resident.allergies.join(', ')   : resident.allergies||'',
    medications: Array.isArray(resident.medications) ? resident.medications.join(', ') : resident.medications||'',
  })
  const [errors, setErrors] = useState({})

  const set = e => {
    setForm(p=>({...p,[e.target.name]:e.target.value}))
    if (errors[e.target.name]) setErrors(p=>({...p,[e.target.name]:''}))
  }

  const validate = () => {
    const e = {}
    if (!form.firstName?.trim()) e.firstName = 'Required'
    if (!form.lastName?.trim())  e.lastName  = 'Required'
    if (!form.gender)            e.gender    = 'Required'
    if (!form.birthDate)         e.birthDate = 'Required'
    return e
  }

  const handleSubmit = e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave(form)
  }

  const F = ({label,name,type='text',placeholder,required,children}) => (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}{required&&<span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children||<input type={type} name={name} value={form[name]||''} onChange={set} placeholder={placeholder}
        className={`w-full px-3 py-2.5 rounded-xl border text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all ${errors[name]?'border-red-300 bg-red-50':'border-slate-200'}`}/>}
      {errors[name]&&<p className="text-xs text-red-500 mt-1">{errors[name]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 rounded-t-2xl">
        <h2 className="text-white font-extrabold text-base">✏️ Edit Resident</h2>
        <p className="text-blue-200 text-xs mt-0.5">{resident.firstName} {resident.lastName}</p>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <F label="First Name" name="firstName" required placeholder="Juan"/>
          <F label="Last Name"  name="lastName"  required placeholder="Dela Cruz"/>
        </div>
        <F label="Middle Name" name="middleName" placeholder="Optional"/>
        <div className="grid grid-cols-2 gap-3">
          <F label="Birth Date" name="birthDate" type="date" required/>
          <F label="Gender" name="gender" required>
            <select name="gender" value={form.gender||''} onChange={set}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all ${errors.gender?'border-red-300':'border-slate-200'}`}>
              <option value="">Select...</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Place / Barangay" name="place" placeholder="e.g. Brgy. San Jose"/>
          <F label="Purok / Zone" name="purok" placeholder="e.g. Purok 1"/>
        </div>
        <F label="Contact" name="contact" type="tel" placeholder="09XX-XXX-XXXX"/>
        <div className="grid grid-cols-2 gap-3">
          <F label="Blood Type" name="bloodType">
            <select name="bloodType" value={form.bloodType||'Unknown'} onChange={set}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all">
              {BLOOD_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </F>
          <F label="Status" name="status">
            <select name="status" value={form.status||'active'} onChange={set}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </F>
        </div>
        <F label="Medical History" name="medicalHistory">
          <textarea name="medicalHistory" value={form.medicalHistory||''} onChange={set} rows={2}
            placeholder="e.g. Hypertension..."
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all resize-none"/>
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Allergies"   name="allergies"   placeholder="e.g. Penicillin"/>
          <F label="Medications" name="medications" placeholder="e.g. Amlodipine"/>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm uppercase hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button type="submit"
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm uppercase transition-all">
            💾 Save Changes
          </button>
        </div>
      </div>
    </form>
  )
}
