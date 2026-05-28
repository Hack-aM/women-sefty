import { useState, useCallback } from 'react';
import { Plus, Phone, Trash2, Edit3, User, X, Check, Star, MessageCircle, AlertTriangle } from 'lucide-react';
import { useContacts } from '../hooks/useContacts';
import { validatePhone } from '../utils/helpers';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';

const AVATAR_COLORS = [
  'from-pink-500 to-rose-600',
  'from-purple-500 to-violet-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-500',
];

const getColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const relationships = ['Mother', 'Father', 'Sister', 'Brother', 'Friend', 'Husband', 'Colleague', 'Neighbor', 'Other'];

function DeleteModal({ contact, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    onClose();
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-card w-full max-w-sm p-6 rounded-3xl space-y-4 modal-slide-up">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle size={26} className="text-red-400" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-slate-100">Remove Contact?</h2>
            <p className="text-slate-400 text-sm mt-1">
              <span className="text-slate-200 font-semibold">{contact.name}</span> will no longer receive SOS alerts.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose} type="button">Cancel</Button>
          <Button variant="danger" fullWidth loading={loading} onClick={handleConfirm}>Remove</Button>
        </div>
      </div>
    </div>
  );
}

function ContactModal({ contact, onClose, onSave }) {
  const [form, setForm] = useState(contact || { name: '', phone: '', relation: 'Friend', isFavorite: false });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    else if (!validatePhone(form.phone)) errs.phone = 'Enter a valid phone number';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await onSave(form);
    setLoading(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-0 sm:pb-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-card w-full max-w-sm p-6 rounded-t-3xl sm:rounded-3xl modal-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-xl text-slate-100">
            {contact?.id ? 'Edit Contact' : 'Add Contact'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl glass-card flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input label="Full Name" placeholder="Contact name" value={form.name} onChange={set('name')} icon={User} />
            {errors.name && <p className="text-red-400 text-xs mt-1 ml-1">{errors.name}</p>}
          </div>
          <div>
            <Input label="Phone Number" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} icon={Phone} />
            {errors.phone && <p className="text-red-400 text-xs mt-1 ml-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Relationship</label>
            <select value={form.relation} onChange={set('relation')} className="input-field">
              {relationships.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Favorite toggle */}
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, isFavorite: !f.isFavorite }))}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 ${
              form.isFavorite ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/3 border border-white/5'
            }`}
          >
            <Star size={18} className={form.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-500'} />
            <span className={`text-sm font-medium ${form.isFavorite ? 'text-amber-300' : 'text-slate-400'}`}>
              {form.isFavorite ? 'Primary emergency contact' : 'Mark as primary contact'}
            </span>
          </button>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth onClick={onClose} type="button">Cancel</Button>
            <Button variant="primary" fullWidth loading={loading} type="submit">
              <Check size={16} /> Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Contacts() {
  const { contacts, loading, addNewContact, editContact, removeContact } = useContacts();
  const { currentLocation } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openAdd = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit = (c) => { setEditTarget(c); setModalOpen(true); };
  const handleSave = (form) =>
    editTarget?.id ? editContact(editTarget.id, form) : addNewContact(form);

  const handleWhatsApp = (contact) => {
    const locText = currentLocation
      ? `\n📍 My location: https://maps.google.com/?q=${currentLocation.latitude},${currentLocation.longitude}`
      : '';
    const msg = encodeURIComponent(`Hi ${contact.name}, I need help! Please check on me.${locText}`);
    const phone = contact.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  // Sort: favorites first
  const sorted = [...contacts].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));

  return (
    <div className="px-4 pt-4 pb-6 space-y-5 max-w-2xl mx-auto lg:pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-100">Emergency Contacts</h1>
          <p className="text-slate-400 text-sm mt-1">{contacts.length} contacts saved</p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus size={16} /> Add
        </Button>
      </div>

      {/* Empty state */}
      {!loading && contacts.length === 0 && (
        <div className="glass-card p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/10 flex items-center justify-center">
            <User size={32} className="text-slate-500" />
          </div>
          <div>
            <p className="text-slate-200 font-semibold text-lg">No contacts yet</p>
            <p className="text-slate-500 text-sm mt-1 leading-relaxed">
              Add trusted people who will be alerted<br />in an emergency with your location
            </p>
          </div>
          <Button onClick={openAdd} size="sm"><Plus size={16} /> Add First Contact</Button>
        </div>
      )}

      {/* Loading shimmer */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 h-20 skeleton rounded-2xl" />
          ))}
        </div>
      )}

      {/* Contact list */}
      <div className="space-y-3">
        {sorted.map((c) => (
          <div key={c.id} className="contact-card-enter">
            <GlassCard className={`flex items-center gap-4 ${c.isFavorite ? 'border-amber-500/20' : ''}`}>
              <div className="relative flex-shrink-0">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getColor(c.name)} flex items-center justify-center text-white font-bold text-lg`}>
                  {c.name?.[0]?.toUpperCase()}
                </div>
                {c.isFavorite && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                    <Star size={10} className="text-white fill-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-100 truncate">{c.name}</p>
                <p className="text-xs text-slate-500">{c.relation} · {c.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <a href={`tel:${c.phone}`}
                  className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all"
                  title="Call">
                  <Phone size={15} />
                </a>
                <button onClick={() => handleWhatsApp(c)}
                  className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/20 transition-all"
                  title="WhatsApp">
                  <MessageCircle size={15} />
                </button>
                <button onClick={() => openEdit(c)}
                  className="w-9 h-9 rounded-xl glass-card flex items-center justify-center text-slate-400 hover:text-slate-200 transition-all"
                  title="Edit">
                  <Edit3 size={15} />
                </button>
                <button onClick={() => setDeleteTarget(c)}
                  className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all"
                  title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </GlassCard>
          </div>
        ))}
      </div>

      {/* Info banner */}
      {contacts.length > 0 && (
        <GlassCard className="border-pink-500/20">
          <p className="text-xs text-slate-400 text-center leading-relaxed">
            💖 During SOS, all <span className="text-pink-400 font-semibold">{contacts.length}</span> contacts receive your live location automatically
          </p>
        </GlassCard>
      )}

      {/* Modals */}
      {modalOpen && (
        <ContactModal
          contact={editTarget}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          contact={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => removeContact(deleteTarget.id)}
        />
      )}
    </div>
  );
}
