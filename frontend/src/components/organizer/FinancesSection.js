import React from 'react';
import { Euro, Download, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export const FinancesSection = ({ events, totalRevenue, totalParticipants, onExportCSV, onExportPDF }) => (
  <div>
    <div className="flex justify-end gap-2 mb-4">
      <Select defaultValue="all" onValueChange={() => {}}>
        <SelectTrigger className="w-52"><SelectValue placeholder="Tous les événements" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les événements</SelectItem>
          {events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="outline" className="gap-2" onClick={() => onExportCSV('all')} data-testid="finance-export-csv"><Download className="w-4 h-4" /> CSV</Button>
      <Button className="bg-brand hover:bg-brand/90 text-white gap-2" onClick={() => onExportPDF('all')} data-testid="finance-export-pdf"><FileText className="w-4 h-4" /> PDF</Button>
    </div>
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-white border border-slate-200 p-5">
        <p className="text-xs font-heading uppercase text-slate-500 mb-1">Total revenus</p>
        <p className="text-3xl font-heading font-extrabold text-slate-800">{totalRevenue.toFixed(2)}€</p>
      </div>
      <div className="bg-white border border-slate-200 p-5">
        <p className="text-xs font-heading uppercase text-slate-500 mb-1">Participants payés</p>
        <p className="text-3xl font-heading font-extrabold text-blue-700">{totalParticipants}</p>
      </div>
      <div className="bg-asphalt text-white p-5 border-l-4 border-brand">
        <p className="text-xs font-heading uppercase text-slate-400 mb-1">Votre revenu net</p>
        <p className="text-3xl font-heading font-extrabold text-brand">{totalRevenue.toFixed(2)}€</p>
      </div>
    </div>
    <div className="bg-white border border-slate-200">
      <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase">Détail par événement</h3></div>
      <div className="divide-y">
        {events.map(evt => (
          <div key={evt.event_id} className="p-4 flex items-center justify-between hover:bg-slate-50">
            <div>
              <h4 className="font-heading font-bold text-sm">{evt.title}</h4>
              <p className="text-xs text-slate-500">{evt.current_participants} participant(s) — {evt.price}€/inscription</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-heading font-bold text-lg">{(evt.current_participants * evt.price).toFixed(2)}€</span>
              <Button variant="outline" size="sm" onClick={() => onExportCSV(evt.event_id)}><Download className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        ))}
        {events.length === 0 && <div className="p-8 text-center text-slate-400">Aucun événement</div>}
      </div>
    </div>
  </div>
);
