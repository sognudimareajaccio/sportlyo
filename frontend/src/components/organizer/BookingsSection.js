import React from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Edit, Trash2, Loader2, Building2, Link2, Copy
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { toast } from 'sonner';

export const BookingsSection = ({
  events, bookings, bookingsLoading, bookingSearch, onSearchChange,
  showBookingDialog, setShowBookingDialog, editingBooking, setEditingBooking,
  bookingForm, setBookingForm, onSave, onDelete, generatePaymentLink
}) => (
  <div className="space-y-6" data-testid="bookings-section">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-heading text-2xl font-bold uppercase">Reservation Entreprises</h2>
        <p className="text-sm text-slate-500">Gerez les reservations d'equipes et tarifs entreprise</p>
      </div>
      <Button className="btn-primary gap-2" onClick={() => { setEditingBooking(null); setBookingForm({ company_name: '', contact_name: '', email: '', phone: '', team_count: 1, members_per_team: 5, event_id: '', price_per_team: '', notes: '' }); setShowBookingDialog(true); }} data-testid="add-booking-btn"><Plus className="w-4 h-4" /> Nouvelle reservation</Button>
    </div>

    <div className="flex gap-3 items-center">
      <Input placeholder="Rechercher une entreprise..." value={bookingSearch} onChange={(e) => onSearchChange(e.target.value)} className="max-w-xs" data-testid="booking-search" />
    </div>

    {bookingsLoading ? (
      <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
    ) : bookings.filter(b => !bookingSearch || b.company_name?.toLowerCase().includes(bookingSearch.toLowerCase())).length > 0 ? (
      <div className="space-y-3">
        {bookings.filter(b => !bookingSearch || b.company_name?.toLowerCase().includes(bookingSearch.toLowerCase())).map(b => (
          <motion.div key={b.booking_id} className="bg-white border border-slate-200 p-4 hover:border-brand transition-colors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} data-testid={`booking-${b.booking_id}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="font-heading font-bold text-base">{b.company_name}</h4>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${b.payment_status === 'paid' ? 'bg-green-100 text-green-700' : b.payment_status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{b.payment_status === 'paid' ? 'Paye' : b.payment_status === 'pending' ? 'En attente' : 'Non facture'}</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-cyan-100 text-cyan-700">{b.team_count} equipe{b.team_count > 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  <div><p className="text-[10px] text-slate-400 uppercase font-heading">Contact</p><p className="text-xs font-medium">{b.contact_name || '—'}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-heading">Email</p><p className="text-xs font-medium">{b.email || '—'}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-heading">Membres/equipe</p><p className="text-xs font-medium">{b.members_per_team || '—'}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-heading">Prix/equipe</p><p className="text-xs font-heading font-bold">{b.price_per_team}€</p></div>
                </div>
                {b.notes && <p className="text-xs text-slate-400 mt-2 italic">{b.notes}</p>}
              </div>
              <div className="flex flex-col items-end gap-2 ml-3">
                <p className="font-heading font-black text-xl text-brand">{b.total_amount?.toFixed(0)}€</p>
                <div className="flex gap-1">
                  {!b.payment_link && b.total_amount > 0 && (
                    <Button variant="outline" size="sm" className="h-8 text-green-600 border-green-200 hover:bg-green-50 gap-1 text-[10px]" onClick={() => generatePaymentLink('booking', b.booking_id, b.total_amount, `Reservation entreprise ${b.company_name}`)} data-testid={`pay-link-booking-${b.booking_id}`}><Link2 className="w-3 h-3" /> Lien paiement</Button>
                  )}
                  {b.payment_link && (
                    <Button variant="outline" size="sm" className="h-8 text-green-600 border-green-200 gap-1 text-[10px]" onClick={() => { navigator.clipboard.writeText(b.payment_link); toast.success('Lien copie !'); }} data-testid={`copy-link-booking-${b.booking_id}`}><Copy className="w-3 h-3" /> Copier lien</Button>
                  )}
                  <Button variant="outline" size="sm" className="h-8" onClick={() => { setEditingBooking(b); setBookingForm({ company_name: b.company_name, contact_name: b.contact_name, email: b.email, phone: b.phone, team_count: b.team_count, members_per_team: b.members_per_team, event_id: b.event_id, price_per_team: b.price_per_team, notes: b.notes }); setShowBookingDialog(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button variant="outline" size="sm" className="h-8 text-red-500" onClick={() => onDelete(b.booking_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    ) : (
      <div className="bg-white border border-slate-200 p-12 text-center">
        <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-200" />
        <h3 className="font-heading font-bold text-lg uppercase mb-2">Aucune reservation entreprise</h3>
        <p className="text-slate-500 mb-4">Proposez des tarifs preferentiels aux equipes et entreprises</p>
        <Button className="btn-primary gap-2" onClick={() => { setEditingBooking(null); setBookingForm({ company_name: '', contact_name: '', email: '', phone: '', team_count: 1, members_per_team: 5, event_id: '', price_per_team: '', notes: '' }); setShowBookingDialog(true); }}><Plus className="w-4 h-4" /> Ajouter</Button>
      </div>
    )}

    <Dialog open={showBookingDialog} onOpenChange={(open) => { setShowBookingDialog(open); if (!open) setEditingBooking(null); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-heading text-xl uppercase">{editingBooking ? 'Modifier la reservation' : 'Nouvelle reservation entreprise'}</DialogTitle><DialogDescription className="sr-only">Formulaire reservation entreprise</DialogDescription></DialogHeader>
        <div className="space-y-4 pt-4">
          <div><Label className="text-xs font-heading uppercase text-slate-500">Nom de l'entreprise *</Label><Input value={bookingForm.company_name} onChange={(e) => setBookingForm(p => ({ ...p, company_name: e.target.value }))} data-testid="booking-company" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs font-heading uppercase text-slate-500">Contact</Label><Input value={bookingForm.contact_name} onChange={(e) => setBookingForm(p => ({ ...p, contact_name: e.target.value }))} /></div>
            <div><Label className="text-xs font-heading uppercase text-slate-500">Telephone</Label><Input value={bookingForm.phone} onChange={(e) => setBookingForm(p => ({ ...p, phone: e.target.value }))} /></div>
          </div>
          <div><Label className="text-xs font-heading uppercase text-slate-500">Email</Label><Input value={bookingForm.email} onChange={(e) => setBookingForm(p => ({ ...p, email: e.target.value }))} /></div>
          <div>
            <Label className="text-xs font-heading uppercase text-slate-500">Evenement</Label>
            <Select value={bookingForm.event_id} onValueChange={(v) => setBookingForm(p => ({ ...p, event_id: v }))}><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger><SelectContent>{events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label className="text-xs font-heading uppercase text-slate-500">Nombre d'equipes</Label><Input type="number" value={bookingForm.team_count} onChange={(e) => setBookingForm(p => ({ ...p, team_count: parseInt(e.target.value) || 1 }))} /></div>
            <div><Label className="text-xs font-heading uppercase text-slate-500">Membres/equipe</Label><Input type="number" value={bookingForm.members_per_team} onChange={(e) => setBookingForm(p => ({ ...p, members_per_team: parseInt(e.target.value) || 5 }))} /></div>
            <div><Label className="text-xs font-heading uppercase text-slate-500">Prix/equipe (€)</Label><Input type="number" step="0.01" value={bookingForm.price_per_team} onChange={(e) => setBookingForm(p => ({ ...p, price_per_team: e.target.value }))} /></div>
          </div>
          {bookingForm.price_per_team && bookingForm.team_count && (
            <div className="bg-brand/5 border border-brand/20 p-3 text-center">
              <p className="text-xs text-slate-500 uppercase font-heading">Total estime</p>
              <p className="font-heading font-black text-2xl text-brand">{(parseFloat(bookingForm.price_per_team || 0) * parseInt(bookingForm.team_count || 1)).toFixed(0)}€</p>
            </div>
          )}
          <div><Label className="text-xs font-heading uppercase text-slate-500">Notes</Label><Input value={bookingForm.notes} onChange={(e) => setBookingForm(p => ({ ...p, notes: e.target.value }))} /></div>
          <Button className="w-full bg-brand hover:bg-brand/90 text-white font-heading font-bold uppercase" onClick={onSave} data-testid="save-booking">{editingBooking ? 'Enregistrer' : 'Ajouter'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
);
