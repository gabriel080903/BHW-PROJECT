import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const BLOOD_TYPES = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']
const GENDERS     = ['', 'Male', 'Female', 'Other']
const STATUSES    = ['active', 'inactive']

const COLS = [
  { key: 'firstName',      label: 'First Name',      width: 130, required: true,  type: 'text' },
  { key: 'lastName',       label: 'Last Name',       width: 130, required: true,  type: 'text' },
  { key: 'middleName',     label: 'Middle Name',     width: 110, required: false, type: 'text' },
  { key: 'birthDate',      label: 'Birth Date',      width: 130, required: true,  type: 'date' },
  { key: 'gender',         label: 'Gender',          width: 90,  required: true,  type: 'select', options: GENDERS },
  { key: 'place',          label: 'Barangay',        width: 130, required: false, type: 'text' },
  { key: 'purok',          label: 'Purok / Zone',    width: 110, required: false, type: 'text' },
  { key: 'contact',        label: 'Contact',         width: 130, required: false, type: 'text' },
  { key: 'bloodType',      label: 'Blood Type',      width: 90,  required: false, type: 'select', options: BLOOD_TYPES },
  { key: 'medicalHistory', label: 'Medical History', width: 160, required: false, type: 'text' },
  { key: 'status',         label: 'Status',          width: 90,  required: false, type: 'select', options: STATUSES },
]

const EMPTY_ROW = () => ({
  _id:          Math.random().toString(36).slice(2),
  firstName:    '',
  lastName:     '',
  middleName:   '',
  birthDate:    '',
  gender:       '',
  place:        '',
  purok:        '',
  contact:      '',
  bloodType:    '',
  medicalHistory: '',
  status:       'active',
  _errors:      {},
})

function calcAge(birthDate) {
  if (!birthDate) return ''
  try {
    const d = new Date(birthDate)
    if (isNaN(d)) return ''
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  } catch { return '' }
}

function validateRow(row) {
  const errs = {}
  if (!row.firstName.trim()) errs.firstName = 'Required'
  if (!row.lastName.trim())  errs.lastName  = 'Required'
  if (!row.gender)           errs.gender    = 'Required'
  if (!row.birthDate)        errs.birthDate = 'Required'
  return errs
}

// parse CSV text → array of row objects
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const rawHeaders = lines[0].split(',').map(h => h.replace(/["']/g, '').trim().toLowerCase())
  const fieldMap = {
    firstname:    'firstName', 'first name': 'firstName', fname: 'firstName', 'given name': 'firstName',
    lastname:     'lastName',  'last name':  'lastName',  lname: 'lastName',  surname: 'lastName',
    middlename:   'middleName','middle name': 'middleName',
    birthdate:    'birthDate', 'birth date': 'birthDate', dob: 'birthDate', birthday: 'birthDate',
    gender:       'gender',    sex: 'gender',
    place:        'place',     address: 'place', barangay: 'place', brgy: 'place',
    contact:      'contact',   phone: 'contact', mobile: 'contact', cellphone: 'contact',
    bloodtype:    'bloodType', 'blood type': 'bloodType', blood: 'bloodType',
    medicalhistory: 'medicalHistory', 'medical history': 'medicalHistory', condition: 'medicalHistory',
    status:       'status',
  }
  const colMap = rawHeaders.map(h => fieldMap[h] || null)
  const results = []
  for (let i = 1; i < lines.length; i++) {
    const cells = []
    let inQ = false, cur = ''
    for (const ch of lines[i] + ',') {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = '' }
      else cur += ch
    }
    const row = EMPTY_ROW()
    cells.forEach((v, ci) => { if (colMap[ci]) row[colMap[ci]] = v })
    if (!row.status || !STATUSES.includes(row.status)) row.status = 'active'
    if (row.firstName || row.lastName) results.push(row)
  }
  return results
}

export default function BHWSpreadsheet({ onImport, notify }) {
  const INIT_ROWS = 20
  const [rows, setRows] = useState(() => Array.from({ length: INIT_ROWS }, EMPTY_ROW))
  const [focusCell, setFocusCell] = useState({ row: 0, col: 0 })
  const [errors, setErrors] = useState({}) // rowId → {field: msg}
  const [submitted, setSubmitted] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [csvError, setCsvError] = useState('')
  const fileRef = useRef()
  const cellRefs = useRef({}) // key: `${ri}-${ci}` → input ref

  const filledCount = useMemo(() =>
    rows.filter(r => r.firstName.trim() || r.lastName.trim()).length
  , [rows])

  const setCell = useCallback((rowIdx, key, val) => {
    setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [key]: val } : r))
    if (submitted) {
      setErrors(prev => {
        const rowId = rows[rowIdx]._id
        const rowErrs = { ...(prev[rowId] || {}) }
        delete rowErrs[key]
        return { ...prev, [rowId]: rowErrs }
      })
    }
  }, [rows, submitted])

  // Move focus with arrow keys / Tab / Enter
  const handleKeyDown = useCallback((e, ri, ci) => {
    const totalCols = COLS.length
    const totalRows = rows.length
    let nr = ri, nc = ci

    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) { nc = ci - 1; if (nc < 0) { nc = totalCols - 1; nr-- } }
      else            { nc = ci + 1; if (nc >= totalCols) { nc = 0; nr++ } }
    } else if (e.key === 'Enter') {
      e.preventDefault(); nr = ri + 1; nc = ci
    } else if (e.key === 'ArrowDown')  { e.preventDefault(); nr = ri + 1 }
    else if (e.key === 'ArrowUp')      { e.preventDefault(); nr = ri - 1 }
    else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length) { nc = ci + 1 }
    else if (e.key === 'ArrowLeft'  && e.target.selectionStart === 0) { nc = ci - 1 }
    else return

    // Grow rows if needed
    if (nr >= totalRows) {
      setRows(prev => [...prev, ...Array.from({ length: 5 }, EMPTY_ROW)])
    }
    nr = Math.max(0, nr)
    nc = Math.max(0, Math.min(totalCols - 1, nc))
    setFocusCell({ row: nr, col: nc })
    setTimeout(() => {
      const ref = cellRefs.current[`${nr}-${nc}`]
      if (ref) { ref.focus(); if (ref.select) ref.select() }
    }, 0)
  }, [rows.length])

  // Paste handler — paste from Excel/Sheets
  const handlePaste = useCallback((e, ri, ci) => {
    const text = e.clipboardData.getData('text/plain')
    if (!text.includes('\n') && !text.includes('\t')) return // single cell paste, let default handle

    e.preventDefault()
    const pasteRows = text.trim().split(/\r?\n/).map(line => line.split('\t'))
    setRows(prev => {
      const next = [...prev]
      pasteRows.forEach((cells, rOff) => {
        const targetRi = ri + rOff
        while (next.length <= targetRi) next.push(EMPTY_ROW())
        const updated = { ...next[targetRi] }
        cells.forEach((val, cOff) => {
          const colIdx = ci + cOff
          if (colIdx < COLS.length) {
            const col = COLS[colIdx]
            // Normalize select values
            if (col.type === 'select' && col.options) {
              const normalized = col.options.find(o => o.toLowerCase() === val.trim().toLowerCase()) || val.trim()
              updated[col.key] = normalized
            } else {
              updated[col.key] = val.trim()
            }
          }
        })
        next[targetRi] = updated
      })
      return next
    })
  }, [])

  const addRows = () => setRows(p => [...p, ...Array.from({ length: 10 }, EMPTY_ROW)])
  const clearAll = () => {
    if (!window.confirm('Clear all rows? This cannot be undone.')) return
    setRows(Array.from({ length: INIT_ROWS }, EMPTY_ROW))
    setErrors({}); setSubmitted(false)
  }

  const deleteRow = (ri) => setRows(p => p.length > 1 ? p.filter((_, i) => i !== ri) : p)
  const duplicateRow = (ri) => setRows(p => {
    const newRow = { ...p[ri], _id: Math.random().toString(36).slice(2), _errors: {} }
    const next = [...p]; next.splice(ri + 1, 0, newRow); return next
  })

  const handleCSVImport = (e) => {
    const file = e.target.files[0]; if (!file) return
    setCsvError('')
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = parseCSV(ev.target.result)
        if (!parsed.length) { setCsvError('No valid rows found. Check headers: firstName, lastName, gender, birthDate'); return }
        setRows(prev => {
          const base = prev.filter(r => r.firstName.trim() || r.lastName.trim())
          const padded = base.length > 0 ? [...base, ...parsed] : parsed
          // ensure at least 5 blank rows at bottom
          return [...padded, ...Array.from({ length: 5 }, EMPTY_ROW)]
        })
        setCsvError('')
        notify?.(`${parsed.length} rows loaded from CSV!`, 'success')
      } catch { setCsvError('Failed to read CSV. Make sure it is a valid .csv file.') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const downloadTemplate = () => {
    const csv = 'firstName,lastName,middleName,birthDate,gender,place,purok,contact,bloodType,medicalHistory,status\nJuan,Dela Cruz,Santos,1990-05-12,Male,Brgy. San Jose,Purok 1,09171234567,O+,Hypertension,active\nMaria,Reyes,,1985-03-22,Female,Brgy. Mabolo,Purok 3,09281234567,A+,,active\n'
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    Object.assign(document.createElement('a'), { href: url, download: 'BHW_Residents_Template.csv' }).click()
    URL.revokeObjectURL(url)
  }

  const handleSubmit = () => {
    setSubmitted(true)
    const filledRows = rows.filter(r => r.firstName.trim() || r.lastName.trim())
    if (!filledRows.length) { notify?.('No residents to import. Fill in at least one row.', 'warning'); return }

    const allErrors = {}
    let hasErrors = false
    filledRows.forEach(row => {
      const errs = validateRow(row)
      if (Object.keys(errs).length) { allErrors[row._id] = errs; hasErrors = true }
    })
    setErrors(allErrors)

    if (hasErrors) {
      const errCount = Object.keys(allErrors).length
      notify?.(`${errCount} row${errCount > 1 ? 's have' : ' has'} missing required fields. Please fix highlighted cells.`, 'error')
      return
    }

    setImporting(true)
    setTimeout(() => {
      const toImport = filledRows.map(row => ({
        ...row,
        id:               Date.now() + Math.random(),
        registrationDate: new Date().toISOString(),
        allergies:        [],
        medications:      [],
        bloodType:        row.bloodType || 'Unknown',
        vax:              [],
        status:           row.status || 'active',
        lastUpdated:      new Date().toISOString(),
        history:          [],
      }))
      onImport(toImport)
      setRows(Array.from({ length: INIT_ROWS }, EMPTY_ROW))
      setErrors({}); setSubmitted(false); setImporting(false)
      notify?.(`✅ ${toImport.length} residents imported successfully!`, 'success')
    }, 400)
  }

  const exportCurrentCSV = () => {
    const filled = rows.filter(r => r.firstName.trim() || r.lastName.trim())
    if (!filled.length) { notify?.('Nothing to export', 'warning'); return }
    const hdr = COLS.map(c => c.label).join(',') + '\n'
    const body = filled.map(r => COLS.map(c => `"${(r[c.key] || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([hdr + body], { type: 'text/csv' }))
    Object.assign(document.createElement('a'), { href: url, download: `BHW_Draft_${new Date().toISOString().split('T')[0]}.csv` }).click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-700 px-5 py-4 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-white font-black text-base flex items-center gap-2">
              📋 Spreadsheet Entry
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-emerald-100 uppercase tracking-wide">BHW Tool</span>
            </h2>
            <p className="text-emerald-200 text-xs mt-0.5">Type directly · Paste from Excel/Google Sheets · Import CSV</p>
          </div>
          <button onClick={() => setShowGuide(p => !p)}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-bold transition-colors flex-shrink-0">
            {showGuide ? '✕ Hide' : '❓ Guide'}
          </button>
        </div>

        {/* Quick Guide */}
        <AnimatePresence>
          {showGuide && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-3 bg-white/10 rounded-xl p-3 text-emerald-100 text-xs space-y-1">
              <p className="font-bold text-white mb-1.5">⌨️ Keyboard Shortcuts</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                  ['Tab / Shift+Tab', 'Move right / left'],
                  ['Enter / ↓', 'Move down'],
                  ['↑ ↓ ← →', 'Navigate cells'],
                  ['Ctrl+V / Cmd+V', 'Paste from Excel/Sheets'],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap">{k}</kbd>
                    <span className="text-emerald-200">{v}</span>
                  </div>
                ))}
              </div>
              <p className="text-emerald-300 text-[10px] mt-1.5">💡 You can copy rows from Excel or Google Sheets and paste directly into the table. Columns must match order: First Name, Last Name, Middle Name, Birth Date, Gender, Barangay, Contact, Blood Type, Medical History, Status.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50 flex-wrap flex-shrink-0">
        {/* CSV import */}
        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          Import CSV
          <input type="file" accept=".csv" className="hidden" ref={fileRef} onChange={handleCSVImport} />
        </label>
        <button onClick={downloadTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Template
        </button>
        <button onClick={exportCurrentCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors">
          💾 Save Draft
        </button>
        <button onClick={addRows}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors">
          + 10 Rows
        </button>
        <button onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors">
          🗑 Clear All
        </button>

        {csvError && (
          <p className="text-xs text-red-600 font-medium flex-1">{csvError}</p>
        )}

        <div className="ml-auto flex items-center gap-3">
          <p className="text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-700">{filledCount}</span> filled
            <span className="text-slate-300 mx-1.5">·</span>
            <span className="text-slate-500">{rows.length} rows</span>
          </p>
          <button onClick={handleSubmit} disabled={importing || filledCount === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-black uppercase tracking-wide transition-colors shadow-sm">
            {importing
              ? <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Saving…</>
              : <>✅ Import {filledCount > 0 ? filledCount : ''} Residents</>
            }
          </button>
        </div>
      </div>

      {/* ── Spreadsheet ── */}
      <div className="overflow-auto flex-1" style={{ maxHeight: '60vh' }}>
        <table className="border-collapse min-w-max w-full" style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
          {/* Column headers */}
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="w-8 bg-slate-100 border border-slate-200 text-slate-400 text-[10px] font-bold px-1 text-center sticky left-0 z-30" style={{ minWidth: 32 }}>#</th>
              {COLS.map((col, ci) => (
                <th key={col.key}
                  className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1.5 text-left whitespace-nowrap"
                  style={{ minWidth: col.width }}>
                  {col.label}
                  {col.required && <span className="text-red-500 ml-0.5">*</span>}
                </th>
              ))}
              <th className="bg-slate-100 border border-slate-200 text-slate-400 text-[10px] font-bold px-2 py-1.5 w-20 whitespace-nowrap">Age</th>
              <th className="bg-slate-100 border border-slate-200 text-slate-400 text-[10px] font-bold px-2 py-1.5 w-16 sticky right-0 z-30">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const rowErrs = errors[row._id] || {}
              const isFilled = row.firstName.trim() || row.lastName.trim()
              const age = calcAge(row.birthDate)
              const hasRowError = Object.keys(rowErrs).length > 0 && submitted

              return (
                <tr key={row._id}
                  className={`group ${hasRowError ? 'bg-red-50/40' : isFilled ? 'bg-white hover:bg-emerald-50/30' : 'bg-slate-50/50 hover:bg-slate-50'}`}>
                  {/* Row number */}
                  <td className="border border-slate-100 text-slate-400 text-center text-[10px] select-none sticky left-0 bg-inherit z-10 px-1"
                    style={{ minWidth: 32 }}>
                    {hasRowError ? <span className="text-red-500">⚠</span> : ri + 1}
                  </td>

                  {/* Data cells */}
                  {COLS.map((col, ci) => {
                    const cellErr = rowErrs[col.key]
                    const isFocus = focusCell.row === ri && focusCell.col === ci
                    const baseCell = `border text-slate-800 outline-none transition-all w-full h-full px-2 py-1.5 bg-transparent ${
                      cellErr
                        ? 'border-red-400 bg-red-50'
                        : isFocus
                        ? 'border-emerald-500 ring-1 ring-emerald-400 bg-white'
                        : 'border-slate-100 focus:border-emerald-400 focus:bg-white'
                    }`

                    return (
                      <td key={col.key} className={`border border-slate-100 p-0 ${cellErr ? 'bg-red-50' : ''}`}
                        style={{ minWidth: col.width }} title={cellErr || ''}>
                        {col.type === 'select' ? (
                          <select
                            ref={el => { cellRefs.current[`${ri}-${ci}`] = el }}
                            value={row[col.key] || ''}
                            onChange={e => setCell(ri, col.key, e.target.value)}
                            onFocus={() => setFocusCell({ row: ri, col: ci })}
                            onKeyDown={e => handleKeyDown(e, ri, ci)}
                            className={baseCell + ' cursor-pointer appearance-none pr-6'}
                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', backgroundSize: '14px' }}>
                            {col.options.map(o => <option key={o} value={o}>{o || `— ${col.label} —`}</option>)}
                          </select>
                        ) : (
                          <input
                            ref={el => { cellRefs.current[`${ri}-${ci}`] = el }}
                            type={col.type}
                            value={row[col.key] || ''}
                            onChange={e => setCell(ri, col.key, e.target.value)}
                            onFocus={() => setFocusCell({ row: ri, col: ci })}
                            onKeyDown={e => handleKeyDown(e, ri, ci)}
                            onPaste={e => handlePaste(e, ri, ci)}
                            className={baseCell}
                            placeholder={col.required ? col.label : ''}
                            autoComplete="off"
                            spellCheck={false}
                          />
                        )}
                      </td>
                    )
                  })}

                  {/* Age auto-calc */}
                  <td className="border border-slate-100 px-2 text-slate-400 text-xs text-center whitespace-nowrap">
                    {age !== '' ? age : ''}
                  </td>

                  {/* Row actions */}
                  <td className="border border-slate-100 px-1 sticky right-0 bg-inherit z-10">
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => duplicateRow(ri)} title="Duplicate row"
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs">
                        ⧉
                      </button>
                      <button onClick={() => deleteRow(ri)} title="Delete row"
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors text-xs">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 flex-shrink-0 gap-3">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>📋 <strong className="text-slate-700">{rows.length}</strong> rows · <strong className="text-emerald-700">{filledCount}</strong> filled</span>
          {submitted && Object.keys(errors).length > 0 && (
            <span className="text-red-600 font-bold">⚠ {Object.keys(errors).length} row{Object.keys(errors).length > 1 ? 's' : ''} with errors</span>
          )}
        </div>
        <button onClick={addRows}
          className="text-xs text-emerald-600 hover:text-emerald-500 font-bold transition-colors">
          + Add 10 more rows
        </button>
      </div>
    </div>
  )
}
