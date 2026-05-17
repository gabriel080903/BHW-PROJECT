import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../utils/api'

const ROLES = ['Admin', 'BHW', 'Parent/Guardian']

const roleBadge = {
  'Admin':          'bg-yellow-100 text-yellow-800 border border-yellow-200',
  'BHW':            'bg-emerald-100 text-emerald-800 border border-emerald-200',
  'Parent/Guardian':'bg-violet-100 text-violet-800 border border-violet-200',
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="absolute inset-0 bg-black/50" onClick={onClose}/>
      <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">✕</button>
        </div>
        {children}
      </motion.div>
    </div>
  )
}

export default function UserManagement({ notify }) {
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser]     = useState(null)
  const [resetUser, setResetUser]   = useState(null)
  const [form, setForm]             = useState({ username:'', password:'', role:'BHW', email:'' })
  const [editForm, setEditForm]     = useState({ role:'', displayName:'', email:'' })
  const [newPassword, setNewPassword] = useState('')
  const [formError, setFormError]   = useState('')

  const [pendingUsers, setPendingUsers] = useState([])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterRole) params.set('role', filterRole)
      const [data, pendingData] = await Promise.all([
        api.get(`/api/users?${params}`),
        api.get('/api/users/pending').catch(() => ({ users: [] }))
      ])
      setUsers(data.users || [])
      setPendingUsers(pendingData.users || [])
    } catch (err) {
      notify('Failed to load users: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [search, filterRole, notify])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleCreate = async e => {
    e.preventDefault()
    setFormError('')
    try {
      await api.post('/api/users', form)
      notify('User created successfully!')
      setShowCreate(false)
      setForm({ username:'', password:'', role:'BHW', email:'' })
      fetchUsers()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleUpdate = async e => {
    e.preventDefault()
    setFormError('')
    try {
      await api.put(`/api/users/${editUser._id}`, editForm)
      notify('User updated!')
      setEditUser(null)
      fetchUsers()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleResetPassword = async e => {
    e.preventDefault()
    setFormError('')
    try {
      await api.post(`/api/users/${resetUser._id}/reset-password`, { newPassword })
      notify('Password reset successfully!')
      setResetUser(null)
      setNewPassword('')
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleDeactivate = async (user) => {
    if (!window.confirm(`Deactivate "${user.username}"? They won't be able to login.`)) return
    try {
      await api.patch(`/api/users/${user._id}/deactivate`)
      notify('User deactivated!')
      fetchUsers()
    } catch (err) { notify(err.message, 'error') }
  }

  const handleReactivate = async (user) => {
    try {
      await api.patch(`/api/users/${user._id}/reactivate`)
      notify('User reactivated!')
      fetchUsers()
    } catch (err) { notify(err.message, 'error') }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`Permanently delete "${user.username}"? This cannot be undone.`)) return
    try {
      await api.delete(`/api/users/${user._id}`)
      notify('User deleted!', 'info')
      fetchUsers()
    } catch (err) { notify(err.message, 'error') }
  }

  const handleApproveGoogle = async (userId, role) => {
    try {
      await api.patch(`/api/users/${userId}/approve`, { role })
      notify(`User approved as ${role}!`)
      fetchUsers()
    } catch (err) { notify(err.message || 'Approval failed', 'error') }
  }

  const handleRejectGoogle = async (userId) => {
    if (!window.confirm('Reject and deactivate this user?')) return
    try {
      await api.patch(`/api/users/${userId}/deactivate`)
      notify('User rejected and deactivated.')
      fetchUsers()
    } catch (err) { notify(err.message, 'error') }
  }

  const inpCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">👥</div>
          <div>
            <h1 className="text-lg font-black text-slate-800">User Management</h1>
            <p className="text-xs text-slate-400">{users.length} user{users.length !== 1 ? 's' : ''} total</p>
          </div>
        </div>
        <button onClick={() => { setShowCreate(true); setFormError('') }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold shadow-sm hover:from-emerald-500 hover:to-teal-500 transition-all">
          ➕ Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search username or email…"
          className="flex-1 min-w-[200px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Pending Google Users */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏳</span>
            <h2 className="font-black text-amber-800 text-sm">Pending Google Sign-in Approvals ({pendingUsers.length})</h2>
          </div>
          {pendingUsers.map(u => (
            <div key={u._id} className="bg-white rounded-xl border border-amber-200 p-4 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {u.profilePicture
                  ? <img src={u.profilePicture} alt="" className="w-10 h-10 rounded-full border-2 border-amber-300"/>
                  : <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center font-black text-amber-800">{u.username?.[0]?.toUpperCase()}</div>
                }
                <div className="min-w-0">
                  <p className="font-black text-slate-800 text-sm">{u.displayName || u.username}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select onChange={e => e.target.dataset.role = e.target.value}
                  id={`role-${u._id}`}
                  className="px-3 py-2 rounded-lg border border-amber-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="BHW">BHW Staff</option>
                  <option value="Parent/Guardian">Parent/Guardian</option>
                  <option value="Admin">Admin</option>
                </select>
                <button onClick={() => {
                  const sel = document.getElementById(`role-${u._id}`)
                  handleApproveGoogle(u._id, sel?.value || 'Parent/Guardian')
                }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-black transition-all">
                  ✅ Approve
                </button>
                <button onClick={() => handleRejectGoogle(u._id)}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-black transition-all">
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center">
            <span className="text-4xl block mb-3">👤</span>
            <p className="font-bold text-slate-600">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Username','Role','Email','Status','Created','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(u => (
                  <motion.tr key={u._id} initial={{opacity:0}} animate={{opacity:1}}
                    className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-black text-xs uppercase flex-shrink-0">
                          {u.username?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{u.username}</p>
                          {u.displayName && u.displayName !== u.username && (
                            <p className="text-xs text-slate-400">{u.displayName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${roleBadge[u.role] || 'bg-slate-100 text-slate-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${u.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditUser(u); setEditForm({ role: u.role, displayName: u.displayName||'', email: u.email||'' }); setFormError('') }}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all">
                          Edit
                        </button>
                        <button onClick={() => { setResetUser(u); setNewPassword(''); setFormError('') }}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-all">
                          Reset PW
                        </button>
                        {u.isActive ? (
                          <button onClick={() => handleDeactivate(u)}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold transition-all">
                            Deactivate
                          </button>
                        ) : (
                          <button onClick={() => handleReactivate(u)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all">
                            Reactivate
                          </button>
                        )}
                        <button onClick={() => handleDelete(u)}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-all">
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreate && (
          <Modal title="➕ Create New User" onClose={() => setShowCreate(false)}>
            <form onSubmit={handleCreate} className="space-y-4">
              {formError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">⚠️ {formError}</p>}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Username *</label>
                <input value={form.username} onChange={e => setForm(p=>({...p,username:e.target.value}))}
                  placeholder="e.g. bhwstaff2" className={inpCls} required/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password *</label>
                <input type="password" value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))}
                  placeholder="Min 8 chars, uppercase, number, symbol" className={inpCls} required/>
                <p className="text-xs text-slate-400 mt-1">e.g. Bhw@2026!</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Role *</label>
                <select value={form.role} onChange={e => setForm(p=>({...p,role:e.target.value}))} className={inpCls}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email (optional)</label>
                <input type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))}
                  placeholder="user@email.com" className={inpCls}/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-sm hover:from-emerald-500 hover:to-teal-500 transition-all">
                  Create User
                </button>
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Edit User Modal */}
        {editUser && (
          <Modal title={`✏️ Edit — ${editUser.username}`} onClose={() => setEditUser(null)}>
            <form onSubmit={handleUpdate} className="space-y-4">
              {formError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">⚠️ {formError}</p>}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Role</label>
                <select value={editForm.role} onChange={e => setEditForm(p=>({...p,role:e.target.value}))} className={inpCls}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Display Name</label>
                <input value={editForm.displayName} onChange={e => setEditForm(p=>({...p,displayName:e.target.value}))}
                  placeholder="Full name" className={inpCls}/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(p=>({...p,email:e.target.value}))}
                  placeholder="user@email.com" className={inpCls}/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-blue-500 hover:to-indigo-500 transition-all">
                  Save Changes
                </button>
                <button type="button" onClick={() => setEditUser(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Reset Password Modal */}
        {resetUser && (
          <Modal title={`🔑 Reset Password — ${resetUser.username}`} onClose={() => setResetUser(null)}>
            <form onSubmit={handleResetPassword} className="space-y-4">
              {formError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">⚠️ {formError}</p>}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Password *</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, uppercase, number, symbol" className={inpCls} required/>
                <p className="text-xs text-slate-400 mt-1">e.g. NewPass@2026!</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm hover:from-amber-400 hover:to-orange-400 transition-all">
                  Reset Password
                </button>
                <button type="button" onClick={() => setResetUser(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}
