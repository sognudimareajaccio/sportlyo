import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export const ParticipantsSection = ({ events, participants, filteredParticipants, participantFilter, participantSearch, participantsLoading, onFilterChange, onSearchChange }) => (
  <div>
    <div className="flex justify-end mb-4">
      <Select value={participantFilter} onValueChange={onFilterChange}>
        <SelectTrigger className="w-52" data-testid="participant-event-filter"><SelectValue placeholder="Tous les événements" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les événements</SelectItem>
          {events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div className="bg-white border border-slate-200">
      <div className="p-4 border-b flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <Input placeholder="Rechercher par nom, email ou dossard..." value={participantSearch} onChange={(e) => onSearchChange(e.target.value)} className="border-0 focus-visible:ring-0" data-testid="participant-search" />
        <span className="text-xs text-slate-400 whitespace-nowrap">{filteredParticipants.length} résultat(s)</span>
      </div>
      {participantsLoading ? (
        <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 font-heading text-xs font-bold uppercase">Dossard</th>
                <th className="text-left p-3 font-heading text-xs font-bold uppercase">Participant</th>
                <th className="text-left p-3 font-heading text-xs font-bold uppercase">Événement</th>
                <th className="text-left p-3 font-heading text-xs font-bold uppercase">Course</th>
                <th className="text-left p-3 font-heading text-xs font-bold uppercase">Montant</th>
                <th className="text-left p-3 font-heading text-xs font-bold uppercase">Date</th>
                <th className="text-center p-3 font-heading text-xs font-bold uppercase">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.map(p => (
                <tr key={p.registration_id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-brand">{p.bib_number || '—'}</td>
                  <td className="p-3"><div className="font-medium">{p.user_name}</div><div className="text-xs text-slate-400">{p.email}</div></td>
                  <td className="p-3 text-slate-600">{p.event_title || p.event_id?.slice(0, 12)}</td>
                  <td className="p-3 text-slate-600">{p.selected_race || '—'}</td>
                  <td className="p-3 font-heading font-bold">{p.amount_paid || 0}€</td>
                  <td className="p-3 text-xs text-slate-500">{p.created_at && format(new Date(p.created_at), 'd MMM yyyy', { locale: fr })}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 text-xs font-bold uppercase ${p.payment_status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {p.payment_status === 'completed' ? 'Payé' : 'En attente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredParticipants.length === 0 && <div className="p-8 text-center text-slate-400">Aucun participant trouvé</div>}
        </div>
      )}
    </div>
  </div>
);
