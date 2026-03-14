import React from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Edit, Trash2, Loader2, Search, Users, Phone, Mail, MapPinned, Handshake, Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

export const PartnersSection = ({
  filteredPartners, partnersLoading, partnerFilter, partnerSearch,
  allCategories, onFilterChange, onSearchChange,
  onOpenNew, onOpenEdit, onDelete,
  showPartnerDialog, setShowPartnerDialog, editingPartner, setEditingPartner,
  partnerForm, setPartnerForm, customCategory, setCustomCategory,
  partnerSaving, onSave
}) => (
  <div>
    <div className="flex justify-end gap-2 mb-4">
      <Select value={partnerFilter} onValueChange={onFilterChange}>
        <SelectTrigger className="w-52" data-testid="partner-category-filter"><SelectValue placeholder="Toutes categories" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les categories</SelectItem>
          {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button className="btn-primary gap-2" onClick={onOpenNew} data-testid="add-partner-btn">
        <Plus className="w-4 h-4" /> Ajouter un partenaire
      </Button>
    </div>

    <div className="bg-white border border-slate-200">
      <div className="p-4 border-b flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <Input placeholder="Rechercher par nom, contact, categorie, email..." value={partnerSearch} onChange={(e) => onSearchChange(e.target.value)} className="border-0 focus-visible:ring-0" data-testid="partner-search" />
        <span className="text-xs text-slate-400 whitespace-nowrap">{filteredPartners.length} partenaire(s)</span>
      </div>
      {partnersLoading ? (
        <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
      ) : filteredPartners.length > 0 ? (
        <div className="divide-y">
          {filteredPartners.map(p => (
            <motion.div key={p.partner_id} className="p-4 hover:bg-slate-50 transition-colors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid={`partner-row-${p.partner_id}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0"><Handshake className="w-5 h-5" /></div>
                  <div>
                    <h4 className="font-heading font-bold text-base">{p.company_name}</h4>
                    <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs font-bold uppercase mt-0.5">{p.category}</span>
                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      {p.contact_name && <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-slate-400" /> {p.contact_name}</div>}
                      {p.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> <a href={`tel:${p.phone}`} className="hover:text-brand">{p.phone}</a></div>}
                      {p.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> <a href={`mailto:${p.email}`} className="hover:text-brand">{p.email}</a></div>}
                      {p.address && <div className="flex items-center gap-2"><MapPinned className="w-3.5 h-3.5 text-slate-400" /> {p.address}</div>}
                    </div>
                    {p.notes && <p className="text-xs text-slate-400 mt-2 italic">{p.notes}</p>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="outline" size="sm" className="h-8" onClick={() => onOpenEdit(p)} data-testid={`edit-partner-${p.partner_id}`}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button variant="outline" size="sm" className="h-8 text-red-500 hover:text-red-600" onClick={() => onDelete(p.partner_id)} data-testid={`delete-partner-${p.partner_id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center">
          <Handshake className="w-16 h-16 mx-auto mb-4 text-slate-200" />
          <h3 className="font-heading font-bold text-lg uppercase mb-2">Aucun partenaire</h3>
          <p className="text-slate-500 mb-4">Ajoutez vos premiers partenaires</p>
          <Button className="btn-primary gap-2" onClick={onOpenNew}><Plus className="w-4 h-4" /> Ajouter un partenaire</Button>
        </div>
      )}
    </div>

    <Dialog open={showPartnerDialog} onOpenChange={(open) => { setShowPartnerDialog(open); if (!open) { setEditingPartner(null); setCustomCategory(''); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl uppercase">{editingPartner ? 'Modifier le partenaire' : 'Nouveau partenaire'}</DialogTitle>
          <DialogDescription className="sr-only">Formulaire partenaire</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div><Label className="text-xs font-heading uppercase text-slate-500">Nom de l'entreprise *</Label><Input placeholder="Ex: ChronoPlus Lyon" value={partnerForm.company_name} onChange={(e) => setPartnerForm(p => ({ ...p, company_name: e.target.value }))} data-testid="partner-company-input" /></div>
          <div>
            <Label className="text-xs font-heading uppercase text-slate-500">Categorie *</Label>
            <Select value={partnerForm.category} onValueChange={(v) => setPartnerForm(p => ({ ...p, category: v }))}>
              <SelectTrigger data-testid="partner-category-select"><SelectValue placeholder="Choisir une categorie" /></SelectTrigger>
              <SelectContent>
                {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                <SelectItem value="__custom__">+ Nouvelle categorie...</SelectItem>
              </SelectContent>
            </Select>
            {partnerForm.category === '__custom__' && (
              <Input placeholder="Saisissez la nouvelle categorie" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="mt-2" data-testid="partner-custom-category" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs font-heading uppercase text-slate-500">Responsable</Label><Input placeholder="Jean Dupont" value={partnerForm.contact_name} onChange={(e) => setPartnerForm(p => ({ ...p, contact_name: e.target.value }))} data-testid="partner-contact-input" /></div>
            <div><Label className="text-xs font-heading uppercase text-slate-500">Telephone</Label><Input placeholder="+33 6 XX XX XX XX" value={partnerForm.phone} onChange={(e) => setPartnerForm(p => ({ ...p, phone: e.target.value }))} data-testid="partner-phone-input" /></div>
          </div>
          <div><Label className="text-xs font-heading uppercase text-slate-500">Email</Label><Input placeholder="contact@entreprise.fr" value={partnerForm.email} onChange={(e) => setPartnerForm(p => ({ ...p, email: e.target.value }))} data-testid="partner-email-input" /></div>
          <div><Label className="text-xs font-heading uppercase text-slate-500">Adresse</Label><Input placeholder="12 Rue de la Republique, 69001 Lyon" value={partnerForm.address} onChange={(e) => setPartnerForm(p => ({ ...p, address: e.target.value }))} data-testid="partner-address-input" /></div>
          <div><Label className="text-xs font-heading uppercase text-slate-500">Notes</Label><Textarea placeholder="Informations supplementaires..." rows={2} value={partnerForm.notes} onChange={(e) => setPartnerForm(p => ({ ...p, notes: e.target.value }))} data-testid="partner-notes-input" /></div>
          <Button onClick={onSave} disabled={partnerSaving} className="w-full btn-primary gap-2" data-testid="save-partner-btn">
            {partnerSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {editingPartner ? 'Enregistrer' : 'Ajouter le partenaire'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
);
