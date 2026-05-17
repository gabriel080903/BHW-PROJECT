import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CATEGORIES = ['Medicine', 'Vaccine', 'Supplement', 'Equipment', 'Supply', 'Other']

const empty = { name: '', category: 'Medicine', quantity: '', unit: 'pcs', expiryDate: '', notes: '' }

export default function Inventory({ inventory, setInventory }) {
  const [form, setForm]     = useState(empty)
  const [editing, setEditing] = useState(null) // id
  const [filter, setFilter]   = useState('All')
  const [search, setSearch]   = useState('')
  const [saved, setSaved]     = useState(false)

  const set = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSave = () => {
    if (!form.name.trim() || !form.quantity) return
    if (editing !== null) {
      setInventory(p => p.map(item => item.id === editing ? { ...form, id: editing } : item))
      setEditing(null)
    } else {
      setInventory(p => [...p, { ...form, id: Date.now(), addedAt: new Date().toISOString() }])
    }
    setForm(empty)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleEdit = item => {
    setEditing(item.id)
    setForm({ name: item.name, category: item.category, quantity: item.quantity, unit: item.unit, expiryDate: item.expiryDate || '', notes: item.notes || '' })
  }

  const handleDelete = id => {
    if (window.confirm('Delete this item?')) setInventory(p => p.filter(i => i.id !== id))
  }

  const handleCancel = () => {
    setEditing(null)
    setForm(empty)
  }

  const categories = ['All', ...CATEGORIES]
  const filtered = inventory.filter(item =>
    (filter === 'All' || item.category === filter) &&
    item.name?.toLowerCase().includes(search.toLowerCase())
  )

  const lowStock = inventory.filter(i => parseInt(i.quantity) < 10).length

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      {/* Form */}
      <div className="lg:col-span-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4">
            <h2 className="text-white font-extrabold text-base">{editing !== null ? '✏️ Edit Item' : '📦 Add Item'}</h2>
            <p className="text-amber-100 text-xs mt-0.5">Manage medical supplies and inventory</p>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Item Name <span className="text-red-400">*</span></label>
              <input name="name" value={form.name} onChange={set} placeholder="e.g. Paracetamol 500mg"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
              <select name="category" value={form.category} onChange={set}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quantity <span className="text-red-400">*</span></label>
                <input type="number" name="quantity" value={form.quantity} onChange={set} min="0" placeholder="0"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Unit</label>
                <select name="unit" value={form.unit} onChange={set}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all">
                  {['pcs', 'boxes', 'bottles', 'vials', 'sachets', 'strips', 'rolls', 'packs'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expiry Date</label>
              <input type="date" name="expiryDate" value={form.expiryDate} onChange={set}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
              <textarea name="notes" value={form.notes} onChange={set} rows={2}
                placeholder="Storage instructions, etc."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all resize-none" />
            </div>

            <div className="flex gap-2">
              <button onClick={handleSave} disabled={!form.name.trim() || !form.quantity}
                className={`flex-1 py-3 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all ${
                  saved ? 'bg-emerald-100 text-emerald-700' :
                  (!form.name.trim() || !form.quantity) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                  'bg-amber-500 hover:bg-amber-400 text-white shadow-sm'
                }`}>
                {saved ? '✅ Saved!' : editing !== null ? '💾 Update' : '+ Add Item'}
              </button>
              {editing !== null && (
                <button onClick={handleCancel} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-colors">Cancel</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="lg:col-span-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div>
                <h2 className="font-extrabold text-slate-700 text-base">Inventory</h2>
                <p className="text-xs text-slate-400 mt-0.5">{inventory.length} items · {lowStock > 0 && <span className="text-red-500 font-bold">{lowStock} low stock</span>}</p>
              </div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search items..."
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-44" />
            </div>
            {/* Category filters */}
            <div className="flex gap-1.5 flex-wrap">
              {categories.map(c => (
                <button key={c} onClick={() => setFilter(c)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filter === c ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-5xl mb-3">📦</div>
              <p className="text-slate-400 font-medium">No items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Item', 'Category', 'Stock', 'Expiry', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map((item, i) => {
                      const qty = parseInt(item.quantity)
                      const isLow = qty < 10
                      const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date()
                      return (
                        <motion.tr key={item.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={`border-b border-slate-50 transition-colors ${editing === item.id ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-700 text-sm">{item.name}</p>
                            {item.notes && <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{item.notes}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">{item.category}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-extrabold text-sm font-mono ${isLow ? 'text-red-600' : 'text-slate-700'}`}>
                              {item.quantity} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                            </span>
                            {isLow && <span className="block text-[9px] font-bold text-red-500 uppercase">⚠ Low</span>}
                          </td>
                          <td className="px-4 py-3">
                            {item.expiryDate ? (
                              <span className={`text-xs font-mono ${isExpired ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                {isExpired ? '⚠ ' : ''}{item.expiryDate}
                              </span>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => handleEdit(item)}
                                className="w-7 h-7 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg text-xs flex items-center justify-center transition-colors">✏️</button>
                              <button onClick={() => handleDelete(item.id)}
                                className="w-7 h-7 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-xs flex items-center justify-center transition-colors">🗑</button>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
