import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, CheckCircle, XCircle, User, ArrowLeft, Zap, Users, BarChart3, AlertTriangle, Undo2, MapPin, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function CheckInPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [lastCheckedIn, setLastCheckedIn] = useState(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get('/organizer/events');
        setEvents(res.data.events || []);
      } catch {}
    };
    if (user) fetchEvents();
  }, [user]);

  const fetchStats = useCallback(async (eventId) => {
    try {
      const res = await api.get(`/checkin/stats/${eventId}`);
      setStats(res.data);
    } catch {}
  }, []);

  const handleSelectEvent = (evt) => {
    setSelectedEvent(evt);
    fetchStats(evt.event_id);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !selectedEvent) return;
    try {
      const res = await api.get(`/checkin/search/${selectedEvent.event_id}?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data.results || []);
    } catch { setSearchResults([]); }
  };

  const handleCheckin = async (bibOrRegId) => {
    if (!selectedEvent) return;
    setScanning(true);
    try {
      const payload = { event_id: selectedEvent.event_id };
      if (typeof bibOrRegId === 'number' || (typeof bibOrRegId === 'string' && bibOrRegId.match(/^\d+$/))) {
        payload.bib_number = bibOrRegId;
      } else {
        payload.registration_id = bibOrRegId;
      }
      const res = await api.post('/checkin/scan', payload);
      if (res.data.status === 'success') {
        toast.success(res.data.message);
        setLastCheckedIn(res.data.registration);
      } else {
        toast.info(res.data.message);
      }
      fetchStats(selectedEvent.event_id);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur check-in');
    }
    setScanning(false);
  };

  const handleUndo = async (registrationId) => {
    try {
      await api.post('/checkin/undo', { registration_id: registrationId });
      toast.success('Check-in annule');
      setLastCheckedIn(null);
      if (selectedEvent) fetchStats(selectedEvent.event_id);
    } catch { toast.error('Erreur'); }
  };

  if (!user || !['organizer', 'admin'].includes(user.role)) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-500">Acces reserve aux organisateurs</p></div>;
  }

  const progressPct = stats ? stats.percentage : 0;
  const progressColor = progressPct >= 80 ? 'bg-green-500' : progressPct >= 50 ? 'bg-brand' : 'bg-blue-500';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-asphalt text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => selectedEvent ? setSelectedEvent(null) : navigate(-1)} className="p-1" data-testid="checkin-back-btn">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-brand" />
          <h1 className="font-heading font-bold text-lg">Check-in Jour J</h1>
        </div>
        {selectedEvent && <span className="text-xs text-slate-400 ml-auto truncate max-w-[200px]">{selectedEvent.title}</span>}
      </div>

      {!selectedEvent ? (
        /* Event Selection */
        <div className="max-w-2xl mx-auto p-4 space-y-3" data-testid="checkin-event-list">
          <h2 className="font-heading font-bold uppercase text-sm text-slate-600 mb-2">Choisir un evenement</h2>
          {events.map(evt => (
            <motion.button
              key={evt.event_id}
              className="w-full bg-white border border-slate-200 p-5 text-left hover:border-brand transition-colors group"
              onClick={() => handleSelectEvent(evt)}
              whileTap={{ scale: 0.98 }}
              data-testid={`checkin-event-${evt.event_id}`}
            >
              <p className="font-heading font-bold text-base group-hover:text-brand transition-colors">{evt.title}</p>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{evt.date && format(new Date(evt.date), 'd MMMM yyyy', { locale: fr })}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{evt.location}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{evt.current_participants || 0}/{evt.max_participants}</span>
              </div>
            </motion.button>
          ))}
          {events.length === 0 && <p className="text-slate-400 text-sm text-center py-8">Aucun evenement</p>}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* Progress bar */}
          {stats && (
            <div data-testid="checkin-stats">
              <div className="bg-white border border-slate-200 p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-heading font-bold text-sm uppercase text-slate-600">Progression</span>
                  <span className="font-heading font-black text-2xl text-brand">{stats.percentage}%</span>
                </div>
                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <motion.div
                    className={`h-full ${progressColor} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="font-heading font-black text-xl text-green-600">{stats.checked_in}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Enregistres</p>
                  </div>
                  <div>
                    <p className="font-heading font-black text-xl text-orange-600">{stats.remaining}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Restants</p>
                  </div>
                  <div>
                    <p className="font-heading font-black text-xl">{stats.total}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Total</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick bib scan - large input for mobile */}
          <div className="bg-white border-2 border-brand p-4" data-testid="checkin-scan">
            <p className="font-heading font-bold text-sm uppercase mb-2">Scanner un dossard</p>
            <div className="flex gap-2">
              <Input
                placeholder="N dossard ou nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.match(/^\d+$/)) handleCheckin(searchQuery);
                  else if (e.key === 'Enter') handleSearch();
                }}
                className="flex-1 h-12 text-lg font-heading"
                data-testid="checkin-search-input"
                autoFocus
              />
              <Button
                className="bg-brand text-white h-12 px-6"
                onClick={() => searchQuery.match(/^\d+$/) ? handleCheckin(searchQuery) : handleSearch()}
                disabled={scanning}
                data-testid="checkin-scan-btn"
              >
                {scanning ? <Zap className="w-5 h-5 animate-pulse" /> : <Search className="w-5 h-5" />}
              </Button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">Tapez un numero de dossard pour check-in direct, ou un nom pour rechercher</p>
          </div>

          {/* Last checked in */}
          <AnimatePresence>
            {lastCheckedIn && (
              <motion.div
                className="bg-green-50 border-2 border-green-400 p-4"
                initial={{ scale: 0.9, opacity: 0, y: -10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                data-testid="checkin-success"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500 flex items-center justify-center">
                      <CheckCircle className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-lg text-green-800">{lastCheckedIn.participant_name}</p>
                      <p className="text-sm text-green-600">Dossard #{lastCheckedIn.bib_number} — {lastCheckedIn.selected_race}</p>
                      {lastCheckedIn.tshirt_size && <p className="text-xs text-green-500">T-shirt : {lastCheckedIn.tshirt_size}</p>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleUndo(lastCheckedIn.registration_id)} data-testid="checkin-undo-btn">
                    <Undo2 className="w-3 h-3" /> Annuler
                  </Button>
                </div>
                {lastCheckedIn.emergency_contact && (
                  <div className="mt-2 pt-2 border-t border-green-200 text-xs text-green-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Contact urgence : {lastCheckedIn.emergency_contact} — {lastCheckedIn.emergency_phone}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="bg-white border border-slate-200" data-testid="checkin-search-results">
              <div className="p-3 border-b bg-slate-50"><p className="font-heading font-bold text-xs uppercase">Resultats ({searchResults.length})</p></div>
              <div className="divide-y">
                {searchResults.map(reg => (
                  <div key={reg.registration_id} className="p-3 flex items-center justify-between" data-testid={`checkin-result-${reg.registration_id}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 flex items-center justify-center text-white font-heading font-bold text-sm ${reg.checked_in ? 'bg-green-500' : 'bg-asphalt'}`}>
                        {reg.bib_number || '?'}
                      </div>
                      <div>
                        <p className="font-heading font-bold text-sm">{reg.participant_name}</p>
                        <p className="text-xs text-slate-500">{reg.selected_race} {reg.tshirt_size && `| T-shirt: ${reg.tshirt_size}`}</p>
                      </div>
                    </div>
                    {reg.checked_in ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-bold px-3 py-1.5 bg-green-50"><CheckCircle className="w-4 h-4" /> OK</span>
                    ) : (
                      <Button size="sm" className="bg-brand text-white text-xs h-9 px-4" onClick={() => handleCheckin(reg.registration_id)} data-testid={`checkin-btn-${reg.registration_id}`}>
                        Check-in
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participant list */}
          {stats && (
            <div className="bg-white border border-slate-200" data-testid="checkin-participant-list">
              <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
                <p className="font-heading font-bold text-xs uppercase">Tous les participants ({stats.total})</p>
                <span className="text-xs text-slate-400">{stats.checked_in} enregistre(s)</span>
              </div>
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {stats.registrations?.map(reg => (
                  <div key={reg.registration_id} className={`px-3 py-2.5 flex items-center justify-between text-sm transition-colors ${reg.checked_in ? 'bg-green-50' : 'hover:bg-slate-50'}`} data-testid={`participant-row-${reg.registration_id}`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`w-8 h-8 flex items-center justify-center text-xs font-bold text-white ${reg.checked_in ? 'bg-green-500' : 'bg-slate-400'}`}>{reg.bib_number || '?'}</span>
                      <div>
                        <span className={`font-medium ${reg.checked_in ? 'text-green-700' : ''}`}>{reg.participant_name}</span>
                        <span className="text-[10px] text-slate-400 ml-2">{reg.selected_race}</span>
                      </div>
                    </div>
                    {reg.checked_in ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <button className="text-brand text-xs font-bold hover:underline px-2 py-1" onClick={() => handleCheckin(reg.registration_id)}>
                        Enregistrer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
