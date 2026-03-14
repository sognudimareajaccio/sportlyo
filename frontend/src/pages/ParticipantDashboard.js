import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  User, Calendar, Trophy, TrendingUp, ShoppingBag, MessageSquare,
  ChevronRight, ArrowLeft, Home, MapPin, Clock, Upload, CheckCircle,
  XCircle, ExternalLink, FileText, Loader2, Send, Package, Edit,
  Footprints, Mountain, Euro, BarChart3, Save
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import { registrationsApi, recommendationsApi } from '../services/api';
import api from '../services/api';
import { toast } from 'sonner';
import NotificationBell from '../components/NotificationBell';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = ['#ff4500', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const SectionHeader = ({ title, onBack }) => (
  <div className="flex items-center gap-3 mb-6">
    <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-asphalt text-white font-heading text-xs uppercase tracking-wider hover:bg-asphalt/80 transition-colors" data-testid="back-to-hub-btn">
      <ArrowLeft className="w-4 h-4" /> Retour au tableau de bord
    </button>
    <h2 className="font-heading text-2xl font-bold uppercase">{title}</h2>
  </div>
);

const ParticipantDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'provider') navigate('/provider', { replace: true });
    else if (user?.role === 'organizer') navigate('/organizer', { replace: true });
    else if (user?.role === 'admin') navigate('/admin', { replace: true });
  }, [user, navigate]);

  const [activeSection, setActiveSection] = useState('hub');
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState([]);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [results, setResults] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPps, setUploadingPps] = useState(null);
  // Messaging
  const [providers, setProviders] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');

  const fetchInitialData = async () => {
    try {
      const [regsRes, invRes] = await Promise.all([
        registrationsApi.getAll(),
        api.get('/invoices')
      ]);
      setRegistrations(regsRes.data.registrations);
      setInvoices(invRes.data.invoices || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInitialData(); }, []);

  const handleSectionChange = (section) => {
    setActiveSection(section);
    if (section === 'profile') fetchProfile();
    if (section === 'inscriptions') fetchInitialData();
    if (section === 'upcoming') fetchUpcoming();
    if (section === 'results') fetchResults();
    if (section === 'bilan') fetchStats();
    if (section === 'orders') fetchOrders();
    if (section === 'messaging') fetchProviders();
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/participant/profile');
      setProfile(res.data.profile);
      setProfileForm(res.data.profile);
    } catch { toast.error('Erreur chargement profil'); }
  };

  const fetchUpcoming = async () => {
    try {
      const res = await api.get('/participant/upcoming');
      setUpcoming(res.data.upcoming || []);
    } catch { toast.error('Erreur chargement'); }
  };

  const fetchResults = async () => {
    try {
      const res = await api.get('/participant/results');
      setResults(res.data.results || []);
    } catch { toast.error('Erreur chargement résultats'); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/participant/stats');
      setStats(res.data);
    } catch { toast.error('Erreur chargement stats'); }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get('/participant/orders');
      setOrders(res.data.orders || []);
    } catch { toast.error('Erreur chargement commandes'); }
  };

  const fetchProviders = async () => {
    try {
      const res = await api.get('/participant/providers');
      setProviders(res.data.providers || []);
    } catch { console.error('Erreur providers'); }
  };

  const openChat = async (providerId) => {
    setActiveChat(providerId);
    try {
      const res = await api.get(`/provider/messages/${providerId}`);
      setMessages(res.data.messages || []);
    } catch { toast.error('Erreur chargement messages'); }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeChat) return;
    try {
      await api.post('/provider/messages', { recipient_id: activeChat, content: newMsg });
      setNewMsg('');
      const res = await api.get(`/provider/messages/${activeChat}`);
      setMessages(res.data.messages || []);
    } catch { toast.error('Erreur envoi'); }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await api.put('/participant/profile', profileForm);
      setProfile(res.data.profile);
      setEditingProfile(false);
      toast.success('Profil mis à jour');
    } catch { toast.error('Erreur sauvegarde'); }
    finally { setSavingProfile(false); }
  };

  const handlePpsUpload = async (registrationId, file) => {
    if (!file) return;
    setUploadingPps(registrationId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/registrations/${registrationId}/upload-pps`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('PPS téléchargé !');
      fetchInitialData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setUploadingPps(null); }
  };

  const upcomingRegistrations = registrations.filter(r => r.event && new Date(r.event.date) > new Date());
  const pastRegistrations = registrations.filter(r => r.event && new Date(r.event.date) <= new Date());

  const hubItems = [
    { id: 'profile', label: 'Mon Profil', icon: User, desc: 'Coordonnées & informations', color: 'bg-blue-500' },
    { id: 'inscriptions', label: 'Mes Inscriptions', icon: FileText, desc: `${registrations.length} inscription(s)`, color: 'bg-emerald-500' },
    { id: 'upcoming', label: 'Courses à venir', icon: Calendar, desc: `${upcomingRegistrations.length} à venir`, color: 'bg-orange-500' },
    { id: 'results', label: 'Mes Résultats', icon: Trophy, desc: 'Stats par événement', color: 'bg-purple-500' },
    { id: 'bilan', label: 'Bilan Sportif', icon: TrendingUp, desc: 'Statistiques annuelles', color: 'bg-teal-600' },
    { id: 'orders', label: 'Mes Commandes', icon: ShoppingBag, desc: 'Boutique & achats', color: 'bg-violet-500' },
    { id: 'messaging', label: 'Messagerie', icon: MessageSquare, desc: 'Contact prestataires', color: 'bg-pink-500' },
  ];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="loader" /></div>;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="participant-dashboard">
      {/* Header */}
      <div className="bg-asphalt text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {activeSection !== 'hub' && (
                <button onClick={() => setActiveSection('hub')} className="p-2 hover:bg-white/10 transition-colors" data-testid="back-to-hub">
                  <Home className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-3">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full border-2 border-brand" />
                ) : (
                  <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="font-heading text-2xl font-bold">Bonjour, {user?.name?.split(' ')[0]} !</h1>
                  <p className="text-slate-400 text-sm">
                    {activeSection === 'hub' ? 'Votre espace sportif personnel' : hubItems.find(h => h.id === activeSection)?.label || ''}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell onNavigate={handleSectionChange} />
              <Link to="/events">
                <Button className="btn-primary gap-2" data-testid="explore-events-btn">
                  <Calendar className="w-4 h-4" /> Explorer les événements
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ===== HUB ===== */}
        {activeSection === 'hub' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Inscriptions', value: registrations.length, icon: FileText },
                { label: 'À venir', value: upcomingRegistrations.length, icon: Calendar },
                { label: 'Terminées', value: pastRegistrations.length, icon: Trophy },
                { label: 'Cette année', value: registrations.filter(r => { try { return new Date(r.created_at).getFullYear() === new Date().getFullYear(); } catch { return false; } }).length, icon: TrendingUp },
              ].map((s, i) => (
                <div key={i} className="bg-white border border-slate-200 p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand/10 flex items-center justify-center flex-shrink-0">
                    <s.icon className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <p className="text-2xl font-heading font-bold">{s.value}</p>
                    <p className="text-xs text-slate-500 font-heading uppercase tracking-wider">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="participant-hub-grid">
              {hubItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.button key={item.id} onClick={() => handleSectionChange(item.id)}
                    className="relative bg-white border border-slate-200 p-6 text-left hover:border-brand hover:shadow-lg transition-all group"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }} whileHover={{ y: -4, transition: { duration: 0.15 } }}
                    data-testid={`hub-btn-${item.id}`}>
                    <div className={`w-12 h-12 ${item.color} flex items-center justify-center mb-4`}><Icon className="w-6 h-6 text-white" /></div>
                    <h3 className="font-heading font-bold text-base uppercase tracking-wide mb-1">{item.label}</h3>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand absolute top-6 right-6 transition-colors" />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ===== MON PROFIL ===== */}
        {activeSection === 'profile' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Mon Profil" onBack={() => setActiveSection('hub')} />
            {profile ? (
              <div className="bg-white border border-slate-200 p-6" data-testid="profile-section">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {user?.picture ? (
                      <img src={user.picture} alt={user.name} className="w-20 h-20 rounded-full border-2 border-brand" />
                    ) : (
                      <div className="w-20 h-20 bg-brand rounded-full flex items-center justify-center">
                        <User className="w-10 h-10 text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-heading font-bold text-xl">{profile.name}</h3>
                      <p className="text-sm text-slate-500">{profile.email}</p>
                      <p className="text-xs text-slate-400 mt-1">Inscrit depuis {profile.created_at && format(new Date(profile.created_at), 'MMMM yyyy', { locale: fr })}</p>
                    </div>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={() => { setEditingProfile(!editingProfile); setProfileForm({ ...profile }); }} data-testid="edit-profile-btn">
                    <Edit className="w-4 h-4" /> {editingProfile ? 'Annuler' : 'Modifier'}
                  </Button>
                </div>

                {editingProfile ? (
                  <div className="space-y-4 border-t pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-xs font-heading uppercase text-slate-500">Nom complet</Label><Input value={profileForm.name || ''} onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))} data-testid="profile-name-input" /></div>
                      <div><Label className="text-xs font-heading uppercase text-slate-500">Téléphone</Label><Input value={profileForm.phone || ''} onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))} data-testid="profile-phone-input" /></div>
                      <div><Label className="text-xs font-heading uppercase text-slate-500">Date de naissance</Label><Input type="date" value={profileForm.birth_date || ''} onChange={(e) => setProfileForm(p => ({ ...p, birth_date: e.target.value }))} /></div>
                      <div><Label className="text-xs font-heading uppercase text-slate-500">Genre</Label>
                        <Select value={profileForm.gender || 'M'} onValueChange={(v) => setProfileForm(p => ({ ...p, gender: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Homme</SelectItem>
                            <SelectItem value="F">Femme</SelectItem>
                            <SelectItem value="X">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs font-heading uppercase text-slate-500">Ville</Label><Input value={profileForm.city || ''} onChange={(e) => setProfileForm(p => ({ ...p, city: e.target.value }))} /></div>
                      <div><Label className="text-xs font-heading uppercase text-slate-500">Code postal</Label><Input value={profileForm.postal_code || ''} onChange={(e) => setProfileForm(p => ({ ...p, postal_code: e.target.value }))} /></div>
                      <div><Label className="text-xs font-heading uppercase text-slate-500">Club sportif</Label><Input value={profileForm.club_name || ''} onChange={(e) => setProfileForm(p => ({ ...p, club_name: e.target.value }))} /></div>
                      <div><Label className="text-xs font-heading uppercase text-slate-500">Pays</Label><Input value={profileForm.country || ''} onChange={(e) => setProfileForm(p => ({ ...p, country: e.target.value }))} /></div>
                    </div>
                    <div className="border-t pt-4">
                      <h4 className="font-heading font-bold text-xs uppercase text-slate-500 mb-3">Contact d'urgence</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label className="text-xs text-slate-500">Nom</Label><Input value={profileForm.emergency_contact || ''} onChange={(e) => setProfileForm(p => ({ ...p, emergency_contact: e.target.value }))} /></div>
                        <div><Label className="text-xs text-slate-500">Téléphone</Label><Input value={profileForm.emergency_phone || ''} onChange={(e) => setProfileForm(p => ({ ...p, emergency_phone: e.target.value }))} /></div>
                      </div>
                    </div>
                    <Button onClick={saveProfile} disabled={savingProfile} className="btn-primary gap-2" data-testid="save-profile-btn">
                      {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 border-t pt-6">
                    {[
                      { label: 'Téléphone', value: profile.phone || '—' },
                      { label: 'Date de naissance', value: profile.birth_date || '—' },
                      { label: 'Genre', value: profile.gender === 'M' ? 'Homme' : profile.gender === 'F' ? 'Femme' : profile.gender || '—' },
                      { label: 'Ville', value: profile.city || '—' },
                      { label: 'Club', value: profile.club_name || '—' },
                      { label: 'PPS', value: profile.pps_number || 'Non renseigné' },
                    ].map((f, i) => (
                      <div key={i}>
                        <p className="text-[10px] font-heading uppercase tracking-wider text-slate-400 mb-1">{f.label}</p>
                        <p className="font-medium text-sm">{f.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
            )}
          </motion.div>
        )}

        {/* ===== MES INSCRIPTIONS ===== */}
        {activeSection === 'inscriptions' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Mes Inscriptions" onBack={() => setActiveSection('hub')} />
            {registrations.length > 0 ? (
              <div className="bg-white border border-slate-200">
                <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase text-sm">{registrations.length} inscription(s)</h3></div>
                <div className="divide-y">
                  {registrations.map(reg => (
                    <div key={reg.registration_id} className="p-4 hover:bg-slate-50 transition-colors" data-testid={`reg-row-${reg.registration_id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="bg-brand text-white px-3 py-2 text-center min-w-[56px]">
                            <div className="font-heading font-bold text-lg leading-none">{reg.bib_number || '—'}</div>
                            <div className="text-[9px] uppercase tracking-wider opacity-80">Dossard</div>
                          </div>
                          <div>
                            <h4 className="font-heading font-bold text-sm">{reg.event?.title || 'Événement'}</h4>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                              {reg.event?.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(reg.event.date), 'd MMM yyyy', { locale: fr })}</span>}
                              {reg.event?.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{reg.event.location}</span>}
                            </div>
                            {reg.selected_race && <p className="text-xs text-brand font-bold mt-1">{reg.selected_race}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-heading font-bold text-lg">{reg.amount_paid || 0}€</p>
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase ${reg.payment_status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {reg.payment_status === 'completed' ? 'Payé' : 'En attente'}
                          </span>
                        </div>
                      </div>
                      {/* PPS section */}
                      {reg.event?.requires_pps && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          {reg.pps_status === 'approved' ? (
                            <div className="flex items-center gap-2 text-green-600 text-sm"><CheckCircle className="w-4 h-4" /><span className="font-medium">PPS vérifié</span></div>
                          ) : reg.pps_status === 'rejected' ? (
                            <div>
                              <div className="flex items-center gap-2 text-red-600 text-sm mb-2"><XCircle className="w-4 h-4" /><span className="font-medium">PPS rejeté</span></div>
                              <label className="cursor-pointer"><input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => handlePpsUpload(reg.registration_id, e.target.files[0])} />
                                <Button variant="outline" size="sm" className="gap-2 text-red-600 border-red-200" asChild><span><Upload className="w-3 h-3" /> Renvoyer</span></Button>
                              </label>
                            </div>
                          ) : reg.pps_document_url ? (
                            <div className="flex items-center gap-2 text-orange-600 text-sm"><Clock className="w-4 h-4" /><span className="font-medium">PPS en vérification</span></div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <a href="https://pps.athle.fr/?locale=fr" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-brand hover:underline"><ExternalLink className="w-3 h-3" /> Acheter un PPS</a>
                              <label className="cursor-pointer"><input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => handlePpsUpload(reg.registration_id, e.target.files[0])} />
                                <Button variant="outline" size="sm" className="gap-2" disabled={uploadingPps === reg.registration_id} asChild>
                                  <span>{uploadingPps === reg.registration_id ? <><Clock className="w-3 h-3 animate-spin" /> Envoi...</> : <><Upload className="w-3 h-3" /> Télécharger PPS</>}</span>
                                </Button>
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 p-12 text-center">
                <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="font-heading font-bold text-lg uppercase mb-2">Aucune inscription</h3>
                <p className="text-slate-500 mb-6">Découvrez les événements disponibles</p>
                <Link to="/events"><Button className="btn-primary">Explorer les événements</Button></Link>
              </div>
            )}

            {/* Invoices */}
            {invoices.length > 0 && (
              <div className="mt-6">
                <h3 className="font-heading font-bold uppercase text-sm mb-3">Mes factures</h3>
                <div className="space-y-2">
                  {invoices.map(inv => (
                    <div key={inv.invoice_id} className="bg-white border border-slate-200 p-4 flex items-center justify-between" data-testid={`invoice-${inv.invoice_id}`}>
                      <div className="flex items-center gap-4">
                        <FileText className="w-5 h-5 text-brand" />
                        <div>
                          <p className="font-heading font-bold text-sm">{inv.invoice_number}</p>
                          <p className="text-xs text-slate-500">{inv.source_type === 'order' ? 'Commande boutique' : 'Inscription'} — {inv.created_at && format(new Date(inv.created_at), 'd MMM yyyy', { locale: fr })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-heading font-bold text-lg">{inv.total?.toFixed(2)}€</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-green-100 text-green-700">Payée</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ===== COURSES À VENIR ===== */}
        {activeSection === 'upcoming' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Courses à venir" onBack={() => setActiveSection('hub')} />
            {upcoming.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcoming.map((reg, idx) => (
                  <motion.div key={reg.registration_id} className="bg-white border border-slate-200 overflow-hidden group hover:border-brand transition-colors"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: idx * 0.05 }}
                    data-testid={`upcoming-card-${reg.registration_id}`}>
                    <div className="relative h-36 overflow-hidden">
                      <img src={reg.event?.image_url || 'https://images.unsplash.com/photo-1766970096430-204f27f6e247?w=800'} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3 bg-white text-asphalt px-2.5 py-1 text-center">
                        <div className="font-heading font-bold text-lg leading-none">{reg.event?.date && format(new Date(reg.event.date), 'd')}</div>
                        <div className="font-heading text-[10px] uppercase tracking-wider">{reg.event?.date && format(new Date(reg.event.date), 'MMM', { locale: fr })}</div>
                      </div>
                      <div className="absolute top-3 right-3 bg-brand text-white px-2 py-0.5 text-xs font-bold">
                        #{reg.bib_number}
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-heading font-bold text-base mb-1 line-clamp-1">{reg.event?.title}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" />{reg.event?.location}</p>
                      {reg.selected_race && <p className="text-xs text-brand font-bold">{reg.selected_race}</p>}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          {reg.event?.date && (() => {
                            const days = Math.ceil((new Date(reg.event.date) - new Date()) / (1000 * 60 * 60 * 24));
                            return days > 0 ? `J-${days}` : "Aujourd'hui";
                          })()}
                        </span>
                        <Link to={`/events/${reg.event_id}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs">Voir</Button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 p-12 text-center">
                <Calendar className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="font-heading font-bold text-lg uppercase mb-2">Aucune course à venir</h3>
                <p className="text-slate-500 mb-6">Inscrivez-vous à un événement !</p>
                <Link to="/events"><Button className="btn-primary">Explorer les événements</Button></Link>
              </div>
            )}
          </motion.div>
        )}

        {/* ===== MES RÉSULTATS ===== */}
        {activeSection === 'results' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Mes Résultats" onBack={() => setActiveSection('hub')} />
            {results.length > 0 ? (
              <div className="space-y-4">
                {results.map(reg => (
                  <div key={reg.registration_id} className="bg-white border border-slate-200 p-5" data-testid={`result-row-${reg.registration_id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-asphalt text-white flex flex-col items-center justify-center flex-shrink-0">
                          <Trophy className="w-5 h-5 text-brand mb-0.5" />
                          <span className="text-[9px] font-heading uppercase">Finisher</span>
                        </div>
                        <div>
                          <h4 className="font-heading font-bold text-sm">{reg.event?.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            {reg.event?.date && <span>{format(new Date(reg.event.date), 'd MMMM yyyy', { locale: fr })}</span>}
                            {reg.event?.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{reg.event.location}</span>}
                          </div>
                          {reg.selected_race && <p className="text-xs text-brand font-bold mt-1">{reg.selected_race}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        {reg.race_duration_seconds ? (
                          <div>
                            <p className="text-[10px] font-heading uppercase text-slate-400">Temps</p>
                            <p className="font-heading font-bold text-lg">{Math.floor(reg.race_duration_seconds / 3600)}h{String(Math.floor((reg.race_duration_seconds % 3600) / 60)).padStart(2, '0')}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Pas de temps enregistré</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 p-12 text-center">
                <Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="font-heading font-bold text-lg uppercase mb-2">Aucun résultat</h3>
                <p className="text-slate-500">Vos résultats apparaîtront après vos premières courses</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ===== BILAN SPORTIF ===== */}
        {activeSection === 'bilan' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Bilan Sportif Annuel" onBack={() => setActiveSection('hub')} />
            {stats ? (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: `Courses ${stats.year}`, value: stats.year_races, icon: Calendar, color: 'text-blue-500' },
                    { label: 'Km parcourus', value: `${stats.total_km}`, icon: Footprints, color: 'text-emerald-500' },
                    { label: 'Dénivelé total', value: `${stats.total_elevation}m`, icon: Mountain, color: 'text-orange-500' },
                    { label: 'Total inscriptions', value: stats.all_time_races, icon: Trophy, color: 'text-purple-500' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white border border-slate-200 p-4" data-testid={`stat-card-${i}`}>
                      <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                      <p className="text-2xl font-heading font-bold">{s.value}</p>
                      <p className="text-[10px] text-slate-500 font-heading uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly chart */}
                  <div className="bg-white border border-slate-200 p-6">
                    <h3 className="font-heading font-bold uppercase text-sm mb-4">Courses par mois ({stats.year})</h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.entries(stats.monthly_registrations).map(([m, v]) => ({
                          month: ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][parseInt(m) - 1],
                          courses: v
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={{ fontFamily: 'var(--font-heading)', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 0 }} />
                          <Bar dataKey="courses" fill="#ff4500" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Sports breakdown */}
                  <div className="bg-white border border-slate-200 p-6">
                    <h3 className="font-heading font-bold uppercase text-sm mb-4">Répartition par sport</h3>
                    <div className="h-56 flex items-center">
                      {Object.keys(stats.sports_breakdown).length > 0 ? (
                        <div className="flex w-full items-center gap-4">
                          <div className="w-1/2 h-52">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={Object.entries(stats.sports_breakdown).map(([name, value]) => ({ name, value }))}
                                  cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3} dataKey="value" strokeWidth={0}>
                                  {Object.entries(stats.sports_breakdown).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="w-1/2 space-y-2">
                            {Object.entries(stats.sports_breakdown).map(([name, value], i) => (
                              <div key={name} className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                <span className="truncate flex-1 font-medium capitalize">{name}</span>
                                <span className="font-heading font-bold">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full text-center text-slate-400">
                          <BarChart3 className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                          <p className="text-sm">Pas encore de données</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial summary */}
                  <div className="bg-white border border-slate-200 p-6 lg:col-span-2">
                    <h3 className="font-heading font-bold uppercase text-sm mb-4">Résumé financier</h3>
                    <div className="grid grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-slate-50">
                        <Euro className="w-6 h-6 text-brand mx-auto mb-2" />
                        <p className="text-2xl font-heading font-bold">{stats.total_spent_registrations.toFixed(0)}€</p>
                        <p className="text-xs text-slate-500">Inscriptions</p>
                      </div>
                      <div className="text-center p-4 bg-slate-50">
                        <ShoppingBag className="w-6 h-6 text-violet-500 mx-auto mb-2" />
                        <p className="text-2xl font-heading font-bold">{stats.orders_total.toFixed(0)}€</p>
                        <p className="text-xs text-slate-500">Boutique ({stats.orders_count} commande{stats.orders_count > 1 ? 's' : ''})</p>
                      </div>
                      <div className="text-center p-4 bg-slate-50">
                        <TrendingUp className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                        <p className="text-2xl font-heading font-bold">{(stats.total_spent_registrations + stats.orders_total).toFixed(0)}€</p>
                        <p className="text-xs text-slate-500">Total dépensé</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
            )}
          </motion.div>
        )}

        {/* ===== MES COMMANDES ===== */}
        {activeSection === 'orders' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Mes Commandes Boutique" onBack={() => setActiveSection('hub')} />
            {orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map(o => (
                  <div key={o.order_id} className="bg-white border border-slate-200 p-5" data-testid={`order-card-${o.order_id}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-brand font-bold">{o.order_id}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${o.status === 'confirmee' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{o.status === 'confirmee' ? 'Confirmée' : o.status}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${o.delivery_method === 'Livraison à domicile' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{o.delivery_method || 'Retrait sur place'}</span>
                        </div>
                        {o.event?.title && <p className="text-xs text-slate-500 mt-1">{o.event.title}</p>}
                        <p className="text-xs text-slate-400 mt-0.5">{o.created_at && format(new Date(o.created_at), 'd MMMM yyyy HH:mm', { locale: fr })}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-heading font-bold text-xl">{o.total?.toFixed(2)}€</p>
                        {o.delivery_fee > 0 && <p className="text-[10px] text-slate-400">dont {o.delivery_fee?.toFixed(2)}€ livraison</p>}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3">
                      {o.items?.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1">
                          <span className="font-medium">
                            {item.product_name}
                            {item.size && <span className="ml-1 text-slate-400">Taille: {item.size}</span>}
                            {item.color && <span className="ml-1 text-slate-400">Couleur: {item.color}</span>}
                            {' '}x{item.quantity}
                          </span>
                          <span className="font-heading font-bold">{item.line_total?.toFixed(2)}€</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 p-12 text-center">
                <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="font-heading font-bold text-lg uppercase mb-2">Aucune commande</h3>
                <p className="text-slate-500">Vos achats de la boutique apparaîtront ici</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ===== MESSAGERIE PRESTATAIRE ===== */}
        {activeSection === 'messaging' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Messagerie Boutique" onBack={() => setActiveSection('hub')} />
            <div className="bg-white border border-slate-200 grid grid-cols-3 min-h-[400px]" data-testid="participant-messaging">
              <div className="border-r border-slate-200 overflow-y-auto">
                <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase text-xs">Prestataires</h3></div>
                {providers.length > 0 ? providers.map(p => (
                  <button key={p.user_id} onClick={() => openChat(p.user_id)}
                    className={`w-full text-left p-3 border-b border-slate-100 hover:bg-slate-50 ${activeChat === p.user_id ? 'bg-brand/5 border-l-2 border-l-brand' : ''}`}
                    data-testid={`chat-provider-${p.user_id}`}>
                    <p className="font-heading font-bold text-xs truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{p.email}</p>
                  </button>
                )) : (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Aucun prestataire. Passez une commande pour voir vos prestataires ici.
                  </div>
                )}
              </div>
              <div className="col-span-2 flex flex-col">
                {activeChat ? (
                  <>
                    <div className="p-3 border-b bg-slate-50">
                      <p className="font-heading font-bold text-sm">{providers.find(p => p.user_id === activeChat)?.name || ''}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[300px]">
                      {messages.length > 0 ? messages.map(m => (
                        <div key={m.message_id} className={`flex ${m.sender_id === user?.user_id ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] px-3 py-2 text-sm ${m.sender_id === user?.user_id ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700'}`}>
                            <p>{m.content}</p>
                            <p className={`text-[10px] mt-1 ${m.sender_id === user?.user_id ? 'text-white/60' : 'text-slate-400'}`}>
                              {m.created_at && format(new Date(m.created_at), 'HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center text-slate-400 text-xs py-8">Aucun message. Envoyez le premier !</div>
                      )}
                    </div>
                    <div className="p-3 border-t flex gap-2">
                      <Input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Votre message..." onKeyDown={(e) => e.key === 'Enter' && sendMessage()} className="flex-1 h-9 text-xs" data-testid="participant-msg-input" />
                      <Button className="bg-brand hover:bg-brand/90 text-white h-9" onClick={sendMessage} data-testid="participant-msg-send"><Send className="w-4 h-4" /></Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Sélectionnez un prestataire pour démarrer une conversation</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ParticipantDashboard;
