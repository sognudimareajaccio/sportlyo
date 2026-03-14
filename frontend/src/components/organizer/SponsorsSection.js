import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Plus, Edit, Trash2, Loader2, Search, Users, Phone, Mail, MapPinned,
  Heart, Euro, Star, Globe2, Link2, Copy, Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { toast } from 'sonner';

const tierColors = { Platine: 'bg-slate-800 text-white', Or: 'bg-yellow-500 text-white', Argent: 'bg-slate-400 text-white', Bronze: 'bg-amber-700 text-white' };

export const SponsorsSection = ({
  events, sponsors, filteredSponsors, sponsorsLoading, sponsorFilter, sponsorSearch,
  onFilterChange, onSearchChange,
  showSponsorDialog, setShowSponsorDialog, editingSponsor, setEditingSponsor,
  sponsorForm, setSponsorForm, sponsorSaving, onSave, onDelete, onOpenEdit,
  generatePaymentLink
}) => (
  <div>
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-white border border-slate-200 p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-rose-100 flex items-center justify-center"><Heart className="w-5 h-5 text-rose-500" /></div>
        <div><p className="text-2xl font-heading font-bold">{sponsors.length}</p><p className="text-xs text-slate-500 uppercase font-heading">Total</p></div>
      </div>
      <div className="bg-white border border-slate-200 p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-green-100 flex items-center justify-center"><Euro className="w-5 h-5 text-green-600" /></div>
        <div><p className="text-2xl font-heading font-bold">{sponsors.reduce((s, sp) => s + (sp.amount || 0), 0).toLocaleString()}€</p><p className="text-xs text-slate-500 uppercase font-heading">Montant total</p></div>
      </div>
      <div className="bg-white border border-slate-200 p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-amber-100 flex items-center justify-center"><Star className="w-5 h-5 text-amber-500" /></div>
        <div><p className="text-2xl font-heading font-bold">{sponsors.filter(s => s.sponsor_type === 'Donateur').length}</p><p className="text-xs text-slate-500 uppercase font-heading">Donateurs</p></div>
      </div>
    </div>

    <div className="flex justify-end gap-2 mb-4">
      <Select value={sponsorFilter} onValueChange={onFilterChange}>
        <SelectTrigger className="w-52" data-testid="sponsor-type-filter"><SelectValue placeholder="Tous les types" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="Sponsor">Sponsors</SelectItem>
          <SelectItem value="Donateur">Donateurs</SelectItem>
          <SelectItem value="Mecene">Mecenes</SelectItem>
        </SelectContent>
      </Select>
      <Button className="btn-primary gap-2" onClick={() => { setEditingSponsor(null); setSponsorForm({ name: '', sponsor_type: 'Sponsor', tier: 'Bronze', contact_name: '', phone: '', email: '', address: '', website: '', logo_url: '', amount: '', currency: 'EUR', contribution_type: 'Financier', contribution_details: '', counterparts: '', contract_start: '', contract_end: '', event_id: '', notes: '', status: 'Actif' }); setShowSponsorDialog(true); }} data-testid="add-sponsor-btn">
        <Plus className="w-4 h-4" /> Ajouter
      </Button>
    </div>

    <div className="bg-white border border-slate-200">
      <div className="p-4 border-b flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <Input placeholder="Rechercher par nom, contact, email..." value={sponsorSearch} onChange={(e) => onSearchChange(e.target.value)} className="border-0 focus-visible:ring-0" data-testid="sponsor-search" />
        <span className="text-xs text-slate-400 whitespace-nowrap">{filteredSponsors.length} resultat(s)</span>
      </div>
      {sponsorsLoading ? (
        <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
      ) : filteredSponsors.length > 0 ? (
        <div className="divide-y">
          {filteredSponsors.map(s => (
            <motion.div key={s.sponsor_id} className="p-5 hover:bg-slate-50 transition-colors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid={`sponsor-row-${s.sponsor_id}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-14 h-14 bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0">
                    {s.logo_url ? <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain p-1" /> : <Heart className="w-6 h-6 text-rose-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-heading font-bold text-base">{s.name}</h4>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${tierColors[s.tier] || 'bg-slate-200 text-slate-600'}`}>{s.tier}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${s.sponsor_type === 'Donateur' ? 'bg-pink-100 text-pink-700' : s.sponsor_type === 'Mecene' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{s.sponsor_type}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${s.status === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{s.status}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 mt-2 text-sm text-slate-600">
                      {s.contact_name && <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {s.contact_name}</div>}
                      {s.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> <a href={`tel:${s.phone}`} className="hover:text-brand">{s.phone}</a></div>}
                      {s.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> <a href={`mailto:${s.email}`} className="hover:text-brand">{s.email}</a></div>}
                      {s.address && <div className="flex items-center gap-2"><MapPinned className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {s.address}</div>}
                      {s.website && <div className="flex items-center gap-2"><Globe2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> <a href={s.website} target="_blank" rel="noopener noreferrer" className="hover:text-brand truncate">{s.website}</a></div>}
                    </div>
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-100">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div><span className="text-slate-400 font-heading uppercase block">Montant</span><span className="font-heading font-bold text-lg text-brand">{s.amount ? `${s.amount.toLocaleString()}€` : '—'}</span></div>
                        <div><span className="text-slate-400 font-heading uppercase block">Type de contribution</span><span className="font-bold">{s.contribution_type || '—'}</span></div>
                        <div><span className="text-slate-400 font-heading uppercase block">Debut contrat</span><span className="font-bold">{s.contract_start ? format(new Date(s.contract_start), 'd MMM yyyy', { locale: fr }) : '—'}</span></div>
                        <div><span className="text-slate-400 font-heading uppercase block">Fin contrat</span><span className="font-bold">{s.contract_end ? format(new Date(s.contract_end), 'd MMM yyyy', { locale: fr }) : '—'}</span></div>
                      </div>
                      {s.contribution_details && <p className="text-xs text-slate-600 mt-2"><strong>Details :</strong> {s.contribution_details}</p>}
                      {s.counterparts && <p className="text-xs text-slate-600 mt-1"><strong>Contreparties :</strong> {s.counterparts}</p>}
                    </div>
                    {s.notes && <p className="text-xs text-slate-400 mt-2 italic">{s.notes}</p>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0 ml-3">
                  {s.amount && !s.payment_link && (
                    <Button variant="outline" size="sm" className="h-8 text-green-600 border-green-200 hover:bg-green-50 gap-1 text-[10px]" onClick={() => generatePaymentLink('sponsor', s.sponsor_id, parseFloat(s.amount), `Sponsoring ${s.name}`)} data-testid={`pay-link-sponsor-${s.sponsor_id}`}><Link2 className="w-3 h-3" /> Lien paiement</Button>
                  )}
                  {s.payment_link && (
                    <Button variant="outline" size="sm" className="h-8 text-green-600 border-green-200 gap-1 text-[10px]" onClick={() => { navigator.clipboard.writeText(s.payment_link); toast.success('Lien copie !'); }} data-testid={`copy-link-sponsor-${s.sponsor_id}`}><Copy className="w-3 h-3" /> Copier lien</Button>
                  )}
                  <Button variant="outline" size="sm" className="h-8" onClick={() => onOpenEdit(s)} data-testid={`edit-sponsor-${s.sponsor_id}`}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button variant="outline" size="sm" className="h-8 text-red-500 hover:text-red-600" onClick={() => onDelete(s.sponsor_id)} data-testid={`delete-sponsor-${s.sponsor_id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center">
          <Heart className="w-16 h-16 mx-auto mb-4 text-slate-200" />
          <h3 className="font-heading font-bold text-lg uppercase mb-2">Aucun sponsor ou donateur</h3>
          <p className="text-slate-500 mb-4">Ajoutez vos sponsors et donateurs</p>
          <Button className="btn-primary gap-2" onClick={() => { setEditingSponsor(null); setSponsorForm({ name: '', sponsor_type: 'Sponsor', tier: 'Bronze', contact_name: '', phone: '', email: '', address: '', website: '', logo_url: '', amount: '', currency: 'EUR', contribution_type: 'Financier', contribution_details: '', counterparts: '', contract_start: '', contract_end: '', event_id: '', notes: '', status: 'Actif' }); setShowSponsorDialog(true); }}><Plus className="w-4 h-4" /> Ajouter</Button>
        </div>
      )}
    </div>

    <Dialog open={showSponsorDialog} onOpenChange={(open) => { setShowSponsorDialog(open); if (!open) setEditingSponsor(null); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl uppercase">{editingSponsor ? 'Modifier' : 'Nouveau sponsor / donateur'}</DialogTitle>
          <DialogDescription className="sr-only">Formulaire sponsor</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 md:col-span-2"><Label className="text-xs font-heading uppercase text-slate-500">Nom *</Label><Input placeholder="Nom de l'entreprise ou du donateur" value={sponsorForm.name} onChange={(e) => setSponsorForm(p => ({ ...p, name: e.target.value }))} data-testid="sponsor-name-input" /></div>
            <div>
              <Label className="text-xs font-heading uppercase text-slate-500">Type</Label>
              <Select value={sponsorForm.sponsor_type} onValueChange={(v) => setSponsorForm(p => ({ ...p, sponsor_type: v }))}><SelectTrigger data-testid="sponsor-type-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Sponsor">Sponsor</SelectItem><SelectItem value="Donateur">Donateur</SelectItem><SelectItem value="Mecene">Mecene</SelectItem></SelectContent></Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs font-heading uppercase text-slate-500">Niveau</Label><Select value={sponsorForm.tier} onValueChange={(v) => setSponsorForm(p => ({ ...p, tier: v }))}><SelectTrigger data-testid="sponsor-tier-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Platine">Platine</SelectItem><SelectItem value="Or">Or</SelectItem><SelectItem value="Argent">Argent</SelectItem><SelectItem value="Bronze">Bronze</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs font-heading uppercase text-slate-500">Statut</Label><Select value={sponsorForm.status} onValueChange={(v) => setSponsorForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Actif">Actif</SelectItem><SelectItem value="En discussion">En discussion</SelectItem><SelectItem value="Termine">Termine</SelectItem></SelectContent></Select></div>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-heading font-bold text-xs uppercase text-slate-500 mb-3">Contact</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-slate-500">Responsable</Label><Input value={sponsorForm.contact_name} onChange={(e) => setSponsorForm(p => ({ ...p, contact_name: e.target.value }))} data-testid="sponsor-contact-input" /></div>
              <div><Label className="text-xs text-slate-500">Telephone</Label><Input value={sponsorForm.phone} onChange={(e) => setSponsorForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label className="text-xs text-slate-500">Email</Label><Input value={sponsorForm.email} onChange={(e) => setSponsorForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label className="text-xs text-slate-500">Site web</Label><Input value={sponsorForm.website} onChange={(e) => setSponsorForm(p => ({ ...p, website: e.target.value }))} /></div>
              <div className="col-span-2"><Label className="text-xs text-slate-500">Adresse</Label><Input value={sponsorForm.address} onChange={(e) => setSponsorForm(p => ({ ...p, address: e.target.value }))} /></div>
            </div>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-heading font-bold text-xs uppercase text-slate-500 mb-3">Details du sponsoring</h4>
            <div className="grid grid-cols-3 gap-4">
              <div><Label className="text-xs text-slate-500">Montant (€)</Label><Input type="number" value={sponsorForm.amount} onChange={(e) => setSponsorForm(p => ({ ...p, amount: e.target.value }))} data-testid="sponsor-amount-input" /></div>
              <div><Label className="text-xs text-slate-500">Type contribution</Label><Select value={sponsorForm.contribution_type} onValueChange={(v) => setSponsorForm(p => ({ ...p, contribution_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Financier">Financier</SelectItem><SelectItem value="En nature">En nature</SelectItem><SelectItem value="Mixte">Mixte</SelectItem><SelectItem value="Service">Service</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs text-slate-500">Evenement lie</Label><Select value={sponsorForm.event_id} onValueChange={(v) => setSponsorForm(p => ({ ...p, event_id: v }))}><SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger><SelectContent><SelectItem value="none">Tous</SelectItem>{events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="mt-3"><Label className="text-xs text-slate-500">Details de la contribution</Label><Textarea rows={2} value={sponsorForm.contribution_details} onChange={(e) => setSponsorForm(p => ({ ...p, contribution_details: e.target.value }))} /></div>
            <div className="mt-3"><Label className="text-xs text-slate-500">Contreparties accordees</Label><Textarea rows={2} value={sponsorForm.counterparts} onChange={(e) => setSponsorForm(p => ({ ...p, counterparts: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div><Label className="text-xs text-slate-500">Debut contrat</Label><Input type="date" value={sponsorForm.contract_start} onChange={(e) => setSponsorForm(p => ({ ...p, contract_start: e.target.value }))} /></div>
              <div><Label className="text-xs text-slate-500">Fin contrat</Label><Input type="date" value={sponsorForm.contract_end} onChange={(e) => setSponsorForm(p => ({ ...p, contract_end: e.target.value }))} /></div>
            </div>
          </div>
          <div><Label className="text-xs text-slate-500">URL du logo</Label><Input value={sponsorForm.logo_url} onChange={(e) => setSponsorForm(p => ({ ...p, logo_url: e.target.value }))} /></div>
          <div><Label className="text-xs text-slate-500">Notes</Label><Textarea rows={2} value={sponsorForm.notes} onChange={(e) => setSponsorForm(p => ({ ...p, notes: e.target.value }))} /></div>
          <Button onClick={onSave} disabled={sponsorSaving} className="w-full btn-primary gap-2" data-testid="save-sponsor-btn">
            {sponsorSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {editingSponsor ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
);
