import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Facebook, Twitter, MessageSquare, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';

export const ShareSection = ({ events }) => (
  <div className="space-y-4">
    {events.map(evt => {
      const shareUrl = `${window.location.origin}/events/${evt.event_id}`;
      const shareText = `${evt.title} — Inscrivez-vous sur SportLyo !`;
      return (
        <div key={evt.event_id} className="bg-white border border-slate-200 p-6">
          <h3 className="font-heading font-bold text-lg mb-2">{evt.title}</h3>
          <p className="text-xs text-slate-500 mb-4">{evt.location} — {evt.date && format(new Date(evt.date), 'd MMM yyyy', { locale: fr })}</p>
          <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50 border border-slate-200">
            <Input value={shareUrl} readOnly className="flex-1 text-xs border-0 bg-transparent focus-visible:ring-0" />
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Lien copie !'); }}>Copier</Button>
          </div>
          <div className="flex gap-3">
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-[#1877F2] text-white flex items-center justify-center hover:opacity-80 transition-opacity"><Facebook className="w-5 h-5" /></a>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-black text-white flex items-center justify-center hover:opacity-80 transition-opacity"><Twitter className="w-5 h-5" /></a>
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-[#25D366] text-white flex items-center justify-center hover:opacity-80 transition-opacity"><MessageSquare className="w-5 h-5" /></a>
            <a href={`mailto:?subject=${encodeURIComponent(evt.title)}&body=${encodeURIComponent(shareText + '\n' + shareUrl)}`} className="w-10 h-10 bg-slate-800 text-white flex items-center justify-center hover:opacity-80 transition-opacity"><Mail className="w-5 h-5" /></a>
          </div>
        </div>
      );
    })}
    {events.length === 0 && <div className="p-8 text-center text-slate-400 bg-white border border-slate-200">Creez un evenement pour le partager</div>}
  </div>
);
