import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { QrCode, Clock, CheckCircle, Package, Loader2, Download, Search, Zap, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

export const CheckinSection = ({ events, filteredCheckin, checkinFilter, checkinSearch, checkinLoading, onFilterChange, onSearchChange, onMarkCollected }) => (
  <div>
    {/* Quick access to dedicated check-in page */}
    <a href="/checkin" className="block mb-4 bg-brand/5 border-2 border-brand/20 hover:border-brand/40 p-4 transition-colors group" data-testid="checkin-dedicated-link">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></div>
          <div>
            <p className="font-heading font-bold text-sm group-hover:text-brand transition-colors">Mode Check-in Jour J</p>
            <p className="text-xs text-slate-500">Interface optimisee pour le scan rapide des dossards le jour de l'evenement</p>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-brand" />
      </div>
    </a>

    <div className="flex justify-end gap-2 mb-4">
      <Select value={checkinFilter} onValueChange={onFilterChange}>
        <SelectTrigger className="w-52" data-testid="checkin-event-filter"><SelectValue placeholder="Tous les evenements" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les evenements</SelectItem>
          {events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="outline" className="gap-2" onClick={() => {
        const rows = filteredCheckin.map(p => `${p.bib_number || ''},${p.user_name || ''},${p.email || ''},${p.selected_race || ''},${p.tshirt_size || ''},${p.kit_collected ? 'Oui' : 'Non'}`);
        const csv = `Dossard,Nom,Email,Course,Taille,Récupéré\n${rows.join('\n')}`;
        const blob = new Blob([csv], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `checkin_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a); a.click(); a.remove(); toast.success('CSV téléchargé');
      }} data-testid="checkin-export-csv"><Download className="w-4 h-4" /> CSV</Button>
    </div>
    <div className="bg-white border border-slate-200">
      <div className="p-4 border-b flex items-center gap-3 bg-asphalt">
        <QrCode className="w-5 h-5 text-brand" />
        <Input placeholder="Scanner QR code, n° de dossard ou nom..." value={checkinSearch} onChange={(e) => onSearchChange(e.target.value)} className="border-0 bg-white/10 text-white placeholder:text-slate-400 focus-visible:ring-brand" data-testid="checkin-search" />
        <span className="text-xs text-slate-400 whitespace-nowrap">{filteredCheckin.length} inscrit(s)</span>
      </div>
      {checkinLoading ? (
        <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 font-heading text-xs font-bold uppercase">Dossard</th>
                <th className="text-left p-3 font-heading text-xs font-bold uppercase">Participant</th>
                <th className="text-left p-3 font-heading text-xs font-bold uppercase">Course</th>
                <th className="text-left p-3 font-heading text-xs font-bold uppercase">Taille T-shirt</th>
                <th className="text-left p-3 font-heading text-xs font-bold uppercase">Événement</th>
                <th className="text-center p-3 font-heading text-xs font-bold uppercase">Statut</th>
                <th className="text-center p-3 font-heading text-xs font-bold uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCheckin.map(p => (
                <tr key={p.registration_id} className={`border-b transition-colors ${p.kit_collected ? 'bg-emerald-50' : 'hover:bg-slate-50'}`} data-testid={`checkin-row-${p.registration_id}`}>
                  <td className="p-3 font-mono font-bold text-brand text-lg">{p.bib_number || '—'}</td>
                  <td className="p-3"><div className="font-medium">{p.user_name}</div><div className="text-xs text-slate-400">{p.email}</div>{p.birth_date && <div className="text-xs text-slate-400">{new Date().getFullYear() - new Date(p.birth_date).getFullYear()} ans</div>}</td>
                  <td className="p-3 font-medium">{p.selected_race || '—'}</td>
                  <td className="p-3"><span className="bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase">{p.tshirt_size || '—'}</span></td>
                  <td className="p-3 text-xs text-slate-500">{p.event_title || ''}</td>
                  <td className="p-3 text-center">
                    {p.kit_collected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase"><CheckCircle className="w-3.5 h-3.5" /> Récupéré</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold uppercase"><Clock className="w-3.5 h-3.5" /> En attente</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {!p.kit_collected && (
                      <Button size="sm" className="bg-brand hover:bg-brand/90 text-white h-8 gap-1" onClick={() => onMarkCollected(p.registration_id)} data-testid={`mark-collected-${p.registration_id}`}>
                        <Package className="w-3.5 h-3.5" /> Valider
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCheckin.length === 0 && <div className="p-8 text-center text-slate-400">Aucun inscrit trouvé</div>}
        </div>
      )}
    </div>
  </div>
);
