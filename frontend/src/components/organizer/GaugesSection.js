import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart3 } from 'lucide-react';

export const GaugesSection = ({ events }) => (
  <div className="bg-asphalt text-white border-l-4 border-brand">
    <div className="p-4 border-b border-white/10 flex items-center justify-between">
      <h3 className="font-heading font-bold uppercase">Temps réel</h3>
      <span className="text-xs text-slate-400">{events.length} événement(s)</span>
    </div>
    <div className="divide-y divide-white/[0.06]">
      {events.map(evt => {
        const used = evt.current_participants || 0;
        const total = evt.max_participants || 1;
        const fill = Math.round((used / total) * 100);
        const remaining = total - used;
        return (
          <div key={evt.event_id} className="p-4 hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-heading font-bold text-sm uppercase truncate">{evt.title}</h4>
                <p className="text-xs text-slate-400">{evt.location} — {evt.date && format(new Date(evt.date), 'd MMM yyyy', { locale: fr })}</p>
              </div>
              <div className="flex items-center gap-6 ml-4 flex-shrink-0">
                <div className="text-right"><span className="font-heading text-lg font-bold">{used}</span><span className="text-slate-400 text-sm"> / {total}</span></div>
                <div className="text-right w-16"><span className={`font-heading text-lg font-bold ${fill >= 90 ? 'text-red-400' : fill >= 70 ? 'text-orange-400' : 'text-emerald-400'}`}>{fill}%</span></div>
                <div className={`text-right w-24 text-sm font-medium ${remaining <= 5 ? 'text-red-400' : 'text-slate-300'}`}>{remaining} place{remaining > 1 ? 's' : ''}</div>
              </div>
            </div>
            <div className="w-full bg-white/10 h-3 rounded-sm overflow-hidden">
              <motion.div className={`h-3 ${fill >= 90 ? 'bg-red-500' : fill >= 70 ? 'bg-orange-500' : 'bg-brand'}`} initial={{ width: 0 }} animate={{ width: `${fill}%` }} transition={{ duration: 0.8 }} />
            </div>
            {evt.races && evt.races.length > 1 && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                {evt.races.map(race => {
                  const rUsed = race.current_participants || 0;
                  const rTotal = race.max_participants || 1;
                  const rFill = Math.round((rUsed / rTotal) * 100);
                  return (
                    <div key={race.name} className="text-xs">
                      <div className="flex justify-between mb-0.5"><span className="truncate font-medium text-slate-300">{race.name}</span><span className="text-slate-500 ml-1">{rUsed}/{rTotal}</span></div>
                      <div className="w-full bg-white/10 h-1.5 rounded-sm overflow-hidden"><div className={`h-1.5 ${rFill >= 90 ? 'bg-red-400' : 'bg-brand/70'}`} style={{ width: `${rFill}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {events.length === 0 && <div className="p-8 text-center text-slate-500">Aucun événement</div>}
    </div>
  </div>
);
