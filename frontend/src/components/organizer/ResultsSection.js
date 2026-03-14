import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Trophy, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import api from '../../services/api';

export const ResultsSection = ({ events }) => (
  <div className="space-y-4">
    {events.map(evt => (
      <div key={evt.event_id} className="bg-white border border-slate-200 p-5 flex items-center justify-between">
        <div>
          <h4 className="font-heading font-bold">{evt.title}</h4>
          <p className="text-xs text-slate-500">{evt.location} — {evt.date && format(new Date(evt.date), 'd MMM yyyy', { locale: fr })}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/results/${evt.event_id}`}>
            <Button variant="outline" size="sm" className="gap-1"><Trophy className="w-3.5 h-3.5" /> Voir resultats</Button>
          </Link>
          <Button variant="outline" size="sm" className="gap-1" onClick={async () => {
            try {
              const res = await api.get(`/timing/export/${evt.event_id}`, { responseType: 'blob' });
              const blob = new Blob([res.data], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `resultats_${evt.event_id}.csv`;
              document.body.appendChild(a); a.click(); a.remove();
              toast.success('Resultats exportes');
            } catch { toast.error('Aucun resultat disponible'); }
          }}><Download className="w-3.5 h-3.5" /> Export</Button>
        </div>
      </div>
    ))}
    {events.length === 0 && <div className="p-8 text-center text-slate-400 bg-white border border-slate-200">Aucun evenement</div>}
  </div>
);
