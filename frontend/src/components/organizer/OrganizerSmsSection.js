import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send } from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../services/api';
import { toast } from 'sonner';

const OrganizerSmsSection = ({ events }) => {
  const [selectedEvent, setSelectedEvent] = React.useState('');
  const [smsMessage, setSmsMessage] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [history, setHistory] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      try { const res = await api.get('/sms/history'); setHistory(res.data.history || []); } catch { /* ignore */ }
    })();
  }, []);

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

  return (
    <div className="space-y-6" data-testid="sms-section">
      <div className="bg-white border border-slate-200 p-4" data-testid="sms-compose">
        <h3 className="font-heading font-bold text-sm uppercase mb-3">Envoyer un SMS</h3>
        <select className="w-full border border-slate-200 rounded p-2 text-sm mb-3" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} data-testid="sms-event-select">
          <option value="">Choisir un evenement...</option>
          {events.map(e => <option key={e.event_id} value={e.event_id}>{e.title}</option>)}
        </select>
        <textarea className="w-full border border-slate-200 rounded p-3 text-sm resize-none mb-2" rows={3} placeholder="Votre message SMS..." value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} maxLength={500} data-testid="sms-message-input" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{smsMessage.length}/500</span>
          <Button className="bg-brand text-white gap-1 font-heading font-bold text-xs" onClick={handleSend} disabled={!selectedEvent || !smsMessage.trim() || sending} data-testid="sms-send-btn">
            <Send className="w-3.5 h-3.5" /> {sending ? 'Envoi...' : 'Envoyer'}
          </Button>
        </div>
      </div>
      {history.length > 0 && (
        <div className="bg-white border border-slate-200" data-testid="sms-history">
          <div className="p-4 border-b"><h3 className="font-heading font-bold text-sm uppercase">Historique SMS</h3></div>
          <div className="divide-y">
            {history.map(sms => (
              <div key={sms.sms_id} className="p-3" data-testid={`sms-row-${sms.sms_id}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${sms.status === 'sent' ? 'bg-green-100 text-green-700' : sms.status === 'queued' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'}`}>
                    {sms.status === 'sent' ? 'Envoye' : sms.status === 'queued' ? 'En attente' : sms.status}
                  </span>
                  <span className="text-[10px] text-slate-400">{sms.created_at && format(new Date(sms.created_at), 'd MMM yyyy HH:mm', { locale: fr })}</span>
                </div>
                <p className="text-sm text-slate-700">{sms.message}</p>
                <p className="text-xs text-slate-400 mt-1">{sms.recipient_count} destinataire(s) / {sms.total_participants} participants</p>
                {sms.note && <p className="text-xs text-orange-500 mt-1">{sms.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerSmsSection;
