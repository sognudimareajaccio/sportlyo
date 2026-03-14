import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, Loader2, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export const CorrespondancesSection = ({
  events, correspondances, corrLoading, showNewCorr, setShowNewCorr,
  corrForm, setCorrForm, corrSending, onSend
}) => (
  <div>
    <div className="flex justify-end mb-4">
      <Button className="btn-primary gap-2" onClick={() => setShowNewCorr(true)} data-testid="new-correspondance-btn">
        <Send className="w-4 h-4" /> Nouveau message
      </Button>
    </div>

    <AnimatePresence>
      {showNewCorr && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
          <div className="bg-white border border-slate-200 p-6">
            <h3 className="font-heading font-bold uppercase text-sm mb-4">Envoyer un message</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-xs font-heading uppercase text-slate-500">Evenement</Label>
                <Select value={corrForm.event_id} onValueChange={(v) => setCorrForm(p => ({ ...p, event_id: v }))}>
                  <SelectTrigger data-testid="corr-event-select"><SelectValue placeholder="Choisir un evenement" /></SelectTrigger>
                  <SelectContent>
                    {events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-heading uppercase text-slate-500">Destinataires</Label>
                <Select value={corrForm.recipient_ids} onValueChange={(v) => setCorrForm(p => ({ ...p, recipient_ids: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Tous les inscrits</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="mb-4">
              <Label className="text-xs font-heading uppercase text-slate-500">Sujet</Label>
              <Input placeholder="Ex: Informations course, recuperation dossard..." value={corrForm.subject} onChange={(e) => setCorrForm(p => ({ ...p, subject: e.target.value }))} data-testid="corr-subject" />
            </div>
            <div className="mb-4">
              <Label className="text-xs font-heading uppercase text-slate-500">Message</Label>
              <Textarea rows={5} placeholder="Votre message aux participants..." value={corrForm.message} onChange={(e) => setCorrForm(p => ({ ...p, message: e.target.value }))} data-testid="corr-message" />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={corrForm.send_email} onChange={(e) => setCorrForm(p => ({ ...p, send_email: e.target.checked }))} className="w-4 h-4 accent-brand" data-testid="corr-send-email" />
                <span className="text-sm font-medium">Envoyer aussi par email</span>
                <Mail className="w-4 h-4 text-slate-400" />
              </label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowNewCorr(false)}>Annuler</Button>
                <Button className="btn-primary gap-2" onClick={onSend} disabled={corrSending} data-testid="send-corr-btn">
                  {corrSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Envoyer
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    <div className="bg-white border border-slate-200">
      <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase text-sm">Historique des envois</h3></div>
      {corrLoading ? (
        <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
      ) : correspondances.length > 0 ? (
        <div className="divide-y">
          {correspondances.map(c => (
            <div key={c.correspondance_id} className="p-4 hover:bg-slate-50">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-heading font-bold text-sm">{c.subject || 'Sans sujet'}</h4>
                <span className="text-xs text-slate-400">{c.created_at && format(new Date(c.created_at), 'd MMM yyyy HH:mm', { locale: fr })}</span>
              </div>
              <p className="text-sm text-slate-600 line-clamp-2">{c.message}</p>
              <div className="flex gap-3 mt-2 text-xs text-slate-400">
                <span>{c.recipient_count} destinataire(s)</span>
                {c.send_email && <span className="text-brand">{c.email_sent_count} email(s) envoye(s)</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400">Aucun message envoye</div>
      )}
    </div>
  </div>
);
