import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, QrCode, Search, CheckCircle, XCircle, Users, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'sonner';
import OrganizerNav from '../components/OrganizerNav';
const CheckInPage = () => {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [recentCheckins, setRecentCheckins] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventRes, statsRes] = await Promise.all([
          api.get(`/events/${eventId}`),
          api.get(`/checkin/stats/${eventId}`)
        ]);
        setEvent(eventRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error(err);
        toast.error('Erreur chargement');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  // Auto-refresh stats every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/checkin/stats/${eventId}`);
        setStats(res.data);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [eventId]);

  const handleScan = async (value) => {
    if (!value || scanning) return;
    setScanning(true);

    try {
      // Try to extract registration_id from QR code (format: SPORTSCONNECT:reg_id:bib)
      let payload = {};
      if (value.startsWith('SPORTSCONNECT:')) {
        const parts = value.split(':');
        payload = { registration_id: parts[1] };
      } else {
        // Assume it's a bib number
        payload = { bib_number: value.trim() };
      }

      const res = await api.post('/checkin/scan', payload);
      setLastResult(res.data);

      if (res.data.status === 'ok') {
        toast.success(res.data.message);
        setRecentCheckins(prev => [res.data, ...prev].slice(0, 20));
        // Refresh stats
        const statsRes = await api.get(`/checkin/stats/${eventId}`);
        setStats(statsRes.data);
      } else {
        toast.info(res.data.message);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erreur lors du scan';
      toast.error(msg);
      setLastResult({ status: 'error', message: msg });
    } finally {
      setScanning(false);
      setSearchQuery('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleScan(searchQuery);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader" />
      </div>
    );
  }

  const percentage = stats ? Math.round((stats.checked_in / Math.max(stats.total_registered, 1)) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="checkin-page">
      {/* Header */}
      <div className="bg-asphalt text-white py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/organizer" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <QrCode className="w-10 h-10 text-brand" />
            <div>
              <h1 className="font-heading text-2xl font-bold uppercase">Check-in</h1>
              <p className="text-slate-400">{event?.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation rapide */}
        <OrganizerNav eventId={eventId} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 p-5 text-center">
            <Users className="w-6 h-6 text-brand mx-auto mb-2" />
            <p className="font-heading text-3xl font-bold">{stats?.total_registered || 0}</p>
            <p className="text-sm text-slate-500">Inscrits</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="font-heading text-3xl font-bold text-green-600">{stats?.checked_in || 0}</p>
            <p className="text-sm text-slate-500">Pointés</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 text-center">
            <div className="w-6 h-6 mx-auto mb-2 flex items-center justify-center">
              <span className="font-heading text-lg font-bold text-brand">{percentage}%</span>
            </div>
            <p className="font-heading text-3xl font-bold">{stats?.remaining || 0}</p>
            <p className="text-sm text-slate-500">Restants</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 h-3 mb-8">
          <div
            className="bg-brand h-3 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Scanner Input */}
        <div className="bg-white border-2 border-brand p-6 mb-8">
          <label className="block font-heading text-sm uppercase tracking-wider text-slate-500 mb-2">
            Scanner QR code ou entrer n de dossard
          </label>
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scannez ou tapez le n de dossard..."
              className="text-lg h-14"
              autoFocus
              data-testid="checkin-scan-input"
            />
            <Button
              onClick={() => handleScan(searchQuery)}
              disabled={scanning || !searchQuery}
              className="btn-primary h-14 px-8"
              data-testid="checkin-scan-btn"
            >
              {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Last Result */}
        {lastResult && (
          <div className={`border-2 p-6 mb-8 ${
            lastResult.status === 'ok' ? 'bg-green-50 border-green-500' :
            lastResult.status === 'already_checked_in' ? 'bg-yellow-50 border-yellow-500' :
            'bg-red-50 border-red-500'
          }`} data-testid="checkin-result">
            <div className="flex items-center gap-4">
              {lastResult.status === 'ok' ? (
                <CheckCircle className="w-10 h-10 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-10 h-10 text-red-500 flex-shrink-0" />
              )}
              <div>
                <p className="font-heading text-xl font-bold">{lastResult.message}</p>
                {lastResult.registration && (
                  <p className="text-slate-600">
                    {lastResult.registration.first_name} {lastResult.registration.last_name} — Dossard {lastResult.registration.bib_number}
                    {lastResult.registration.selected_race && ` — ${lastResult.registration.selected_race}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recent Check-ins */}
        {recentCheckins.length > 0 && (
          <div className="bg-white border border-slate-200">
            <div className="p-4 border-b bg-slate-50">
              <h3 className="font-heading font-bold uppercase text-sm">Check-ins récents</h3>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {recentCheckins.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium">
                      {item.registration?.first_name} {item.registration?.last_name}
                    </span>
                  </div>
                  <span className="text-sm font-heading font-bold bg-asphalt text-white px-3 py-1">
                    {item.registration?.bib_number}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckInPage;
