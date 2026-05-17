import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo } from 'react'

export default function ResidentApprovalPanel({ residents, onApprove, onReject, onDelete, notify }) {
  const [filter, setFilter] = useState('pending') // pending, approved, rejected

  // Separate residents by request status
  const pendingRequests = useMemo(() => 
    residents.filter(r => r.requestApprovalStatus === 'pending'), 
    [residents]
  )

  const approvedRequests = useMemo(() => 
    residents.filter(r => r.requestApprovalStatus === 'approved'), 
    [residents]
  )

  const rejectedRequests = useMemo(() => 
    residents.filter(r => r.requestApprovalStatus === 'rejected'), 
    [residents]
  )

  const allDirect = useMemo(() =>
    residents.filter(r => r.requestApprovalStatus === 'direct' || !r.requestApprovalStatus),
    [residents]
  )

  const displayedResidents = useMemo(() => {
    switch (filter) {
      case 'pending':  return pendingRequests
      case 'approved': return approvedRequests
      case 'rejected': return rejectedRequests
      case 'direct':   return allDirect
      default:         return []
    }
  }, [filter, pendingRequests, approvedRequests, rejectedRequests, allDirect])

  const PARENT_ACCOUNTS = [
    { id: 3, name: 'Parent Demo', email: 'parent@bhw.com' },
  ]

  const getParentName = (parentId) => {
    const p = PARENT_ACCOUNTS.find(x => String(x.id) === String(parentId))
    return p?.name || 'Unknown Parent'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">📋 Resident Management</h1>
          <p className="text-sm text-slate-500 mt-1">Approve/reject family member registration requests</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {[
          { id: 'pending', label: '⏳ Pending Requests', count: pendingRequests.length, color: 'amber' },
          { id: 'approved', label: '✅ Approved', count: approvedRequests.length, color: 'emerald' },
          { id: 'rejected', label: '❌ Rejected', count: rejectedRequests.length, color: 'red' },
          { id: 'direct', label: '🏥 Admin Added', count: allDirect.length, color: 'blue' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold whitespace-nowrap text-sm transition-all flex-shrink-0 border ${
              filter === tab.id
                ? tab.color === 'amber'
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : tab.color === 'emerald'
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                    : tab.color === 'red'
                      ? 'bg-red-100 border-red-300 text-red-800'
                      : 'bg-blue-100 border-blue-300 text-blue-800'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <span className="text-lg">{tab.label.split(' ')[0]}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              filter === tab.id
                ? 'bg-white/50'
                : 'bg-slate-100'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {displayedResidents.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-2xl border border-slate-200 p-12 text-center"
          >
            <div className="text-5xl mb-4">
              {filter === 'pending' ? '✨' : filter === 'approved' ? '✅' : filter === 'rejected' ? '⛔' : '📝'}
            </div>
            <p className="text-lg font-bold text-slate-600">
              {filter === 'pending'
                ? 'No pending requests'
                : filter === 'approved'
                  ? 'No approved requests'
                  : filter === 'rejected'
                    ? 'No rejected requests'
                    : 'No admin-added residents'}
            </p>
            <p className="text-sm text-slate-400 mt-2">
              {filter === 'pending' && 'Parents will submit requests to add family members here'}
              {filter === 'approved' && 'Approved families will appear here'}
              {filter === 'rejected' && 'Rejected requests will appear here'}
              {filter === 'direct' && 'Residents added directly by admin appear here'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={`list-${filter}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4"
          >
            {displayedResidents.map((resident, idx) => {
              const isParentRequest = resident.requestApprovalStatus === 'pending' || resident.requestApprovalStatus === 'approved' || resident.requestApprovalStatus === 'rejected'
              const parentName = isParentRequest ? getParentName(resident.requestedBy) : 'Admin'
              const age = resident.birthDate
                ? Math.floor((Date.now() - new Date(resident.birthDate)) / (1000 * 60 * 60 * 24 * 365.25))
                : null

              return (
                <motion.div
                  key={resident.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-black text-base flex-shrink-0 shadow-md">
                      {(resident.firstName?.[0] || '?').toUpperCase()}
                      {(resident.lastName?.[0] || '').toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="text-lg font-black text-slate-800 leading-tight">
                            {resident.firstName} {resident.lastName}
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                            {[age !== null ? `${age} yrs old` : null, resident.gender, resident.purok || resident.place]
                              .filter(Boolean)
                              .join(' • ')}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div className="flex-shrink-0">
                          {resident.requestApprovalStatus === 'pending' && (
                            <span className="inline-block px-3 py-1.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-black">⏳ Pending</span>
                          )}
                          {resident.requestApprovalStatus === 'approved' && (
                            <span className="inline-block px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-black">✅ Approved</span>
                          )}
                          {resident.requestApprovalStatus === 'rejected' && (
                            <span className="inline-block px-3 py-1.5 bg-red-100 text-red-800 border border-red-300 rounded-lg text-xs font-black">❌ Rejected</span>
                          )}
                          {(!resident.requestApprovalStatus || resident.requestApprovalStatus === 'direct') && (
                            <span className="inline-block px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-xs font-black">📝 Admin Added</span>
                          )}
                        </div>
                      </div>

                      {/* Request details */}
                      {isParentRequest && (
                        <div className="bg-slate-50 rounded-xl p-3 text-xs mb-3">
                          <p className="text-slate-600">
                            <span className="font-bold">Requested by:</span> {parentName}
                          </p>
                          {resident.requestDate && (
                            <p className="text-slate-500 mt-1">
                              <span className="font-bold">Date:</span> {new Date(resident.requestDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Meta info */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                          <p className="text-slate-500 font-bold">Birth Date</p>
                          <p className="text-slate-800 font-bold">
                            {resident.birthDate
                              ? new Date(resident.birthDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '—'}
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                          <p className="text-slate-500 font-bold">Gender</p>
                          <p className="text-slate-800 font-bold">{resident.gender || '—'}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                          <p className="text-slate-500 font-bold">Blood Type</p>
                          <p className="text-slate-800 font-bold">{resident.bloodType || 'Unknown'}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                          <p className="text-slate-500 font-bold">Status</p>
                          <p className="text-slate-800 font-bold">{resident.status || 'active'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {resident.requestApprovalStatus === 'pending' && (
                    <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onApprove(resident.id)}
                        className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-bold uppercase tracking-wide text-sm transition-all"
                      >
                        ✅ Approve
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onReject(resident.id)}
                        className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-xl font-bold uppercase tracking-wide text-sm transition-all"
                      >
                        ❌ Reject
                      </motion.button>
                    </div>
                  )}

                  {/* Delete option for rejected/direct */}
                  {(resident.requestApprovalStatus === 'rejected' || !resident.requestApprovalStatus || resident.requestApprovalStatus === 'direct') && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onDelete(resident.id)}
                        className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm transition-all border border-red-100"
                      >
                        🗑️ Delete
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
