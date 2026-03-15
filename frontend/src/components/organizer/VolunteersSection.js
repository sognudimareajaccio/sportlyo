import React from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Edit, Trash2, Loader2, Search, Phone, Mail, Check, Users, X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

const defaultRoles = ['Ravitaillement', 'Signaleur', 'Accueil', 'Chronometrage', 'Securite', 'Logistique', 'Animation', 'Medical', 'Transport', 'Communication'];

export const VolunteersSection = ({
  events, volunteers, filteredVolunteers, volunteersLoading,
  volunteerEventFilter, volunteerSearch,
  onEventFilterChange, onSearchChange,
  showVolunteerDialog, setShowVolunteerDialog,
  editingVolunteer, setEditingVolunteer,
  volunteerForm, setVolunteerForm,
  volunteerSaving, onSave, onDelete, onOpenEdit, onOpenNew
}) => (
  <div>
    <div className="flex flex-wrap justify-end gap-2 mb-4">
      <Select value={volunteerEventFilter} onValueChange={onEventFilterChange}>
        <SelectTrigger className="w-52" data-testid="volunteer-event-filter"><SelectValue placeholder="Tous les evenements" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les evenements</SelectItem>
          {events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button className="btn-primary gap-2" onClick={onOpenNew} data-testid="add-volunteer-btn">
        <Plus className="w-4 h-4" /> Ajouter un benevole
      </Button>
    </div>

    <div className="bg-white border border-slate-200">
      <div className="p-4 border-b flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <Input placeholder="Rechercher par nom, prenom, fonction, telephone..." value={volunteerSearch} onChange={(e) => onSearchChange(e.target.value)} className="border-0 focus-visible:ring-0" data-testid="volunteer-search" />
        <span className="text-xs text-slate-400 whitespace-nowrap">{filteredVolunteers.length} benevole(s)</span>
      </div>

      {volunteersLoading ? (
        <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
      ) : filteredVolunteers.length === 0 ? (
        <div className="p-12 text-center">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-heading font-bold text-sm uppercase text-slate-400">Aucun benevole</p>
          <p className="text-xs text-slate-400 mt-1">Ajoutez vos benevoles pour chaque evenement</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="volunteers-table">
            <thead><tr className="bg-slate-50 text-left">
              <th className="p-3 font-heading text-xs font-bold uppercase text-slate-500">Nom</th>
              <th className="p-3 font-heading text-xs font-bold uppercase text-slate-500">Prenom</th>
              <th className="p-3 font-heading text-xs font-bold uppercase text-slate-500">Fonction</th>
              <th className="p-3 font-heading text-xs font-bold uppercase text-slate-500">Evenement</th>
              <th className="p-3 font-heading text-xs font-bold uppercase text-slate-500">Telephone</th>
              <th className="p-3 font-heading text-xs font-bold uppercase text-slate-500">Email</th>
              <th className="p-3 font-heading text-xs font-bold uppercase text-slate-500 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {filteredVolunteers.map((v, i) => {
                const evt = events.find(e => e.event_id === v.event_id);
                return (
                  <motion.tr key={v.volunteer_id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} data-testid={`volunteer-row-${v.volunteer_id}`}>
                    <td className="p-3 font-heading font-bold text-sm">{v.last_name}</td>
                    <td className="p-3 text-sm">{v.first_name}</td>
                    <td className="p-3"><span className="inline-flex items-center px-2.5 py-1 text-xs font-bold bg-brand/10 text-brand rounded">{v.role_assigned}</span></td>
                    <td className="p-3 text-sm text-slate-600">{evt?.title || v.event_id}</td>
                    <td className="p-3 text-sm"><a href={`tel:${v.phone}`} className="flex items-center gap-1 text-slate-600 hover:text-brand"><Phone className="w-3 h-3" />{v.phone}</a></td>
                    <td className="p-3 text-sm">{v.email ? <a href={`mailto:${v.email}`} className="flex items-center gap-1 text-slate-600 hover:text-brand"><Mail className="w-3 h-3" />{v.email}</a> : <span className="text-slate-300">—</span>}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => onOpenEdit(v)} data-testid={`edit-volunteer-${v.volunteer_id}`}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => onDelete(v.volunteer_id)} data-testid={`delete-volunteer-${v.volunteer_id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>

    {/* Dialog Ajout / Modification */}
    <Dialog open={showVolunteerDialog} onOpenChange={(open) => { setShowVolunteerDialog(open); if (!open) setEditingVolunteer(null); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl uppercase">{editingVolunteer ? 'Modifier le benevole' : 'Ajouter un benevole'}</DialogTitle>
          <DialogDescription className="sr-only">Formulaire benevole</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-heading uppercase text-slate-500">Nom *</Label>
              <Input placeholder="Dupont" value={volunteerForm.last_name} onChange={(e) => setVolunteerForm(p => ({ ...p, last_name: e.target.value }))} data-testid="volunteer-last-name" />
            </div>
            <div>
              <Label className="text-xs font-heading uppercase text-slate-500">Prenom *</Label>
              <Input placeholder="Marie" value={volunteerForm.first_name} onChange={(e) => setVolunteerForm(p => ({ ...p, first_name: e.target.value }))} data-testid="volunteer-first-name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-heading uppercase text-slate-500">Telephone *</Label>
              <Input placeholder="06 12 34 56 78" value={volunteerForm.phone} onChange={(e) => setVolunteerForm(p => ({ ...p, phone: e.target.value }))} data-testid="volunteer-phone" />
            </div>
            <div>
              <Label className="text-xs font-heading uppercase text-slate-500">Email</Label>
              <Input placeholder="marie@exemple.fr" value={volunteerForm.email} onChange={(e) => setVolunteerForm(p => ({ ...p, email: e.target.value }))} data-testid="volunteer-email" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-heading uppercase text-slate-500">Fonction attribuee *</Label>
            <Select value={defaultRoles.includes(volunteerForm.role_assigned) ? volunteerForm.role_assigned : '__custom__'} onValueChange={(v) => setVolunteerForm(p => ({ ...p, role_assigned: v === '__custom__' ? '' : v }))}>
              <SelectTrigger data-testid="volunteer-role-select"><SelectValue placeholder="Choisir une fonction" /></SelectTrigger>
              <SelectContent>
                {defaultRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                <SelectItem value="__custom__">Autre (personnalise)</SelectItem>
              </SelectContent>
            </Select>
            {!defaultRoles.includes(volunteerForm.role_assigned) && (
              <Input placeholder="Saisir la fonction personnalisee..." value={volunteerForm.role_assigned} onChange={(e) => setVolunteerForm(p => ({ ...p, role_assigned: e.target.value }))} className="mt-2" data-testid="volunteer-custom-role" />
            )}
          </div>
          <div>
            <Label className="text-xs font-heading uppercase text-slate-500">Evenement associe *</Label>
            <Select value={volunteerForm.event_id} onValueChange={(v) => setVolunteerForm(p => ({ ...p, event_id: v }))}>
              <SelectTrigger data-testid="volunteer-event-select"><SelectValue placeholder="Choisir un evenement" /></SelectTrigger>
              <SelectContent>
                {events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-heading uppercase text-slate-500">Notes</Label>
            <Textarea rows={2} placeholder="Informations complementaires..." value={volunteerForm.notes} onChange={(e) => setVolunteerForm(p => ({ ...p, notes: e.target.value }))} data-testid="volunteer-notes" />
          </div>
          <Button onClick={onSave} disabled={volunteerSaving} className="w-full btn-primary gap-2" data-testid="save-volunteer-btn">
            {volunteerSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {editingVolunteer ? 'Enregistrer' : 'Ajouter le benevole'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
);
