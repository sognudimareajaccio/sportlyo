import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const ProviderMessages = ({ user, conversations, organizersList, activeChat, messages, newMsg, setNewMsg, openChat, sendMessage }) => (
  <div className="bg-white border border-slate-200 grid grid-cols-3 min-h-[500px]">
    <div className="border-r border-slate-200 overflow-y-auto">
      <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase text-sm">Organisateurs</h3></div>
      {(() => {
        const convoMap = {};
        conversations.filter(c => c.role === 'organizer').forEach(c => { convoMap[c.user_id] = c; });
        const allOrgs = organizersList.map(o => ({
          user_id: o.user_id, name: o.company_name || o.name, email: o.email,
          last_message: convoMap[o.user_id]?.last_message || '', unread: convoMap[o.user_id]?.unread || 0,
        }));
        conversations.filter(c => c.role === 'organizer' && !allOrgs.find(o => o.user_id === c.user_id)).forEach(c => {
          allOrgs.push({ user_id: c.user_id, name: c.name, email: '', last_message: c.last_message, unread: c.unread });
        });
        return allOrgs.length > 0 ? allOrgs.map(o => (
          <button key={o.user_id} onClick={() => openChat(o.user_id)} className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${activeChat === o.user_id ? 'bg-brand/5 border-l-2 border-l-brand' : ''}`} data-testid={`chat-org-${o.user_id}`}>
            <div className="flex items-center justify-between">
              <p className="font-heading font-bold text-sm truncate">{o.name}</p>
              {o.unread > 0 && <span className="bg-brand text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{o.unread}</span>}
            </div>
            <p className="text-[10px] text-slate-400 uppercase">Organisateur</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">{o.last_message || 'Aucun message — Demarrer la conversation'}</p>
          </button>
        )) : (
          <div className="p-8 text-center text-slate-400 text-sm">Aucun organisateur inscrit sur la plateforme</div>
        );
      })()}
    </div>
    <div className="col-span-2 flex flex-col">
      {activeChat ? (
        <>
          <div className="p-4 border-b bg-slate-50">
            <p className="font-heading font-bold text-sm">{organizersList.find(o => o.user_id === activeChat)?.name || conversations.find(c => c.user_id === activeChat)?.name || 'Conversation'}</p>
            <p className="text-[10px] text-slate-400 uppercase">Organisateur</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[380px]">
            {messages.length > 0 ? messages.map(m => (
              <div key={m.message_id} className={`flex ${m.sender_id === user?.user_id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] px-3 py-2 text-sm ${m.sender_id === user?.user_id ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700'}`}>
                  <p>{m.content}</p>
                  <p className={`text-[10px] mt-1 ${m.sender_id === user?.user_id ? 'text-white/60' : 'text-slate-400'}`}>{m.created_at && format(new Date(m.created_at), 'HH:mm', { locale: fr })}</p>
                </div>
              </div>
            )) : (
              <div className="text-center text-slate-400 text-xs py-8">Aucun message. Envoyez le premier message pour entamer la discussion.</div>
            )}
          </div>
          <div className="p-4 border-t flex gap-2">
            <Input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Votre message..." onKeyDown={(e) => e.key === 'Enter' && sendMessage()} className="flex-1" data-testid="provider-msg-input" />
            <Button className="bg-brand hover:bg-brand/90 text-white" onClick={sendMessage} data-testid="provider-msg-send"><Send className="w-4 h-4" /></Button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Selectionnez un organisateur pour demarrer une conversation</div>
      )}
    </div>
  </div>
);

export default ProviderMessages;
