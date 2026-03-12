import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowLeft, Users, Euro, TrendingUp, Download, Plus, Trash2,
  Search, QrCode, Share2, Copy, CheckCircle, Clock, Tag,
  Send, AlertCircle, Loader2, UserPlus, BarChart3, Settings, ExternalLink,
  FileText, Eye, XCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'sonner';

const OrganizerEventPage = () => {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('registrations');
  const [searchFilter, setSearchFilter] = useState('');
  const [raceFilter, setRaceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Add participant dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    first_name: '', last_name: '', email: '', gender: 'M',
    birth_date: '', selected_race: '', emergency_contact: '', emergency_phone: ''
  });

  // Promo code form
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [newPromo, setNewPromo] = useState({
    code: '', discount_type: 'percentage', discount_value: 10,
    max_uses: '', valid_until: '', event_id: ''
  });

  // Contact admin dialog
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactForm, setContactForm] = useState({ subject: '', message: '', type: 'refund', registration_id: '' });

  const fetchData = useCallback(async () => {
    try {
      const [regRes, promoRes] = await Promise.all([
        api.get(`/organizer/registrations/${eventId}`),
        api.get('/organizer/promo-codes')
      ]);
      setEvent(regRes.data.event);
      setRegistrations(regRes.data.registrations);
      setPromoCodes(promoRes.data.promo_codes.filter(p => !p.event_id || p.event_id === eventId));
    } catch (err) {
      console.error(err);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh registrations every 15s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/organizer/registrations/${eventId}`);
        setRegistrations(res.data.registrations);
        setEvent(res.data.event);
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, [eventId]);

  // ---- Filters ----
  const filteredRegistrations = registrations.filter(r => {
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const match = (r.first_name || '').toLowerCase().includes(q) ||
        (r.last_name || '').toLowerCase().includes(q) ||
        (r.user_name || '').toLowerCase().includes(q) ||
        (r.user_email || '').toLowerCase().includes(q) ||
        (r.bib_number || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (raceFilter !== 'all' && r.selected_race !== raceFilter) return false;
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && r.payment_status !== statusFilter) return false;
    return true;
  });

  // ---- Stats ----
  const confirmedRegs = registrations.filter(r => r.payment_status === 'completed' || r.payment_status === 'manual');
  const totalRevenue = registrations.reduce((sum, r) => sum + (r.base_price || 0), 0);
  const spotsUsed = event ? event.current_participants : 0;
  const spotsTotal = event ? event.max_participants : 1;
  const fillRate = Math.round((spotsUsed / spotsTotal) * 100);
  const categories = [...new Set(registrations.map(r => r.category).filter(Boolean))];
  const races = event?.races?.map(r => r.name) || [];

  // ---- Handlers ----
  const handleAddParticipant = async () => {
    if (!newParticipant.first_name || !newParticipant.last_name || !newParticipant.email) {
      toast.error('Prénom, nom et email requis');
      return;
    }
    setAddingParticipant(true);
    try {
      const res = await api.post(`/organizer/events/${eventId}/add-participant`, {
        ...newParticipant,
        selected_race: newParticipant.selected_race || null
      });
      toast.success(`${res.data.message} — Dossard: ${res.data.bib_number}`);
      setShowAddDialog(false);
      setNewParticipant({ first_name: '', last_name: '', email: '', gender: 'M', birth_date: '', selected_race: '', emergency_contact: '', emergency_phone: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    } finally {
      setAddingParticipant(false);
    }
  };

  const handleCreatePromo = async () => {
    if (!newPromo.code || !newPromo.discount_value) {
      toast.error('Code et valeur requis');
      return;
    }
    setCreatingPromo(true);
    try {
      await api.post('/promo-codes', {
        code: newPromo.code.toUpperCase(),
        discount_type: newPromo.discount_type,
        discount_value: parseFloat(newPromo.discount_value),
        max_uses: newPromo.max_uses ? parseInt(newPromo.max_uses) : null,
        valid_until: newPromo.valid_until || null,
        event_id: eventId
      });
      toast.success('Code promo créé !');
      setShowPromoDialog(false);
      setNewPromo({ code: '', discount_type: 'percentage', discount_value: 10, max_uses: '', valid_until: '', event_id: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    } finally {
      setCreatingPromo(false);
    }
  };

  const handleDeletePromo = async (promoId) => {
    try {
      await api.delete(`/organizer/promo-codes/${promoId}`);
      toast.success('Code promo supprimé');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const handleContactAdmin = async () => {
    if (!contactForm.subject || !contactForm.message) {
      toast.error('Sujet et message requis');
      return;
    }
    try {
      await api.post('/organizer/contact-admin', {
        ...contactForm,
        event_id: eventId
      });
      toast.success('Message envoyé à l\'administrateur');
      setShowContactDialog(false);
      setContactForm({ subject: '', message: '', type: 'refund', registration_id: '' });
    } catch { toast.error('Erreur envoi'); }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get(`/organizer/events/${eventId}/export-timing`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `inscrits_${eventId}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      toast.success('Export téléchargé');
    } catch { toast.error('Erreur export'); }
  };

  const handleVerifyPps = async (registrationId, action) => {
    try {
      await api.post(`/registrations/${registrationId}/verify-pps`, { action });
      toast.success(action === 'approve' ? 'PPS approuvé' : 'PPS rejeté');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/events/${eventId}` : '';
  const shareText = event ? `${event.title} — Inscriptions ouvertes !` : '';

  const handleShare = (platform) => {
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    };
    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Lien copié !');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="loader" /></div>;
  }

  if (!event) return null;

  const tabs = [
    { id: 'registrations', label: 'Inscrits', icon: Users },
    { id: 'promos', label: 'Codes Promo', icon: Tag },
    { id: 'share', label: 'Partage & Chrono', icon: Share2 },
    { id: 'contact', label: 'Contact Admin', icon: Send },
  ];

  return (
    <div className="min-h-screen bg-slate-50" data-testid="organizer-event-page">
      {/* Header */}
      <div className="bg-asphalt text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/organizer" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold uppercase">{event.title}</h1>
              <p className="text-slate-400">{event.location} — {format(new Date(event.date), 'd MMMM yyyy', { locale: fr })}</p>
            </div>
            <div className="flex gap-2">
              <Link to={`/organizer/checkin/${eventId}`}>
                <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-700 gap-2" data-testid="goto-checkin-btn">
                  <QrCode className="w-4 h-4" /> Check-in
                </Button>
              </Link>
              <Link to={`/results/${eventId}`}>
                <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-700 gap-2" data-testid="goto-results-btn">
                  <BarChart3 className="w-4 h-4" /> Résultats
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white border border-slate-200 p-5">
            <Users className="w-6 h-6 text-brand mb-2" />
            <p className="font-heading text-3xl font-bold">{spotsUsed}</p>
            <p className="text-sm text-slate-500">Inscrits</p>
          </div>
          <div className="bg-white border border-slate-200 p-5">
            <AlertCircle className="w-6 h-6 text-orange-500 mb-2" />
            <p className="font-heading text-3xl font-bold">{spotsTotal - spotsUsed}</p>
            <p className="text-sm text-slate-500">Places restantes</p>
          </div>
          <div className="bg-white border border-slate-200 p-5">
            <TrendingUp className="w-6 h-6 text-green-500 mb-2" />
            <p className="font-heading text-3xl font-bold text-green-600">{fillRate}%</p>
            <p className="text-sm text-slate-500">Taux remplissage</p>
          </div>
          <div className="bg-white border border-slate-200 p-5">
            <Euro className="w-6 h-6 text-brand mb-2" />
            <p className="font-heading text-3xl font-bold">{totalRevenue.toFixed(0)}€</p>
            <p className="text-sm text-slate-500">Revenus</p>
          </div>
          <div className="bg-white border border-slate-200 p-5">
            <CheckCircle className="w-6 h-6 text-blue-500 mb-2" />
            <p className="font-heading text-3xl font-bold">{confirmedRegs.length}</p>
            <p className="text-sm text-slate-500">Payés</p>
          </div>
        </div>

        {/* Fill Rate Gauge */}
        <div className="bg-white border border-slate-200 p-4 mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-heading font-bold uppercase text-slate-500">Jauge de remplissage</span>
            <span className="font-heading font-bold">{spotsUsed}/{spotsTotal}</span>
          </div>
          <div className="w-full bg-slate-200 h-4 rounded-sm overflow-hidden">
            <div
              className={`h-4 transition-all duration-700 ${fillRate >= 90 ? 'bg-red-500' : fillRate >= 70 ? 'bg-orange-500' : 'bg-brand'}`}
              style={{ width: `${fillRate}%` }}
            />
          </div>
          {event.races && event.races.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {event.races.map(race => {
                const rFill = Math.round(((race.current_participants || 0) / race.max_participants) * 100);
                return (
                  <div key={race.name} className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{race.name}</span>
                      <span className="text-slate-500">{race.current_participants || 0}/{race.max_participants}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-sm overflow-hidden">
                      <div className={`h-2 ${rFill >= 90 ? 'bg-red-400' : 'bg-brand'}`} style={{ width: `${rFill}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 font-heading text-sm uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: Registrations */}
        {activeTab === 'registrations' && (
          <div>
            {/* Filters + Actions */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher par nom, email, dossard..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-10"
                  data-testid="search-registrations"
                />
              </div>
              {races.length > 0 && (
                <Select value={raceFilter} onValueChange={setRaceFilter}>
                  <SelectTrigger className="w-40" data-testid="filter-race">
                    <SelectValue placeholder="Épreuve" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {races.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {categories.length > 0 && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40" data-testid="filter-category">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36" data-testid="filter-status">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="completed">Payé</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setShowAddDialog(true)} className="btn-primary gap-2" data-testid="add-participant-btn">
                <UserPlus className="w-4 h-4" /> Ajouter
              </Button>
              <Button variant="outline" onClick={handleExportCSV} className="gap-2" data-testid="export-csv-btn">
                <Download className="w-4 h-4" /> CSV
              </Button>
            </div>

            {/* Registrations Table */}
            <div className="bg-white border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="registrations-table">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-heading font-bold uppercase text-xs">Dossard</th>
                      <th className="text-left p-3 font-heading font-bold uppercase text-xs">Participant</th>
                      <th className="text-left p-3 font-heading font-bold uppercase text-xs">Email</th>
                      <th className="text-left p-3 font-heading font-bold uppercase text-xs">Épreuve</th>
                      <th className="text-left p-3 font-heading font-bold uppercase text-xs">Cat.</th>
                      <th className="text-center p-3 font-heading font-bold uppercase text-xs">Âge</th>
                      <th className="text-left p-3 font-heading font-bold uppercase text-xs">PPS</th>
                      <th className="text-left p-3 font-heading font-bold uppercase text-xs">Statut</th>
                      <th className="text-left p-3 font-heading font-bold uppercase text-xs">Check-in</th>
                      <th className="text-right p-3 font-heading font-bold uppercase text-xs">Prix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.length === 0 ? (
                      <tr><td colSpan={10} className="p-8 text-center text-slate-500">Aucun inscrit trouvé</td></tr>
                    ) : (
                      filteredRegistrations.map(reg => (
                        <tr key={reg.registration_id} className="border-b hover:bg-slate-50">
                          <td className="p-3">
                            <span className="font-heading font-bold text-sm bg-asphalt text-white px-2 py-1">{reg.bib_number}</span>
                          </td>
                          <td className="p-3">
                            <div className="font-medium">{reg.first_name} {reg.last_name}</div>
                            <div className="text-xs text-slate-400">{reg.gender === 'F' ? 'Femme' : 'Homme'}</div>
                          </td>
                          <td className="p-3 text-sm text-slate-600">{reg.user_email}</td>
                          <td className="p-3 text-sm">{reg.selected_race || '-'}</td>
                          <td className="p-3">
                            <span className="text-xs font-heading bg-slate-100 px-2 py-0.5 rounded-sm">{reg.category || '-'}</span>
                          </td>
                          <td className="p-3 text-center text-sm font-medium">
                            {reg.age ? `${reg.age} ans` : reg.birth_date ? `${Math.floor((new Date() - new Date(reg.birth_date)) / (365.25*24*60*60*1000))} ans` : '-'}
                          </td>
                          <td className="p-3">
                            {!reg.pps_document_url && !reg.pps_number ? (
                              <span className="text-xs text-slate-400">—</span>
                            ) : reg.pps_status === 'approved' ? (
                              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                <CheckCircle className="w-3 h-3" /> Vérifié
                              </span>
                            ) : reg.pps_status === 'rejected' ? (
                              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                <XCircle className="w-3 h-3" /> Rejeté
                              </span>
                            ) : reg.pps_document_url ? (
                              <div className="flex items-center gap-1">
                                <a href={reg.pps_document_url} target="_blank" rel="noopener noreferrer"
                                  className="text-brand hover:underline" title="Voir le document">
                                  <Eye className="w-4 h-4" />
                                </a>
                                <button onClick={() => handleVerifyPps(reg.registration_id, 'approve')}
                                  className="text-green-600 hover:text-green-800 p-0.5" title="Approuver" data-testid={`approve-pps-${reg.registration_id}`}>
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleVerifyPps(reg.registration_id, 'reject')}
                                  className="text-red-500 hover:text-red-700 p-0.5" title="Rejeter" data-testid={`reject-pps-${reg.registration_id}`}>
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-orange-500">En attente</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded-sm ${
                              reg.payment_status === 'completed' ? 'bg-green-100 text-green-700' :
                              reg.manual_entry ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {reg.payment_status === 'completed' ? 'Payé' : reg.manual_entry ? 'Manuel' : 'Attente'}
                            </span>
                          </td>
                          <td className="p-3">
                            {reg.checked_in ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-slate-300" />
                            )}
                          </td>
                          <td className="p-3 text-right font-heading font-bold">{(reg.base_price || 0).toFixed(0)}€</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t bg-slate-50 text-sm text-slate-500">
                {filteredRegistrations.length} inscrit(s) affiché(s) sur {registrations.length} total
              </div>
            </div>
          </div>
        )}

        {/* TAB: Promo Codes */}
        {activeTab === 'promos' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-heading text-lg font-bold uppercase">Codes Promo</h3>
              <Button onClick={() => setShowPromoDialog(true)} className="btn-primary gap-2" data-testid="create-promo-btn">
                <Plus className="w-4 h-4" /> Créer un code
              </Button>
            </div>
            {promoCodes.length === 0 ? (
              <div className="bg-white border border-slate-200 p-12 text-center">
                <Tag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-heading text-lg font-bold mb-2">Aucun code promo</h3>
                <p className="text-slate-500">Créez des codes promo pour booster vos ventes.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200">
                <table className="w-full" data-testid="promo-codes-table">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-heading font-bold uppercase text-xs">Code</th>
                      <th className="text-left p-3 font-heading font-bold uppercase text-xs">Réduction</th>
                      <th className="text-left p-3 font-heading font-bold uppercase text-xs">Utilisations</th>
                      <th className="text-left p-3 font-heading font-bold uppercase text-xs">Expire</th>
                      <th className="text-right p-3 font-heading font-bold uppercase text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoCodes.map(promo => (
                      <tr key={promo.promo_id} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-heading font-bold text-brand">{promo.code}</td>
                        <td className="p-3">
                          {promo.discount_type === 'percentage' ? `-${promo.discount_value}%` : `-${promo.discount_value}€`}
                        </td>
                        <td className="p-3 text-sm">
                          {promo.current_uses}{promo.max_uses ? ` / ${promo.max_uses}` : ' / illimité'}
                        </td>
                        <td className="p-3 text-sm text-slate-500">
                          {promo.valid_until ? format(new Date(promo.valid_until), 'd MMM yyyy', { locale: fr }) : 'Pas de limite'}
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleDeletePromo(promo.promo_id)} className="text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: Share & Timing */}
        {activeTab === 'share' && (
          <div className="space-y-8">
            {/* Social Sharing */}
            <div className="bg-white border border-slate-200 p-6">
              <h3 className="font-heading text-lg font-bold uppercase mb-4">Partager l'événement</h3>
              <p className="text-slate-600 mb-4">Partagez votre événement sur les réseaux sociaux pour attirer plus de participants.</p>
              <div className="flex items-center gap-3 mb-4">
                <Input value={shareUrl} readOnly className="flex-1 bg-slate-50" data-testid="share-url" />
                <Button variant="outline" onClick={copyLink} className="gap-2" data-testid="copy-link-btn">
                  <Copy className="w-4 h-4" /> Copier
                </Button>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => handleShare('facebook')} className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white gap-2" data-testid="share-facebook">
                  Facebook
                </Button>
                <Button onClick={() => handleShare('twitter')} className="bg-[#1DA1F2] hover:bg-[#1DA1F2]/90 text-white gap-2" data-testid="share-twitter">
                  Twitter / X
                </Button>
                <Button onClick={() => handleShare('whatsapp')} className="bg-[#25D366] hover:bg-[#25D366]/90 text-white gap-2" data-testid="share-whatsapp">
                  WhatsApp
                </Button>
                <Button onClick={() => handleShare('linkedin')} className="bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white gap-2" data-testid="share-linkedin">
                  LinkedIn
                </Button>
              </div>
            </div>

            {/* Timing Integration */}
            <div className="bg-white border border-slate-200 overflow-hidden">
              {/* Hero Banner */}
              <div className="bg-gradient-to-r from-asphalt to-slate-800 text-white p-8">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-brand flex items-center justify-center flex-shrink-0">
                    <Clock className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading text-xl font-bold uppercase mb-2">Chronométrage automatique</h3>
                    <p className="text-slate-300 text-lg leading-relaxed">
                      SportLyo se connecte directement aux logiciels de chronométrage professionnels.
                      Les temps de vos coureurs apparaissent <strong className="text-brand">en direct</strong> sur votre page résultats,
                      sans aucune saisie manuelle.
                    </p>
                  </div>
                </div>
              </div>

              {/* How it works - Simple */}
              <div className="p-8 border-b">
                <h4 className="font-heading font-bold uppercase text-sm tracking-wider text-slate-500 mb-6">Comment ça marche ?</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-brand/10 text-brand flex items-center justify-center mx-auto mb-3 text-xl font-heading font-bold">1</div>
                    <h5 className="font-heading font-bold mb-2">Vous exportez la liste</h5>
                    <p className="text-sm text-slate-600">
                      Cliquez sur "Export CSV" ci-dessous. Envoyez ce fichier à votre chronométreur.
                      Il contient les noms, dossards et puces RFID de chaque inscrit.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-brand/10 text-brand flex items-center justify-center mx-auto mb-3 text-xl font-heading font-bold">2</div>
                    <h5 className="font-heading font-bold mb-2">Vous donnez le code</h5>
                    <p className="text-sm text-slate-600">
                      Copiez le <strong>code d'intégration</strong> ci-dessous et envoyez-le à votre prestataire chronométrage.
                      Il le configure une seule fois dans son logiciel.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-brand/10 text-brand flex items-center justify-center mx-auto mb-3 text-xl font-heading font-bold">3</div>
                    <h5 className="font-heading font-bold mb-2">Les temps arrivent en direct</h5>
                    <p className="text-sm text-slate-600">
                      Le jour J, quand un coureur passe devant une borne RFID, son temps
                      s'affiche <strong>instantanément</strong> sur la page résultats de votre événement.
                    </p>
                  </div>
                </div>
              </div>

              {/* Compatible software */}
              <div className="p-8 border-b bg-slate-50">
                <h4 className="font-heading font-bold uppercase text-sm tracking-wider text-slate-500 mb-4">Logiciels compatibles</h4>
                <div className="flex flex-wrap gap-3">
                  {['RaceResult', 'Chronotrack', 'MyLaps', 'Webscorer', 'ChronoPlus', 'Wiclax'].map(name => (
                    <span key={name} className="bg-white border border-slate-200 px-4 py-2 font-heading text-sm font-bold">{name}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">Tout logiciel capable d'envoyer des requêtes HTTP (webhook) est compatible.</p>
              </div>

              {/* Step 1: Export CSV */}
              <div className="p-8 border-b">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-brand text-white flex items-center justify-center font-heading font-bold text-sm">1</div>
                  <h4 className="font-heading font-bold uppercase">Exporter la liste des inscrits</h4>
                </div>
                <p className="text-slate-600 mb-4">Ce fichier CSV contient tous les inscrits avec leurs dossards et numéros de puce RFID. Envoyez-le à votre chronométreur pour qu'il importe les données dans son logiciel.</p>
                <Button variant="outline" onClick={handleExportCSV} className="gap-2" data-testid="export-timing-csv">
                  <Download className="w-4 h-4" /> Télécharger le CSV des inscrits
                </Button>
              </div>

              {/* Step 2: Integration Code */}
              <div className="p-8 border-b">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-brand text-white flex items-center justify-center font-heading font-bold text-sm">2</div>
                  <h4 className="font-heading font-bold uppercase">Code d'intégration pour votre chronométreur</h4>
                </div>
                <p className="text-slate-600 mb-2">
                  Copiez les informations ci-dessous et envoyez-les à votre prestataire chronométrage.
                  Ce code est <strong>unique à cet événement</strong> — il change automatiquement pour chaque événement que vous créez.
                </p>
                <p className="text-sm text-brand font-medium mb-6">
                  Votre chronométreur saura exactement quoi en faire.
                </p>

                {/* Simple config block */}
                <div className="bg-asphalt text-white p-5 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-heading text-sm font-bold uppercase tracking-wider text-brand">Configuration SportLyo</span>
                    <button onClick={() => {
                      const text = `=== SPORTLYO — Configuration Chronométrage ===\n\nÉvénement : ${event.title}\nDate : ${event.date}\n\nURL endpoint : ${window.location.origin}/api/rfid-read\nMéthode : POST\nFormat : JSON\nEvent ID : ${eventId}\n\n--- Format du body JSON ---\n{\n  "chip_id": "[numéro de puce RFID]",\n  "timestamp": "[horodatage ISO8601]",\n  "checkpoint": "start" ou "finish",\n  "event_id": "${eventId}"\n}\n\n--- Import en masse ---\nURL : ${window.location.origin}/api/rfid-read/bulk\n{\n  "event_id": "${eventId}",\n  "readings": [\n    {"chip_id":"...","timestamp":"...","checkpoint":"start"},\n    {"chip_id":"...","timestamp":"...","checkpoint":"finish"}\n  ]\n}\n\nPage résultats en direct : ${window.location.origin}/results/${eventId}`;
                      navigator.clipboard.writeText(text);
                      toast.success('Configuration complète copiée !');
                    }} className="bg-brand/20 hover:bg-brand/30 text-brand px-3 py-1.5 text-xs font-heading font-bold uppercase flex items-center gap-1.5 transition-colors" data-testid="copy-full-config">
                      <Copy className="w-3.5 h-3.5" /> Tout copier
                    </button>
                  </div>
                  <div className="space-y-3 font-mono text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="text-slate-400 w-28 flex-shrink-0">Événement</span>
                      <span className="text-white font-bold">{event.title}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="text-slate-400 w-28 flex-shrink-0">URL endpoint</span>
                      <span className="text-brand">{window.location.origin}/api/rfid-read</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="text-slate-400 w-28 flex-shrink-0">Méthode</span>
                      <span className="text-green-400">POST</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="text-slate-400 w-28 flex-shrink-0">Format</span>
                      <span className="text-yellow-300">JSON</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="text-slate-400 w-28 flex-shrink-0">Event ID</span>
                      <span className="text-brand font-bold">{eventId}</span>
                    </div>
                  </div>
                </div>

                {/* JSON format */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-heading font-bold uppercase text-slate-500">Format des données</span>
                    <button onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify({ chip_id: "NUMERO_PUCE", timestamp: new Date().toISOString(), checkpoint: "start", event_id: eventId }, null, 2));
                      toast.success('Copié !');
                    }} className="text-xs text-slate-500 hover:text-brand flex items-center gap-1"><Copy className="w-3 h-3" /> Copier</button>
                  </div>
                  <pre className="bg-slate-50 border p-4 text-sm font-mono overflow-x-auto">
{JSON.stringify({
  chip_id: "NUMERO_PUCE_RFID",
  timestamp: "2026-03-15T09:00:00.000Z",
  checkpoint: "start | finish",
  event_id: eventId
}, null, 2)}
                  </pre>
                  <div className="mt-2 text-xs text-slate-500 space-y-1">
                    <p><strong>chip_id</strong> — Le numéro de la puce RFID portée par le coureur (attribuée automatiquement à l'inscription)</p>
                    <p><strong>timestamp</strong> — L'heure exacte du passage (format international ISO8601)</p>
                    <p><strong>checkpoint</strong> — <code className="bg-slate-100 px-1">"start"</code> quand le coureur part, <code className="bg-slate-100 px-1">"finish"</code> quand il arrive</p>
                    <p><strong>event_id</strong> — L'identifiant unique de votre événement (déjà rempli ci-dessus)</p>
                  </div>
                </div>
              </div>

              {/* Step 3: Advanced (collapsible) */}
              <details className="p-8 border-b">
                <summary className="flex items-center gap-3 cursor-pointer select-none">
                  <div className="w-8 h-8 bg-slate-200 text-slate-600 flex items-center justify-center font-heading font-bold text-sm">+</div>
                  <h4 className="font-heading font-bold uppercase text-slate-600">Exemples de code avancés (pour développeurs)</h4>
                </summary>
                <div className="mt-6 space-y-6">
                  {/* cURL */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-heading text-sm font-bold uppercase">cURL — Signal de départ</span>
                      <button onClick={() => {
                        const cmd = `curl -X POST ${window.location.origin}/api/rfid-read \\\n  -H "Content-Type: application/json" \\\n  -d '{"chip_id":"PUCE_123","timestamp":"${new Date().toISOString()}","checkpoint":"start","event_id":"${eventId}"}'`;
                        navigator.clipboard.writeText(cmd); toast.success('Copié !');
                      }} className="text-xs text-slate-500 hover:text-brand flex items-center gap-1" data-testid="copy-curl-start"><Copy className="w-3 h-3" /> Copier</button>
                    </div>
                    <pre className="bg-slate-900 text-green-400 p-4 text-xs overflow-x-auto font-mono rounded-sm">
{`curl -X POST ${window.location.origin}/api/rfid-read \\
  -H "Content-Type: application/json" \\
  -d '{"chip_id":"PUCE_123","timestamp":"${new Date().toISOString()}","checkpoint":"start","event_id":"${eventId}"}'`}
                    </pre>
                  </div>

                  {/* Python */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-heading text-sm font-bold uppercase">Python</span>
                      <button onClick={() => {
                        const code = `import requests\nfrom datetime import datetime, timezone\n\nAPI_URL = "${window.location.origin}/api/rfid-read"\nEVENT_ID = "${eventId}"\n\ndef send_rfid(chip_id, checkpoint="finish"):\n    response = requests.post(API_URL, json={\n        "chip_id": chip_id,\n        "timestamp": datetime.now(timezone.utc).isoformat(),\n        "checkpoint": checkpoint,\n        "event_id": EVENT_ID\n    })\n    return response.json()\n\n# Exemples\nsend_rfid("PUCE_123", "start")   # Départ\nsend_rfid("PUCE_123", "finish")  # Arrivée`;
                        navigator.clipboard.writeText(code); toast.success('Copié !');
                      }} className="text-xs text-slate-500 hover:text-brand flex items-center gap-1" data-testid="copy-python"><Copy className="w-3 h-3" /> Copier</button>
                    </div>
                    <pre className="bg-slate-900 text-blue-300 p-4 text-xs overflow-x-auto font-mono rounded-sm">
{`import requests
from datetime import datetime, timezone

API_URL = "${window.location.origin}/api/rfid-read"
EVENT_ID = "${eventId}"

def send_rfid(chip_id, checkpoint="finish"):
    response = requests.post(API_URL, json={
        "chip_id": chip_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checkpoint": checkpoint,
        "event_id": EVENT_ID
    })
    return response.json()

# Exemples
send_rfid("PUCE_123", "start")   # Départ
send_rfid("PUCE_123", "finish")  # Arrivée`}
                    </pre>
                  </div>

                  {/* Bulk */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-heading text-sm font-bold uppercase">Import en masse</span>
                      <button onClick={() => {
                        const code = `POST ${window.location.origin}/api/rfid-read/bulk\n\n${JSON.stringify({event_id: eventId, readings: [{chip_id:"PUCE_1",timestamp:"2026-03-15T09:00:00Z",checkpoint:"start"},{chip_id:"PUCE_1",timestamp:"2026-03-15T09:45:13Z",checkpoint:"finish"}]}, null, 2)}`;
                        navigator.clipboard.writeText(code); toast.success('Copié !');
                      }} className="text-xs text-slate-500 hover:text-brand flex items-center gap-1" data-testid="copy-bulk"><Copy className="w-3 h-3" /> Copier</button>
                    </div>
                    <pre className="bg-slate-900 text-yellow-300 p-4 text-xs overflow-x-auto font-mono rounded-sm">
{`POST ${window.location.origin}/api/rfid-read/bulk

{
  "event_id": "${eventId}",
  "readings": [
    {"chip_id":"PUCE_1","timestamp":"...","checkpoint":"start"},
    {"chip_id":"PUCE_1","timestamp":"...","checkpoint":"finish"},
    {"chip_id":"PUCE_2","timestamp":"...","checkpoint":"start"},
    {"chip_id":"PUCE_2","timestamp":"...","checkpoint":"finish"}
  ]
}`}
                    </pre>
                  </div>
                </div>
              </details>

              {/* Results link */}
              <div className="p-8 bg-brand/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-brand text-white flex items-center justify-center font-heading font-bold text-sm">3</div>
                  <h4 className="font-heading font-bold uppercase">Voir les résultats en direct</h4>
                </div>
                <p className="text-slate-600 mb-4">Partagez ce lien avec vos participants et spectateurs. Les classements se mettent à jour automatiquement à chaque passage de coureur.</p>
                <div className="flex items-center gap-3">
                  <Input value={`${window.location.origin}/results/${eventId}`} readOnly className="flex-1 bg-white" />
                  <Button variant="outline" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/results/${eventId}`); toast.success('Lien copié !'); }} className="gap-2">
                    <Copy className="w-4 h-4" /> Copier
                  </Button>
                  <Link to={`/results/${eventId}`}>
                    <Button className="btn-primary gap-2">
                      <ExternalLink className="w-4 h-4" /> Ouvrir
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Contact Admin */}
        {activeTab === 'contact' && (
          <div>
            <div className="bg-white border border-slate-200 p-6 max-w-2xl">
              <h3 className="font-heading text-lg font-bold uppercase mb-4">Contacter l'Administrateur</h3>
              <p className="text-slate-600 mb-6">Demande de remboursement, question technique, ou autre.</p>
              <div className="space-y-4">
                <div>
                  <Label>Type de demande</Label>
                  <Select value={contactForm.type} onValueChange={(v) => setContactForm(prev => ({ ...prev, type: v }))}>
                    <SelectTrigger data-testid="contact-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="refund">Demande de remboursement</SelectItem>
                      <SelectItem value="technical">Question technique</SelectItem>
                      <SelectItem value="general">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {contactForm.type === 'refund' && (
                  <div>
                    <Label>ID d'inscription (optionnel)</Label>
                    <Input
                      placeholder="reg_xxxx"
                      value={contactForm.registration_id}
                      onChange={(e) => setContactForm(prev => ({ ...prev, registration_id: e.target.value }))}
                      data-testid="contact-reg-id"
                    />
                  </div>
                )}
                <div>
                  <Label>Sujet *</Label>
                  <Input
                    placeholder="Objet de votre demande"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                    data-testid="contact-subject"
                  />
                </div>
                <div>
                  <Label>Message *</Label>
                  <Textarea
                    rows={4}
                    placeholder="Décrivez votre demande..."
                    value={contactForm.message}
                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    data-testid="contact-message"
                  />
                </div>
                <Button onClick={handleContactAdmin} className="btn-primary gap-2" data-testid="send-contact-btn">
                  <Send className="w-4 h-4" /> Envoyer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialog: Add Participant */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl uppercase">Ajouter un participant</DialogTitle>
            <DialogDescription>Inscription manuelle sans paiement</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prénom *</Label>
                <Input value={newParticipant.first_name} onChange={(e) => setNewParticipant(p => ({ ...p, first_name: e.target.value }))} data-testid="add-first-name" />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input value={newParticipant.last_name} onChange={(e) => setNewParticipant(p => ({ ...p, last_name: e.target.value }))} data-testid="add-last-name" />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={newParticipant.email} onChange={(e) => setNewParticipant(p => ({ ...p, email: e.target.value }))} data-testid="add-email" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sexe</Label>
                <Select value={newParticipant.gender} onValueChange={(v) => setNewParticipant(p => ({ ...p, gender: v }))}>
                  <SelectTrigger data-testid="add-gender"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Homme</SelectItem>
                    <SelectItem value="F">Femme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date de naissance</Label>
                <Input type="date" value={newParticipant.birth_date} onChange={(e) => setNewParticipant(p => ({ ...p, birth_date: e.target.value }))} data-testid="add-birth-date" />
              </div>
            </div>
            {event.races && event.races.length > 0 && (
              <div>
                <Label>Épreuve</Label>
                <Select value={newParticipant.selected_race} onValueChange={(v) => setNewParticipant(p => ({ ...p, selected_race: v }))}>
                  <SelectTrigger data-testid="add-race"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {event.races.map(r => <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleAddParticipant} disabled={addingParticipant} className="w-full btn-primary" data-testid="confirm-add-participant">
              {addingParticipant ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Ajouter le participant
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create Promo Code */}
      <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl uppercase">Nouveau Code Promo</DialogTitle>
            <DialogDescription>Boostez vos ventes avec un code de réduction</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Code *</Label>
              <Input placeholder="EX: SPRINT20" value={newPromo.code} onChange={(e) => setNewPromo(p => ({ ...p, code: e.target.value.toUpperCase() }))} data-testid="promo-code-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={newPromo.discount_type} onValueChange={(v) => setNewPromo(p => ({ ...p, discount_type: v }))}>
                  <SelectTrigger data-testid="promo-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixed">Montant fixe (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valeur *</Label>
                <Input type="number" value={newPromo.discount_value} onChange={(e) => setNewPromo(p => ({ ...p, discount_value: e.target.value }))} data-testid="promo-value" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Utilisations max</Label>
                <Input type="number" placeholder="Illimité" value={newPromo.max_uses} onChange={(e) => setNewPromo(p => ({ ...p, max_uses: e.target.value }))} data-testid="promo-max-uses" />
              </div>
              <div>
                <Label>Date d'expiration</Label>
                <Input type="date" value={newPromo.valid_until} onChange={(e) => setNewPromo(p => ({ ...p, valid_until: e.target.value }))} data-testid="promo-expiry" />
              </div>
            </div>
            <Button onClick={handleCreatePromo} disabled={creatingPromo} className="w-full btn-primary" data-testid="confirm-create-promo">
              {creatingPromo ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Tag className="w-4 h-4 mr-2" />}
              Créer le code promo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizerEventPage;
