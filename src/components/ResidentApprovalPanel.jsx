import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo } from 'react'

export default function ResidentApprovalPanel({
  residents, onApprove, onReject, onDelete, notify,
  userRole = 'Admin', records = [], onApproveRecord
}) {
  const isAdmin = userRole === 'Admin'
  const [filter, setFilter] = useState('pending')
  const [activeSection, setActiveSection] = useState('residents') // residents | nutrition

  // ── Resident requests ──────────────────────────────────────────────────────
  const pendingResidents  = useMemo(() => residents.filter(r => r.requestApprovalStatus === 'pending'), [residents])
  const approvedResidents = useMemo(() => residents.filter(r => r.requestApprovalStatus === 'approved'), [residents])
  const rejectedResidents = useMemo(() => residents.filter(r => r.requestApprovalStatus === 'rejected'), [residents])
  const directResidents   = useMemo(() => residents.filter(r => !r.requestApprovalStatus || r.requestApprovalStatus === 'direct'), [residents])

  const displayedResidents = useMemo(() => {
    switch (filter) {
      case 'pending':  return pendingResidents
      case 'approved': return approvedResidents
      case 'rejected': return rejectedResidents
      case 'direct':   return directResidents
      default:         return []
    }
  }, [filter, pendingResidents, approvedResidents, rejectedResidents, directResidents])

  // ── Nutrition records pending BHW approval ────────────────────────────────
  const pendingNutrition = useMemo(() =>
    records.filter(r => r.approvalStatus === 'pending'), [records])
  const approvedNutrition = useMemo(() =>
    records.filter(r => r.approvalStatus === 'approved'), [records])

  const totalPending = pendingResidents.length + pendingNutrition.length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">✅</div>
        <div>
          <h1 className="text-lg font-black text-slate-800">Approvals & Management</h1>
          <p className="text-xs text-slate-400">
            {totalPending > 0
              ? `${totalPending} pending item${totalPending > 1 ? 's' : ''} need your attention`
              : 'All items reviewed'}
          </p>
        </div>
        {totalPending > 0 && (
          <span className="ml-auto px-3 py-1.5 bg-red-500 text-white text-xs font-black rounded-full animate-pulse">
            {totalPending} Pending
          </span>
        )}
      </div>

      {/* Section switcher — BHW sees nutrition approvals too */}
      <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
        <button onClick={() => setActiveSection('residents')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeSection === 'residents' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          👥 Resident Requests
          {pendingResidents.length > 0 && (
            <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-black rounded-full">{pendingResidents.length}</span>
          )}
        </button>
        <button onClick={() => setActiveSection('nutrition')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeSection === 'nutrition' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          🥗 Nutrition Records
          {pendingNutrition.length > 0 && (
            <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-black rounded-full">{pendingNutrition.length}</span>
          )}
        </button>
      </div>

      {/* ── RESIDENT SECTION ── */}
      {activeSection === 'residents' && (
        <div className="space-y-4">
          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {[
              { id: 'pending',  label: '⏳ Pending',  count: pendingResidents.length,  color: 'amber' },
              { id: 'approved', label: '✅ Approved', count: approvedResidents.length, color: 'emerald' },
              { id: 'rejected', label: '❌ Rejected', count: rejectedResidents.length, color: 'red' },
              ...(isAdmin ? [{ id: 'direct', label: '🏥 Admin Added', count: directResidents.length, color: 'blue' }] : []),
            ].map(tab => (
              <button key={tab.id} onClick={() => setFilter(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap text-sm transition-all flex-shrink-0 border ${
                  filter === tab.id
                    ? tab.color === 'amber'   ? 'bg-amber-100 border-amber-300 text-amber-800'
                    : tab.color === 'emerald' ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                    : tab.color === 'red'     ? 'bg-red-100 border-red-300 text-red-800'
                    : 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}>
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${filter === tab.id ? 'bg-white/60' : 'bg-slate-100'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {displayedResidents.length === 0 ? (
              <motion.div key="empty" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <div className="text-5xl mb-4">{filter === 'pending' ? '✨' : filter === 'approved' ? '✅' : filter === 'rejected' ? '⛔' : '📝'}</div>
                <p className="font-bold text-slate-600">
                  {filter === 'pending' ? 'No pending requests' : filter === 'approved' ? 'No approved requests' : filter === 'rejected' ? 'No rejected requests' : 'No admin-added residents'}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {filter === 'pending' && 'Parents will submit family member requests here'}
                  {filter === 'approved' && 'Approved family members appear here'}
                  {filter === 'rejected' && 'Rejected requests appear here'}
                  {filter === 'direct' && 'Residents added directly by admin appear here'}
                </p>
              </motion.div>
            ) : (
              <motion.div key={`list-${filter}`} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="grid gap-4">
                {displayedResidents.map((resident, idx) => {
                  const age = resident.birthDate
                    ? Math.floor((Date.now() - new Date(resident.birthDate)) / (1000*60*60*24*365.25))
                    : null
                  return (
                    <motion.div key={resident.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:idx*0.04}}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow">
                          {(resident.firstName?.[0]||'?').toUpperCase()}{(resident.lastName?.[0]||'').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h3 className="text-base font-black text-slate-800">{resident.firstName} {resident.lastName}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {[age !== null ? `${age} yrs` : null, resident.gender, resident.purok || resident.place].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                            <span className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-black ${
                              resident.requestApprovalStatus === 'pending'  ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              resident.requestApprovalStatus === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              resident.requestApprovalStatus === 'rejected' ? 'bg-red-100 text-red-800 border border-red-300' :
                              'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}>
                              {resident.requestApprovalStatus === 'pending'  ? '⏳ Pending' :
                               resident.requestApprovalStatus === 'approved' ? '✅ Approved' :
                               resident.requestApprovalStatus === 'rejected' ? '❌ Rejected' : '📝 Admin Added'}
                            </span>
                          </div>

                          {/* Details grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                            {[
                              { label: 'Birth Date', value: resident.birthDate ? new Date(resident.birthDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—' },
                              { label: 'Gender',     value: resident.gender || '—' },
                              { label: 'Blood Type', value: resident.bloodType || 'Unknown' },
                              { label: 'Purok',      value: resident.purok || resident.place || '—' },
                            ].map(({ label, value }) => (
                              <div key={label} className="bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                                <p className="text-slate-400 font-bold text-[10px] uppercase">{label}</p>
                                <p className="text-slate-800 font-bold mt-0.5">{value}</p>
                              </div>
                            ))}
                          </div>

                          {resident.requestDate && (
                            <p className="text-xs text-slate-400">
                              Submitted: {new Date(resident.requestDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Pending actions */}
                      {resident.requestApprovalStatus === 'pending' && (
                        <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                          <button onClick={() => onApprove(resident.id)}
                            className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-bold text-sm transition-all">
                            ✅ Approve
                          </button>
                          <button onClick={() => onReject(resident.id)}
                            className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-xl font-bold text-sm transition-all">
                            ❌ Reject
                          </button>
                        </div>
                      )}

                      {/* Delete for admin only */}
                      {isAdmin && (resident.requestApprovalStatus === 'rejected' || !resident.requestApprovalStatus || resident.requestApprovalStatus === 'direct') && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <button onClick={() => onDelete(resident.id)}
                            className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm transition-all border border-red-100">
                            🗑️ Delete Resident
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── NUTRITION SECTION ── */}
      {activeSection === 'nutrition' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[
              { id: 'pending',  label: '⏳ Pending',  count: pendingNutrition.length },
              { id: 'approved', label: '✅ Approved', count: approvedNutrition.length },
            ].map(tab => (
              <button key={tab.id}
                onClick={() => setFilter(tab.id === filter ? tab.id : tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                  filter === tab.id ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-600'
                }`}>
                {tab.label}
                <span className="px-2 py-0.5 bg-white/60 rounded-full text-xs font-black">{tab.count}</span>
              </button>
            ))}
          </div>

          {(filter === 'pending' ? pendingNutrition : approvedNutrition).length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="text-5xl mb-4">🥗</div>
              <p className="font-bold text-slate-600">No {filter} nutrition records</p>
              <p className="text-sm text-slate-400 mt-1">
                {filter === 'pending' ? 'Nutrition records submitted by BHW will appear here for admin approval' : 'Approved nutrition records appear here'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {(filter === 'pending' ? pendingNutrition : approvedNutrition).map((rec, idx) => (
                <motion.div key={rec.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:idx*0.04}}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-black text-slate-800">{rec.childName || '—'}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Recorded: {rec.date || '—'}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-black border ${
                      rec.approvalStatus === 'approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {rec.approvalStatus === 'approved' ? '✅ Approved' : '⏳ Pending'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    {[
                      { label: 'Weight', value: rec.weight ? `${rec.weight} kg` : '—' },
                      { label: 'Height', value: rec.height ? `${rec.height} cm` : '—' },
                      { label: 'BMI',    value: rec.bmi || '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-slate-50 rounded-lg px-2 py-2 border border-slate-100 text-center">
                        <p className="text-slate-400 font-bold text-[10px] uppercase">{label}</p>
                        <p className="text-slate-800 font-black mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                  {rec.status && (
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-black mb-3 ${
                      rec.status === 'Normal' ? 'bg-emerald-100 text-emerald-700' :
                      ['Underweight','Severely Underweight','Wasted'].includes(rec.status) ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{rec.status}</div>
                  )}
                  {rec.approvalStatus === 'pending' && onApproveRecord && (
                    <div className="flex gap-3 pt-3 border-t border-slate-100">
                      <button onClick={() => { onApproveRecord(rec.id, true); notify('Record approved!') }}
                        className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 text-white rounded-xl font-bold text-sm transition-all">
                        ✅ Approve Record
                      </button>
                      <button onClick={() => { onApproveRecord(rec.id, false); notify('Record rejected', 'info') }}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 rounded-xl font-bold text-sm transition-all">
                        ❌ Reject
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
