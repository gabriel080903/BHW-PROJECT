import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown']

const EMPTY = {
  firstName:'', middleName:'', lastName:'',
  birthDate:'', gender:'', place:'', purok:'', contact:'',
  bloodType:'Unknown', medicalHistory:'',
  allergies:'', medications:'',
  emergencyName:'', emergencyContact:'',
}

// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX: Field MUST live OUTSIDE ResidentForm.
// If defined inside, React creates a brand-new component type every render →
// unmounts + remounts the <input> after each keystroke → input loses focus.
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

const inputCls = (hasError) =>
  `w-full px-3 py-2.5 rounded-xl border text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all ${hasError ? 'border-red-300 bg-red-50' : 'border-slate-200'}`

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g,''))
  const fieldVariants = {
    firstName:        ['firstname','first name','first','fname','given name','givenname'],
    lastName:         ['lastname','last name','last','lname','surname','family name','familyname'],
    middleName:       ['middlename','middle name','middle','mname'],
    birthDate:        ['birthdate','birth date','dob','date of birth','birthday'],
    gender:           ['gender','sex'],
    place:            ['place','address','barangay','brgy','location'],
    purok:            ['purok','zone','sitio','purok/zone'],
    contact:          ['contact','phone','mobile','telephone','number','cellphone'],
    bloodType:        ['bloodtype','blood type','blood'],
    medicalHistory:   ['medicalhistory','medical history','medical','condition','conditions','diagnosis','history'],
    allergies:        ['allergies','allergy'],
    medications:      ['medications','medication','medicine','meds'],
    emergencyName:    ['emergencyname','emergency name','emergency contact name'],
    emergencyContact: ['emergencycontact','emergency contact','emergency number','emergencyphone'],
  }
  const colMap = {}
  headers.forEach((h, i) => {
    for (const [field, variants] of Object.entries(fieldVariants)) {
      if (variants.includes(h)) { colMap[i] = field; break }
    }
  })
  const results = []
  for (let li = 1; li < lines.length; li++) {
    const row = []; let inQuote = false, cur = ''
    for (const ch of lines[li] + ',') {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { row.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    const obj = { ...EMPTY }
    row.forEach((val, i) => { if (colMap[i]) obj[colMap[i]] = val })
    if (obj.firstName || obj.lastName) {
      results.push({
        ...obj, id: Date.now() + li,
        registrationDate: new Date().toISOString(),
        allergies:   obj.allergies   ? obj.allergies.split(/[;,]/).map(s=>s.trim()).filter(Boolean)   : [],
        medications: obj.medications ? obj.medications.split(/[;,]/).map(s=>s.trim()).filter(Boolean) : [],
        bloodType: obj.bloodType || 'Unknown',
        vax:[], status:'active', lastUpdated: new Date().toISOString(), history:[],
      })
    }
  }
  return results
}

export default function ResidentForm({ onSave, onImport, editResident, onCancelEdit }) {
  const [form,       setForm]       = useState(EMPTY)
  const [errors,     setErrors]     = useState({})
  const [saved,      setSaved]      = useState(false)
  const [tab,        setTab]        = useState('single')
  const [csvPreview, setCsvPreview] = useState([])
  const [csvError,   setCsvError]   = useState('')
  const [importing,  setImporting]  = useState(false)
  const fileRef = useRef()

  // Populate form when editResident changes
  const prevEditId = useRef(null)
  useEffect(() => {
    if (editResident && editResident.id !== prevEditId.current) {
      prevEditId.current = editResident.id
      setForm({
        ...editResident,
        allergies:   Array.isArray(editResident.allergies)   ? editResident.allergies.join(', ')   : editResident.allergies   || '',
        medications: Array.isArray(editResident.medications) ? editResident.medications.join(', ') : editResident.medications || '',
      })
      setErrors({}); setSaved(false)
    } else if (!editResident && prevEditId.current !== null) {
      prevEditId.current = null
      setForm(EMPTY); setErrors({}); setSaved(false)
    }
  }, [editResident])

  const isEditing = !!editResident

  const set = e => {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }))
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
    onSave(form, isEditing ? editResident.id : null)
    if (!isEditing) { setForm(EMPTY); setErrors({}) }
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const handleCSVFile = e => {
    const file = e.target.files[0]; if (!file) return
    setCsvError('')
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = parseCSV(ev.target.result)
        if (!parsed.length) { setCsvError('No valid rows found. Ensure headers include firstName and lastName.'); return }
        setCsvPreview(parsed)
      } catch { setCsvError('Failed to parse CSV file.') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  const handleBulkImport = () => {
    if (!csvPreview.length) return
    setImporting(true)
    setTimeout(() => { onImport(csvPreview); setCsvPreview([]); setImporting(false) }, 300)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4">
        <h2 className="text-white font-extrabold text-base tracking-tight">
          {isEditing ? '✏️ Edit Resident' : '➕ Add Resident'}
        </h2>
        <p className="text-emerald-200 text-xs mt-0.5">
          {isEditing ? 'Update resident information' : 'Fill in resident details below'}
        </p>
      </div>

      {!isEditing && (
        <div className="flex border-b border-slate-100">
          {[{id:'single',label:'Single Entry'},{id:'bulk',label:'Bulk CSV'}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-all ${tab===t.id ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-slate-500 hover:bg-slate-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── SINGLE ENTRY FORM ── */}
      {(isEditing || tab === 'single') && (
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" required error={errors.firstName}>
              <input name="firstName" value={form.firstName} onChange={set} placeholder="Juan" className={inputCls(errors.firstName)} />
            </Field>
            <Field label="Last Name" required error={errors.lastName}>
              <input name="lastName" value={form.lastName} onChange={set} placeholder="Dela Cruz" className={inputCls(errors.lastName)} />
            </Field>
          </div>

          <Field label="Middle Name">
            <input name="middleName" value={form.middleName} onChange={set} placeholder="Santos (optional)" className={inputCls(false)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Birth Date" required error={errors.birthDate}>
              <input type="date" name="birthDate" value={form.birthDate} onChange={set} className={inputCls(errors.birthDate)} />
            </Field>
            <Field label="Gender" required error={errors.gender}>
              <select name="gender" value={form.gender} onChange={set} className={inputCls(errors.gender)}>
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Barangay / Place">
              <input name="place" value={form.place} onChange={set} placeholder="e.g. Brgy. San Jose" className={inputCls(false)} />
            </Field>
            <Field label="Purok / Zone">
              <input name="purok" value={form.purok} onChange={set} placeholder="e.g. Purok 1" className={inputCls(false)} />
            </Field>
          </div>

          <Field label="Contact Number">
            <input type="tel" name="contact" value={form.contact} onChange={set} placeholder="09XX-XXX-XXXX" className={inputCls(false)} />
          </Field>

          <Field label="Blood Type">
            <select name="bloodType" value={form.bloodType || 'Unknown'} onChange={set} className={inputCls(false)}>
              {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Medical History / Notes">
            <textarea name="medicalHistory" value={form.medicalHistory} onChange={set} rows={3}
              placeholder="e.g. Hypertension, Diabetes..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all resize-none" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Allergies">
              <input name="allergies" value={form.allergies} onChange={set} placeholder="e.g. Penicillin" className={inputCls(false)} />
            </Field>
            <Field label="Medications">
              <input name="medications" value={form.medications} onChange={set} placeholder="e.g. Amlodipine" className={inputCls(false)} />
            </Field>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Emergency Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <input name="emergencyName" value={form.emergencyName} onChange={set} placeholder="Contact name" className={inputCls(false)} />
              </Field>
              <Field label="Number">
                <input type="tel" name="emergencyContact" value={form.emergencyContact} onChange={set} placeholder="09XX-XXX-XXXX" className={inputCls(false)} />
              </Field>
            </div>
          </div>

          <div className={`flex gap-2 ${isEditing ? 'flex-row' : ''}`}>
            {isEditing && (
              <button type="button" onClick={onCancelEdit}
                className="flex-1 py-3 rounded-xl font-extrabold text-sm uppercase tracking-wider border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                Cancel
              </button>
            )}
            <motion.button type="submit" whileTap={{ scale: 0.97 }}
              className={`flex-1 py-3 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all shadow-sm ${saved ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
              {saved ? '✅ Saved!' : isEditing ? '💾 Update Resident' : '+ Add Resident'}
            </motion.button>
          </div>
        </form>
      )}

      {/* ── BULK CSV IMPORT ── */}
      {!isEditing && tab === 'bulk' && (
        <div className="p-5 space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors">
            <p className="text-2xl mb-2">📁</p>
            <p className="text-sm font-bold text-slate-700 mb-1">Upload CSV File</p>
            <p className="text-xs text-slate-400 mb-3">Columns: firstName, lastName, birthDate, gender, place, purok, contact…</p>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase hover:bg-emerald-500 transition-all">
              Choose File
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCSVFile} />
          </div>

          {csvError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{csvError}</p>
          )}

          {csvPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-600">{csvPreview.length} rows ready</p>
                <button onClick={() => setCsvPreview([])} className="text-xs text-slate-400 hover:text-red-500">Clear</button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {csvPreview.slice(0, 10).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs">
                    <span className="w-5 h-5 bg-emerald-200 text-emerald-800 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0">{i+1}</span>
                    <span className="font-bold text-slate-700">{r.firstName} {r.lastName}</span>
                    <span className="text-slate-400 ml-auto">{r.gender} · {r.place}</span>
                  </div>
                ))}
                {csvPreview.length > 10 && <p className="text-xs text-slate-400 text-center">…and {csvPreview.length-10} more</p>}
              </div>
              <button onClick={handleBulkImport} disabled={importing}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-sm uppercase tracking-wider disabled:opacity-60 transition-all">
                {importing ? 'Importing…' : `✅ Import ${csvPreview.length} Residents`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
