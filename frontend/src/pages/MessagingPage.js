import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  MessageSquare, Send, Plus, ArrowLeft, User, Shield, Building2,
  Search, Loader2, Check, CheckCheck, Circle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'sonner';

const MessagingPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchConversations();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Poll for new messages every 5s
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetchConversations(true);
      if (selectedConvo) fetchMessages(selectedConvo.conversation_id, true);
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedConvo]);

  const fetchConversations = async (silent = false) => {
    try {
      const res = await api.get('/conversations');
      setConversations(res.data.conversations);
    } catch (err) {
      if (!silent) toast.error('Erreur lors du chargement des conversations');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchMessages = async (convoId, silent = false) => {
    try {
      const res = await api.get(`/conversations/${convoId}/messages`);
      setMessages(res.data.messages);
      if (!silent) {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (err) {
      if (!silent) toast.error('Erreur lors du chargement des messages');
    }
  };

  const selectConversation = (convo) => {
    setSelectedConvo(convo);
    fetchMessages(convo.conversation_id);
    setShowNewConvo(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConvo) return;

    setSending(true);
    try {
      await api.post(`/conversations/${selectedConvo.conversation_id}/messages`, {
        content: newMessage.trim()
      });
      setNewMessage('');
      fetchMessages(selectedConvo.conversation_id);
      fetchConversations(true);
    } catch (err) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const loadContacts = async () => {
    try {
      if (isAdmin) {
        const res = await api.get('/admin/organizers');
        setContacts(res.data.organizers);
      } else {
        const res = await api.get('/messaging/admins');
        setContacts(res.data.admins);
      }
    } catch (err) {
      toast.error('Erreur lors du chargement des contacts');
    }
  };

  const startNewConversation = async (contact) => {
    try {
      const res = await api.post('/conversations', {
        target_user_id: contact.user_id,
        subject: newSubject || (isAdmin ? `Message de l'administration` : `Question de ${user.name}`)
      });
      const convo = res.data.conversation;
      setShowNewConvo(false);
      setNewSubject('');
      setSelectedConvo(convo);
      fetchMessages(convo.conversation_id);
      fetchConversations(true);
    } catch (err) {
      toast.error('Erreur lors de la création de la conversation');
    }
  };

  const getOtherParticipantName = (convo) => {
    if (!convo.participant_names) return 'Inconnu';
    const otherId = convo.participants.find(p => p !== user.user_id);
    return convo.participant_names[otherId] || 'Inconnu';
  };

  const getOtherParticipantRole = (convo) => {
    if (!convo.participant_roles) return '';
    const otherId = convo.participants.find(p => p !== user.user_id);
    return convo.participant_roles[otherId] || '';
  };

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 flex" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }} data-testid="messaging-page">
      {/* Sidebar - Conversations List */}
      <div className={`w-80 border-r border-slate-200 flex flex-col ${selectedConvo ? 'hidden md:flex' : 'flex'}`} data-testid="conversations-sidebar">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-bold uppercase text-sm tracking-wider">Messages</h2>
            <Button
              size="sm"
              className="bg-brand hover:bg-brand/90 text-white h-8 gap-1"
              onClick={() => {
                setShowNewConvo(true);
                setSelectedConvo(null);
                loadContacts();
              }}
              data-testid="new-conversation-btn"
            >
              <Plus className="w-3.5 h-3.5" /> Nouveau
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-medium">Aucune conversation</p>
              <p className="text-xs mt-1">Commencez une nouvelle conversation</p>
            </div>
          ) : (
            conversations.map(convo => {
              const isSelected = selectedConvo?.conversation_id === convo.conversation_id;
              const otherRole = getOtherParticipantRole(convo);
              return (
                <div
                  key={convo.conversation_id}
                  onClick={() => selectConversation(convo)}
                  className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${
                    isSelected ? 'bg-brand/5 border-l-2 border-l-brand' : ''
                  }`}
                  data-testid={`conversation-item-${convo.conversation_id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      otherRole === 'admin' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {otherRole === 'admin' ? <Shield className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-heading font-bold text-sm truncate">
                          {getOtherParticipantName(convo)}
                        </p>
                        {convo.unread_count > 0 && (
                          <span className="bg-brand text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" data-testid="unread-badge">
                            {convo.unread_count}
                          </span>
                        )}
                      </div>
                      {convo.subject && (
                        <p className="text-xs text-slate-500 font-medium truncate">{convo.subject}</p>
                      )}
                      <p className="text-xs text-slate-400 truncate mt-0.5">{convo.last_message || 'Pas de message'}</p>
                      <p className="text-[10px] text-slate-300 mt-1">
                        {convo.last_message_at && format(new Date(convo.last_message_at), 'd MMM HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {showNewConvo ? (
          /* New Conversation Panel */
          <div className="flex-1 flex flex-col" data-testid="new-conversation-panel">
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setShowNewConvo(false)} className="md:hidden">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-heading font-bold uppercase text-sm">
                {isAdmin ? 'Contacter un organisateur' : 'Contacter l\'administration'}
              </h3>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <label className="text-xs font-heading uppercase tracking-wider text-slate-500 mb-1 block">Sujet</label>
                <Input
                  placeholder="Objet de votre message..."
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  data-testid="new-convo-subject"
                />
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="contact-search"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4">
              {filteredContacts.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  {isAdmin ? 'Aucun organisateur trouvé' : 'Aucun administrateur trouvé'}
                </p>
              ) : (
                filteredContacts.map(contact => (
                  <motion.div
                    key={contact.user_id}
                    className="flex items-center gap-3 p-3 border border-slate-100 mb-2 cursor-pointer hover:border-brand/30 hover:bg-brand/5 transition-all"
                    onClick={() => startNewConversation(contact)}
                    whileHover={{ x: 4 }}
                    data-testid={`contact-${contact.user_id}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-heading font-bold text-sm">{contact.name}</p>
                      <p className="text-xs text-slate-400">{contact.email}</p>
                      {contact.company_name && (
                        <p className="text-xs text-brand">{contact.company_name}</p>
                      )}
                    </div>
                    <MessageSquare className="w-4 h-4 text-slate-300" />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        ) : selectedConvo ? (
          /* Chat View */
          <div className="flex-1 flex flex-col" data-testid="chat-view">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedConvo(null)}
                className="md:hidden"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                getOtherParticipantRole(selectedConvo) === 'admin' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {getOtherParticipantRole(selectedConvo) === 'admin' ? <Shield className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
              </div>
              <div>
                <p className="font-heading font-bold text-sm">{getOtherParticipantName(selectedConvo)}</p>
                {selectedConvo.subject && (
                  <p className="text-xs text-slate-400">{selectedConvo.subject}</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                  <p className="text-sm">Aucun message encore</p>
                  <p className="text-xs mt-1">Envoyez le premier message</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMine = msg.sender_id === user.user_id;
                  return (
                    <motion.div
                      key={msg.message_id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className={`max-w-[70%] ${
                        isMine
                          ? 'bg-brand text-white'
                          : 'bg-white border border-slate-200 text-slate-800'
                      } p-3 shadow-sm`} data-testid={`message-${msg.message_id}`}>
                        {!isMine && (
                          <p className={`text-[10px] font-heading font-bold uppercase tracking-wider mb-1 ${
                            isMine ? 'text-white/70' : 'text-brand'
                          }`}>
                            {msg.sender_name}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-[10px] ${isMine ? 'text-white/60' : 'text-slate-400'}`}>
                            {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                          </span>
                          {isMine && (
                            msg.read ? <CheckCheck className="w-3 h-3 text-white/60" /> : <Check className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-slate-200 flex gap-2" data-testid="message-input-form">
              <Input
                placeholder="Votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
                data-testid="message-input"
              />
              <Button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="bg-brand hover:bg-brand/90 text-white gap-1"
                data-testid="send-message-btn"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center text-slate-400" data-testid="no-conversation-selected">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-200" />
              <p className="font-heading font-bold text-lg text-slate-300">Sélectionnez une conversation</p>
              <p className="text-sm mt-1">ou créez-en une nouvelle</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingPage;
