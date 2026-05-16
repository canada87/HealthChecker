import { useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import { useUser } from '../contexts/UserContext'
import type { Medication, Illness } from '../types'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'

const EMOJIS_MED = ['💊', '💉', '🩺', '🧴', '🩹', '🔴', '🟠', '⚪']
const EMOJIS_ILL = ['🤒', '🤧', '😷', '🤮', '🤕', '🫁', '🦠', '🤢']
const COLORS = ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#F44336', '#00BCD4', '#795548', '#607D8B']

interface FormState { name: string; color: string; emoji: string }
const defaultMedForm: FormState = { name: '', color: '#4CAF50', emoji: '💊' }
const defaultIllForm: FormState = { name: '', color: '#FF5722', emoji: '🤒' }

function ItemForm({ form, setForm, onSave, onCancel, emojis }: {
  form: FormState; setForm: (f: FormState) => void
  onSave: () => void; onCancel: () => void; emojis: string[]
}) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
      <input
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
        placeholder="Nome..."
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        autoFocus
      />
      <div>
        <p className="text-xs text-slate-500 mb-1.5">Emoji</p>
        <div className="flex flex-wrap gap-2">
          {emojis.map(e => (
            <button key={e} onClick={() => setForm({ ...form, emoji: e })}
              className={`text-xl w-10 h-10 rounded-lg flex items-center justify-center ${form.emoji === e ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'bg-white'}`}
            >{e}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1.5">Colore</p>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button key={c} onClick={() => setForm({ ...form, color: c })}
              className={`w-8 h-8 rounded-lg ${form.color === c ? 'ring-2 ring-offset-1 ring-indigo-400' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm flex items-center justify-center gap-1">
          <X size={16} /> Annulla
        </button>
        <button onClick={onSave} disabled={!form.name.trim()}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50">
          <Check size={16} /> Salva
        </button>
      </div>
    </div>
  )
}

export default function Settings() {
  const { currentUser } = useUser()
  const [medications, setMedications] = useState<Medication[]>([])
  const [illnesses, setIllnesses] = useState<Illness[]>([])
  const [addingMed, setAddingMed] = useState(false)
  const [addingIll, setAddingIll] = useState(false)
  const [editMed, setEditMed] = useState<Medication | null>(null)
  const [editIll, setEditIll] = useState<Illness | null>(null)
  const [medForm, setMedForm] = useState<FormState>(defaultMedForm)
  const [illForm, setIllForm] = useState<FormState>(defaultIllForm)

  const load = useCallback(async () => {
    if (!currentUser) return
    const [meds, ills] = await Promise.all([
      api.getMedications(currentUser.id),
      api.getIllnesses(currentUser.id),
    ])
    setMedications(meds)
    setIllnesses(ills)
  }, [currentUser])

  useEffect(() => { load() }, [load])

  const saveMed = async () => {
    if (!currentUser || !medForm.name.trim()) return
    if (editMed) {
      await api.updateMedication(editMed.id, medForm)
      setEditMed(null)
    } else {
      await api.createMedication(currentUser.id, medForm)
      setAddingMed(false)
    }
    setMedForm(defaultMedForm)
    load()
  }

  const saveIll = async () => {
    if (!currentUser || !illForm.name.trim()) return
    if (editIll) {
      await api.updateIllness(editIll.id, illForm)
      setEditIll(null)
    } else {
      await api.createIllness(currentUser.id, illForm)
      setAddingIll(false)
    }
    setIllForm(defaultIllForm)
    load()
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Impostazioni</h1>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-700">💊 Farmaci</h2>
          {!addingMed && !editMed && (
            <button onClick={() => { setAddingMed(true); setMedForm(defaultMedForm) }}
              className="flex items-center gap-1 text-sm text-indigo-600 font-medium">
              <Plus size={18} /> Aggiungi
            </button>
          )}
        </div>

        {(addingMed || editMed) && (
          <div className="mb-3">
            <ItemForm
              form={medForm} setForm={setMedForm}
              onSave={saveMed}
              onCancel={() => { setAddingMed(false); setEditMed(null); setMedForm(defaultMedForm) }}
              emojis={EMOJIS_MED}
            />
          </div>
        )}

        <div className="space-y-2">
          {medications.map(med => (
            <div key={med.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: med.color + '20' }}>
                {med.emoji}
              </div>
              <span className="flex-1 font-medium text-slate-700">{med.name}</span>
              <button onClick={() => { setEditMed(med); setMedForm({ name: med.name, color: med.color, emoji: med.emoji }); setAddingMed(false) }}
                className="p-2 text-slate-400 hover:text-indigo-500"><Pencil size={16} /></button>
              <button onClick={async () => { await api.deleteMedication(med.id); load() }}
                className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-700">🤒 Malattie</h2>
          {!addingIll && !editIll && (
            <button onClick={() => { setAddingIll(true); setIllForm(defaultIllForm) }}
              className="flex items-center gap-1 text-sm text-indigo-600 font-medium">
              <Plus size={18} /> Aggiungi
            </button>
          )}
        </div>

        {(addingIll || editIll) && (
          <div className="mb-3">
            <ItemForm
              form={illForm} setForm={setIllForm}
              onSave={saveIll}
              onCancel={() => { setAddingIll(false); setEditIll(null); setIllForm(defaultIllForm) }}
              emojis={EMOJIS_ILL}
            />
          </div>
        )}

        <div className="space-y-2">
          {illnesses.map(ill => (
            <div key={ill.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: ill.color + '20' }}>
                {ill.emoji}
              </div>
              <span className="flex-1 font-medium text-slate-700">{ill.name}</span>
              <button onClick={() => { setEditIll(ill); setIllForm({ name: ill.name, color: ill.color, emoji: ill.emoji }); setAddingIll(false) }}
                className="p-2 text-slate-400 hover:text-indigo-500"><Pencil size={16} /></button>
              <button onClick={async () => { await api.deleteIllness(ill.id); load() }}
                className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
