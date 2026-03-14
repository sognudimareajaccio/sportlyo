import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, FileText, Users, AlertTriangle, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import api from '../../services/api';
import { toast } from 'sonner';

const OrganizerSmsSection = ({ events }) => {
  const [selectedEvent, setSelectedEvent] = React.useState('');
  const [smsMessage, setSmsMessage] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [history, setHistory] = React.useState([]);
  const [templates, setTemplates] = React.useState([]);
  const [recipientCount, setRecipientCount] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      try { const res = await api.get('/sms/history'); setHistory(res.data.history || []); } catch {}
      try { const res = await api.get('/sms/templates'); setTemplates(res.data.templates || []); } catch {}
    })();
  }, []);

  React.useEffect(() => {
    if (!selectedEvent) { setRecipientCount(null); return; }
    (async () => {
      try {
        const res = await api.get(`/sms/recipients-count/${selectedEvent}`);
        setRecipientCount(res.data);
      } catch { setRecipientCount(null); }
    })();
  }, [selectedEvent]);

  const handleSend = async () => {
    if (!selectedEvent || !smsMessage.trim()) return;
    setSending(true);
    try {
      const res = await api.post('/sms/send', { event_id: selectedEvent, message: smsMessage, recipients: 'all' });
      setHistory(prev => [res.data.sms, ...prev]);
      setSmsMessage('');
      toast.success(res.data.message);
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    setSending(false);
  };

  const applyTemplate = (templateId) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    const eventName = events.find(e => e.event_id === selectedEvent)?.title || 'votre evenement';
    setSmsMessage(tpl.message.replace(/{event}/g, eventName));
  };

  return (
    <div className="space-y-6" data-testid="sms-section">
      {/* Twilio status banner */}
      <div className="bg-amber-50 border border-amber-200 p-4 flex items-start gap-3" data-testid="sms-twilio-notice">
        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-heading font-bold text-sm text-amber-800">Twilio non configure</p>
          <p className="text-xs text-amber-600 mt-1">Les SMS seront stockes en file d'attente et envoyes une fois Twilio configure. Contactez l'administrateur pour activer l'envoi reel.</p>
          <p className="text-xs text-amber-500 mt-1">Variables requises : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER</p>
        </div>
      </div>

      {/* Compose */}
      <div className="bg-white border border-slate-200 p-5" data-testid="sms-compose">
        <h3 className="font-heading font-bold text-sm uppercase mb-4">Composer un SMS</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-heading uppercase text-slate-500 mb-1 block">Evenement *</label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger data-testid="sms-event-select"><SelectValue placeholder="Choisir un evenement..." /></SelectTrigger>
              <SelectContent>
                {events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-heading uppercase text-slate-500 mb-1 block">Modele rapide</label>
            <Select onValueChange={applyTemplate}>
              <SelectTrigger data-testid="sms-template-select"><SelectValue placeholder="Choisir un modele..." /></SelectTrigger>
              <SelectContent>
                {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {recipientCount && (
          <div className="flex items-center gap-2 mb-3 text-xs">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600">{recipientCount.total} participant(s), <strong className="text-brand">{recipientCount.with_phone}</strong> avec numero de telephone</span>
          </div>
        )}

        <textarea
          className="w-full border border-slate-200 rounded p-3 text-sm resize-none mb-2 focus:ring-1 focus:ring-brand focus:border-brand outline-none"
          rows={4}
          placeholder="Votre message SMS..."
          value={smsMessage}
          onChange={(e) => setSmsMessage(e.target.value)}
          maxLength={500}
          data-testid="sms-message-input"
        />
        <div className="flex items-center justify-between">
          <span className={`text-xs ${smsMessage.length > 160 ? 'text-orange-500' : 'text-slate-400'}`}>
            {smsMessage.length}/500 {smsMessage.length > 160 ? `(${Math.ceil(smsMessage.length / 160)} SMS)` : ''}
          </span>
          <Button
            className="bg-brand text-white gap-2 font-heading font-bold text-xs"
            onClick={handleSend}
            disabled={!selectedEvent || !smsMessage.trim() || sending}
            data-testid="sms-send-btn"
          >
            <Send className="w-3.5 h-3.5" /> {sending ? 'Envoi...' : 'Envoyer le SMS'}
          </Button>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white border border-slate-200" data-testid="sms-history">
          <div className="p-4 border-b"><h3 className="font-heading font-bold text-sm uppercase">Historique des envois ({history.length})</h3></div>
          <div className="divide-y">
            {history.map(sms => (
              <div key={sms.sms_id} className="p-4" data-testid={`sms-row-${sms.sms_id}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${sms.status === 'sent' ? 'bg-green-100 text-green-700' : sms.status === 'queued' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'}`}>
                    {sms.status === 'sent' ? 'Envoye' : sms.status === 'queued' ? 'En file d\'attente' : sms.status}
                  </span>
                  <span className="text-[10px] text-slate-400">{sms.created_at && format(new Date(sms.created_at), 'd MMM yyyy HH:mm', { locale: fr })}</span>
                </div>
                <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">{sms.message}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-slate-400"><Users className="w-3 h-3 inline mr-1" />{sms.recipient_count} destinataire(s)</span>
                  {sms.sent_count > 0 && <span className="text-xs text-green-600">{sms.sent_count} envoye(s)</span>}
                  {sms.failed_count > 0 && <span className="text-xs text-red-600">{sms.failed_count} echec(s)</span>}
                </div>
                {sms.note && <p className="text-xs text-orange-500 mt-1 italic">{sms.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerSmsSection;
