import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Users, Calendar, Euro, TrendingUp, BarChart3,
  Settings, Search, ChevronLeft, ChevronRight, Download, FileText, MessageSquare, ShoppingBag, Check, X,
  CheckCircle, XCircle, Radio, Plus, Trash2, Edit, Package, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';
import api from '../services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import MessagingPage from './MessagingPage';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentTotals, setPaymentTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userPage, setUserPage] = useState(1);
  const [totalUserPages, setTotalUserPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [events, setEvents] = useState([]);
  const [eventFilter, setEventFilter] = useState('all');
  const [providers, setProviders] = useState([]);
  const [commissionData, setCommissionData] = useState(null);
  const [allInvoices, setAllInvoices] = useState([]);
  const [invoiceTotals, setInvoiceTotals] = useState({ total_count: 0, total_amount: 0 });
  const [refundRequests, setRefundRequests] = useState([]);
  const [rfidEquipment, setRfidEquipment] = useState([]);
  const [rfidRentals, setRfidRentals] = useState([]);
  const [rfidStats, setRfidStats] = useState(null);
  const [showRfidDialog, setShowRfidDialog] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [rfidForm, setRfidForm] = useState({ name: '', description: '', category: 'chronometrage', daily_rate: '', quantity_total: 1, image_url: '' });
  const [rfidSaving, setRfidSaving] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('Accès non autorisé');
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, paymentsRes, eventsRes, providersRes, commissionsRes, invoicesRes, refundsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers({ page: 1, limit: 20 }),
        adminApi.getPayments({ page: 1, limit: 100 }),
        api.get('/events'),
        api.get('/admin/providers'),
        api.get('/admin/commissions'),
        api.get('/admin/invoices'),
        api.get('/admin/refunds/all')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setTotalUserPages(usersRes.data.pages);
      setPayments(paymentsRes.data.payments);
      setPaymentTotals(paymentsRes.data.totals);
      setEvents(eventsRes.data.events || eventsRes.data || []);
      setProviders(providersRes.data.providers || []);
      setCommissionData(commissionsRes.data);
      setAllInvoices(invoicesRes.data.invoices || []);
      setInvoiceTotals({ total_count: invoicesRes.data.total_count || 0, total_amount: invoicesRes.data.total_amount || 0 });
      setRefundRequests(refundsRes.data.refunds || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fetchRfidData = async () => {
    try {
      const [eqRes, rentRes, statsRes] = await Promise.all([
        api.get('/rfid/equipment'),
        api.get('/admin/rfid/rentals'),
        api.get('/admin/rfid/stats')
      ]);
      setRfidEquipment(eqRes.data.equipment || []);
      setRfidRentals(rentRes.data.rentals || []);
      setRfidStats(statsRes.data);
    } catch {}
  };

  const handleSaveEquipment = async () => {
    if (!rfidForm.name || !rfidForm.daily_rate) { toast.error('Nom et tarif requis'); return; }
    setRfidSaving(true);
    const payload = { ...rfidForm, daily_rate: parseFloat(rfidForm.daily_rate), quantity_total: parseInt(rfidForm.quantity_total) };
    try {
      if (editingEquipment) {
        await api.put(`/rfid/equipment/${editingEquipment.equipment_id}`, payload);
        toast.success('Equipement mis a jour');
      } else {
        await api.post('/rfid/equipment', payload);
        toast.success('Equipement ajoute');
      }
      setShowRfidDialog(false); setEditingEquipment(null);
      setRfidForm({ name: '', description: '', category: 'chronometrage', daily_rate: '', quantity_total: 1, image_url: '' });
      fetchRfidData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setRfidSaving(false); }
  };

  const handleDeleteEquipment = async (id) => {
    if (!window.confirm('Supprimer cet equipement ?')) return;
    try { await api.delete(`/rfid/equipment/${id}`); toast.success('Supprime'); fetchRfidData(); }
    catch { toast.error('Erreur'); }
  };

  const handleRentalAction = async (rentalId, status) => {
    try {
      await api.put(`/admin/rfid/rentals/${rentalId}/process`, { status });
      toast.success(`Location ${status === 'confirmed' ? 'confirmee' : status === 'rejected' ? 'refusee' : 'retournee'}`);
      fetchRfidData();
    } catch { toast.error('Erreur'); }
  };

  // Auto-refresh events every 15s for real-time fill rates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/events');
        setEvents(res.data.events || res.data || []);
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchUsers = async (page) => {
    try {
      const res = await adminApi.getUsers({ page, limit: 20 });
      setUsers(res.data.users);
      setTotalUserPages(res.data.pages);
      setUserPage(page);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      toast.success('Rôle mis à jour');
      fetchUsers(userPage);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleProviderStatus = async (userId, status) => {
    try {
      await api.put(`/admin/providers/${userId}/status`, { status });
      toast.success(status === 'active' ? 'Prestataire validé' : 'Prestataire refusé');
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // Re-fetch payments when event filter changes
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const params = new URLSearchParams({ page: '1', limit: '100' });
        if (eventFilter !== 'all') params.append('event_id', eventFilter);
        const res = await adminApi.getPayments({ page: 1, limit: 100, event_id: eventFilter !== 'all' ? eventFilter : undefined });
        setPayments(res.data.payments);
        setPaymentTotals(res.data.totals);
      } catch {}
    };
    if (!loading) fetchPayments();
  }, [eventFilter]);

  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams({ format });
      if (exportStartDate) params.append('start_date', exportStartDate);
      if (exportEndDate) params.append('end_date', exportEndDate);
      if (eventFilter !== 'all') params.append('event_id', eventFilter);
      
      const res = await api.get(`/admin/payments/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const ext = format === 'pdf' ? 'pdf' : 'csv';
      const mimeType = format === 'pdf' ? 'application/pdf' : 'text/csv';
      const blob = new Blob([res.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bilan_financier_${new Date().toISOString().slice(0,10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Export ${format.toUpperCase()} téléchargé`);
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader" />
      </div>
    );
  }

  const filteredUsers = searchQuery
    ? users.filter(u => 
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="admin-dashboard">
      {/* Header */}
      <div className="bg-asphalt text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-2xl font-bold">Administration</h1>
              <p className="text-slate-400">Gérez la plateforme SportLyo</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['overview', 'users', 'payments', 'commissions', 'invoices', 'refunds', 'providers', 'rfid', 'messages'].map(tab => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? 'default' : 'outline'}
                  className={activeTab === tab ? 'bg-brand' : 'border-white text-white'}
                  onClick={() => { setActiveTab(tab); if (tab === 'rfid') fetchRfidData(); }}
                  data-testid={`tab-${tab}`}
                >
                  {tab === 'overview' ? 'Vue d\'ensemble' : tab === 'users' ? 'Utilisateurs' : tab === 'payments' ? 'Paiements' : tab === 'commissions' ? 'Commissions' : tab === 'invoices' ? 'Factures' : tab === 'refunds' ? 'Remboursements' : tab === 'providers' ? `Prestataires${providers.filter(p => p.status === 'pending').length > 0 ? ` (${providers.filter(p => p.status === 'pending').length})` : ''}` : tab === 'rfid' ? 'RFID' : 'Messages'}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && stats && (
          <>
            {/* Stats Cards - Clickable */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { icon: Users, label: 'Utilisateurs', value: stats.total_users, tab: 'users' },
                { icon: Calendar, label: 'Événements', value: stats.total_events, tab: 'overview' },
                { icon: TrendingUp, label: 'Inscriptions', value: stats.total_registrations, tab: 'payments' },
                { icon: Euro, label: 'Net Plateforme', value: `${(paymentTotals?.total_platform_net || 0).toFixed(2)}€`, tab: 'payments' }
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  className="stats-card cursor-pointer hover:border-brand/50 hover:shadow-lg transition-all group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                  onClick={() => setActiveTab(stat.tab)}
                  data-testid={`admin-stat-card-${stat.tab}-${idx}`}
                >
                  <stat.icon className="w-8 h-8 text-brand mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-2xl font-heading font-bold">{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand absolute top-4 right-4 transition-colors" />
                </motion.div>
              ))}
            </div>

            {/* Revenue Summary - 4 columns */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white border border-slate-200 p-5">
                <p className="text-xs font-heading uppercase text-slate-500 mb-1">Total encaissé</p>
                <p className="text-2xl font-heading font-extrabold text-slate-800">
                  {(paymentTotals?.total_amount || 0).toFixed(2)}€
                </p>
              </div>
              <div className="bg-white border border-slate-200 p-5">
                <p className="text-xs font-heading uppercase text-slate-500 mb-1">Reversé organisateurs</p>
                <p className="text-2xl font-heading font-extrabold text-blue-700">
                  {(paymentTotals?.total_organizer || 0).toFixed(2)}€
                </p>
              </div>
              <div className="bg-white border border-slate-200 p-5">
                <p className="text-xs font-heading uppercase text-slate-500 mb-1">Frais Stripe</p>
                <p className="text-2xl font-heading font-extrabold text-red-600">
                  -{(paymentTotals?.total_stripe_fees || 0).toFixed(2)}€
                </p>
              </div>
              <div className="bg-asphalt text-white p-5 border-l-4 border-brand">
                <p className="text-xs font-heading uppercase text-slate-400 mb-1">Net plateforme</p>
                <p className="text-2xl font-heading font-extrabold text-brand">
                  {(paymentTotals?.total_platform_net || 0).toFixed(2)}€
                </p>
              </div>
            </div>

            {/* Events Fill Rate */}
            <div className="bg-asphalt text-white mb-8 border-l-4 border-brand" data-testid="events-fill-rate">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-heading font-bold uppercase">Jauges de remplissage — Temps réel</h3>
                <span className="text-xs text-slate-400">{events.length} événement(s)</span>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {events.map(evt => {
                  const used = evt.current_participants || 0;
                  const total = evt.max_participants || 1;
                  const fill = Math.round((used / total) * 100);
                  const remaining = total - used;
                  return (
                    <div key={evt.event_id} className="p-4 hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-heading font-bold text-sm uppercase truncate text-white">{evt.title}</h4>
                          <p className="text-xs text-slate-400">{evt.location} — {evt.date && format(new Date(evt.date), 'd MMM yyyy', { locale: fr })}</p>
                        </div>
                        <div className="flex items-center gap-6 ml-4 flex-shrink-0">
                          <div className="text-right">
                            <span className="font-heading text-lg font-bold text-white">{used}</span>
                            <span className="text-slate-400 text-sm"> / {total}</span>
                          </div>
                          <div className="text-right w-16">
                            <span className={`font-heading text-lg font-bold ${fill >= 90 ? 'text-red-400' : fill >= 70 ? 'text-orange-400' : 'text-emerald-400'}`}>
                              {fill}%
                            </span>
                          </div>
                          <div className={`text-right w-24 text-sm font-medium ${remaining <= 5 ? 'text-red-400' : 'text-slate-300'}`}>
                            {remaining} place{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-white/10 h-3 rounded-sm overflow-hidden">
                        <div
                          className={`h-3 transition-all duration-700 ${fill >= 90 ? 'bg-red-500' : fill >= 70 ? 'bg-orange-500' : 'bg-brand'}`}
                          style={{ width: `${fill}%` }}
                        />
                      </div>
                      {evt.races && evt.races.length > 1 && (
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                          {evt.races.map(race => {
                            const rUsed = race.current_participants || 0;
                            const rTotal = race.max_participants || 1;
                            const rFill = Math.round((rUsed / rTotal) * 100);
                            return (
                              <div key={race.name} className="text-xs">
                                <div className="flex justify-between mb-0.5">
                                  <span className="truncate font-medium text-slate-300">{race.name}</span>
                                  <span className="text-slate-500 ml-1">{rUsed}/{rTotal}</span>
                                </div>
                                <div className="w-full bg-white/10 h-1.5 rounded-sm overflow-hidden">
                                  <div className={`h-1.5 ${rFill >= 90 ? 'bg-red-400' : 'bg-brand/70'}`} style={{ width: `${rFill}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {events.length === 0 && (
                  <div className="p-8 text-center text-slate-500">Aucun événement</div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-slate-200">
              <div className="p-4 border-b">
                <h3 className="font-heading font-bold uppercase">Dernières inscriptions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-4 text-sm font-heading font-bold uppercase">ID</th>
                      <th className="text-left p-4 text-sm font-heading font-bold uppercase">Utilisateur</th>
                      <th className="text-left p-4 text-sm font-heading font-bold uppercase">Événement</th>
                      <th className="text-left p-4 text-sm font-heading font-bold uppercase">Montant</th>
                      <th className="text-left p-4 text-sm font-heading font-bold uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_registrations?.slice(0, 5).map(reg => (
                      <tr key={reg.registration_id} className="border-b hover:bg-slate-50">
                        <td className="p-4 text-sm font-mono">{reg.registration_id.slice(0, 12)}</td>
                        <td className="p-4">{reg.user_name}</td>
                        <td className="p-4 text-sm text-slate-500">{reg.event_id}</td>
                        <td className="p-4 font-heading font-bold">{reg.amount_paid}€</td>
                        <td className="p-4 text-sm text-slate-500">
                          {format(new Date(reg.created_at), 'd MMM HH:mm', { locale: fr })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <div className="bg-white border border-slate-200">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-heading font-bold uppercase">Utilisateurs</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="user-search"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 text-sm font-heading font-bold uppercase">Utilisateur</th>
                    <th className="text-left p-4 text-sm font-heading font-bold uppercase">Email</th>
                    <th className="text-left p-4 text-sm font-heading font-bold uppercase">Rôle</th>
                    <th className="text-left p-4 text-sm font-heading font-bold uppercase">Inscrit le</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.user_id} className="border-b hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {u.picture ? (
                            <img src={u.picture} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 bg-brand rounded-full flex items-center justify-center text-white text-sm">
                              {u.name?.[0]}
                            </div>
                          )}
                          {u.name}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-500">{u.email}</td>
                      <td className="p-4">
                        <Select
                          value={u.role}
                          onValueChange={(value) => handleRoleChange(u.user_id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="participant">Participant</SelectItem>
                            <SelectItem value="organizer">Organisateur</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {u.created_at && format(new Date(u.created_at), 'd MMM yyyy', { locale: fr })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalUserPages > 1 && (
              <div className="p-4 border-t flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={userPage === 1}
                  onClick={() => fetchUsers(userPage - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
                </Button>
                <span className="text-sm text-slate-500">
                  Page {userPage} sur {totalUserPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={userPage === totalUserPages}
                  onClick={() => fetchUsers(userPage + 1)}
                >
                  Suivant <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-6">
            {/* Event Filter + Export Controls */}
            <div className="bg-white border border-slate-200 p-4" data-testid="export-controls">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs font-heading uppercase text-slate-500 mb-1">Événement</label>
                  <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="w-56" data-testid="event-filter">
                      <SelectValue placeholder="Tous les événements" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les événements</SelectItem>
                      {events.map(evt => (
                        <SelectItem key={evt.event_id} value={evt.event_id}>{evt.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-heading uppercase text-slate-500 mb-1">Date début</label>
                  <Input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-44"
                    data-testid="export-start-date"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading uppercase text-slate-500 mb-1">Date fin</label>
                  <Input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-44"
                    data-testid="export-end-date"
                  />
                </div>
                <Button
                  onClick={() => handleExport('csv')}
                  variant="outline"
                  className="gap-2"
                  data-testid="export-csv-btn"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
                <Button
                  onClick={() => handleExport('pdf')}
                  className="gap-2 bg-brand hover:bg-brand/90 text-white"
                  data-testid="export-pdf-btn"
                >
                  <FileText className="w-4 h-4" /> Export PDF
                </Button>
              </div>
            </div>
            {/* Financial Summary Cards */}
            {paymentTotals && paymentTotals.total_completed > 0 && (
              <div className="bg-asphalt text-white p-6 border-l-4 border-brand" data-testid="financial-summary">
                <h3 className="font-heading text-lg font-bold uppercase mb-4">Bilan financier automatique</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Total encaissé</p>
                    <p className="text-xl font-heading font-bold">{paymentTotals.total_amount.toFixed(2)}€</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Organisateurs</p>
                    <p className="text-xl font-heading font-bold text-blue-400">{paymentTotals.total_organizer.toFixed(2)}€</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Commission (5%)</p>
                    <p className="text-xl font-heading font-bold text-green-400">{paymentTotals.total_service_fees.toFixed(2)}€</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Frais Stripe</p>
                    <p className="text-xl font-heading font-bold text-red-400">-{paymentTotals.total_stripe_fees.toFixed(2)}€</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Net plateforme</p>
                    <p className="text-xl font-heading font-bold text-brand">{paymentTotals.total_platform_net.toFixed(2)}€</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">{paymentTotals.total_completed} paiement(s) complété(s) — Stripe: 1,4% + 0,25€ par transaction</p>
              </div>
            )}

            {/* Detailed Transactions Table */}
            <div className="bg-white border border-slate-200" data-testid="payments-table">
              <div className="p-4 border-b">
                <h3 className="font-heading font-bold uppercase">Tableau de ventilation des paiements</h3>
                <p className="text-xs text-slate-500 mt-1">Mis à jour automatiquement à chaque transaction</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left p-3 font-heading text-xs font-bold uppercase whitespace-nowrap">Participant</th>
                      <th className="text-left p-3 font-heading text-xs font-bold uppercase whitespace-nowrap">Événement</th>
                      <th className="text-left p-3 font-heading text-xs font-bold uppercase whitespace-nowrap">Course</th>
                      <th className="text-right p-3 font-heading text-xs font-bold uppercase whitespace-nowrap">Prix base</th>
                      <th className="text-right p-3 font-heading text-xs font-bold uppercase whitespace-nowrap">Frais service (5%)</th>
                      <th className="text-right p-3 font-heading text-xs font-bold uppercase whitespace-nowrap">Total payé</th>
                      <th className="text-right p-3 font-heading text-xs font-bold uppercase whitespace-nowrap">Frais Stripe</th>
                      <th className="text-right p-3 font-heading text-xs font-bold uppercase whitespace-nowrap">Organisateur</th>
                      <th className="text-right p-3 font-heading text-xs font-bold uppercase whitespace-nowrap">Net plateforme</th>
                      <th className="text-center p-3 font-heading text-xs font-bold uppercase whitespace-nowrap">Statut</th>
                      <th className="text-left p-3 font-heading text-xs font-bold uppercase whitespace-nowrap">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => {
                      const basePrice = p.base_price || p.organizer_amount || p.amount;
                      const serviceFee = p.service_fee || 0;
                      const totalPaid = p.amount || 0;
                      const stripeFee = p.stripe_fee || 0;
                      const orgAmount = p.organizer_amount || basePrice;
                      const platformNet = p.platform_net || (serviceFee - stripeFee);
                      return (
                        <tr key={p.transaction_id} className="border-b hover:bg-slate-50" data-testid={`payment-row-${p.transaction_id}`}>
                          <td className="p-3">
                            <div className="font-medium">{p.user_name || '—'}</div>
                            <div className="text-xs text-slate-400">{p.user_email || ''}</div>
                          </td>
                          <td className="p-3 max-w-[160px] truncate">{p.event_title || p.event_id?.slice(0, 12) || '—'}</td>
                          <td className="p-3 text-slate-600">{p.selected_race || '—'}</td>
                          <td className="p-3 text-right font-mono">{basePrice.toFixed(2)}€</td>
                          <td className="p-3 text-right font-mono text-green-700">+{serviceFee.toFixed(2)}€</td>
                          <td className="p-3 text-right font-mono font-bold">{totalPaid.toFixed(2)}€</td>
                          <td className="p-3 text-right font-mono text-red-600">-{stripeFee.toFixed(2)}€</td>
                          <td className="p-3 text-right font-mono text-blue-700">{orgAmount.toFixed(2)}€</td>
                          <td className="p-3 text-right font-mono font-bold text-brand">{platformNet.toFixed(2)}€</td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2 py-1 text-xs font-bold uppercase rounded ${
                              p.payment_status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {p.payment_status === 'completed' ? 'Payé' : 'En attente'}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                            {p.created_at && format(new Date(p.created_at), 'd MMM yyyy HH:mm', { locale: fr })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Totals row */}
                  {paymentTotals && (
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                      <tr>
                        <td colSpan="3" className="p-3 font-heading font-bold uppercase text-sm">
                          TOTAL ({paymentTotals.total_completed} payé(s))
                        </td>
                        <td className="p-3 text-right font-mono font-bold">{paymentTotals.total_base_price.toFixed(2)}€</td>
                        <td className="p-3 text-right font-mono font-bold text-green-700">+{paymentTotals.total_service_fees.toFixed(2)}€</td>
                        <td className="p-3 text-right font-mono font-bold">{paymentTotals.total_amount.toFixed(2)}€</td>
                        <td className="p-3 text-right font-mono font-bold text-red-600">-{paymentTotals.total_stripe_fees.toFixed(2)}€</td>
                        <td className="p-3 text-right font-mono font-bold text-blue-700">{paymentTotals.total_organizer.toFixed(2)}€</td>
                        <td className="p-3 text-right font-mono font-bold text-brand">{paymentTotals.total_platform_net.toFixed(2)}€</td>
                        <td colSpan="2" className="p-3"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'refunds' && (
          <div className="space-y-6" data-testid="refunds-tab">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-asphalt text-white p-6 border-l-4 border-brand">
                <p className="text-xs font-heading uppercase text-slate-400 mb-1">Demandes en attente</p>
                <p className="text-3xl font-heading font-extrabold text-brand" data-testid="refunds-pending-count">{refundRequests.filter(r => r.status === 'pending').length}</p>
              </div>
              <div className="bg-white border border-slate-200 p-6">
                <p className="text-xs font-heading uppercase text-slate-500 mb-1">Approuves</p>
                <p className="text-3xl font-heading font-extrabold text-green-600">{refundRequests.filter(r => r.status === 'approved').length}</p>
              </div>
              <div className="bg-white border border-slate-200 p-6">
                <p className="text-xs font-heading uppercase text-slate-500 mb-1">Montant rembourse</p>
                <p className="text-3xl font-heading font-extrabold text-slate-800">{refundRequests.filter(r => r.status === 'approved').reduce((s, r) => s + (r.amount || 0), 0).toFixed(2)}€</p>
              </div>
            </div>

            {/* Refund requests table */}
            <div className="bg-white border border-slate-200" data-testid="refunds-table">
              <div className="p-4 border-b">
                <h3 className="font-heading font-bold uppercase">Demandes de remboursement</h3>
              </div>
              <div className="divide-y">
                {refundRequests.length > 0 ? refundRequests.map(ref => (
                  <div key={ref.refund_id} className="p-4 hover:bg-slate-50 transition-colors" data-testid={`refund-row-${ref.refund_id}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-heading font-bold text-sm">{ref.user_name} <span className="text-slate-400 font-normal text-xs">({ref.user_email})</span></p>
                        <p className="text-xs text-slate-500">{ref.event_title}</p>
                        <p className="text-xs text-slate-500 mt-1">Motif : <span className="italic text-slate-600">{ref.reason}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="font-heading font-bold text-lg">{ref.amount?.toFixed(2)}€</p>
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase ${ref.status === 'approved' ? 'bg-green-100 text-green-700' : ref.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {ref.status === 'approved' ? 'Approuve' : ref.status === 'rejected' ? 'Refuse' : 'En attente'}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {ref.created_at && format(new Date(ref.created_at), 'd MMM yyyy HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    {ref.status === 'pending' && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1"
                          data-testid={`approve-refund-${ref.refund_id}`}
                          onClick={async () => {
                            try {
                              await api.put(`/admin/refunds/${ref.refund_id}/process`, { status: 'approved' });
                              setRefundRequests(prev => prev.map(r => r.refund_id === ref.refund_id ? { ...r, status: 'approved' } : r));
                              toast.success('Remboursement approuve');
                            } catch { toast.error('Erreur'); }
                          }}>
                          <CheckCircle className="w-3 h-3" /> Approuver
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs gap-1 text-red-600 border-red-200"
                          data-testid={`reject-refund-${ref.refund_id}`}
                          onClick={async () => {
                            try {
                              await api.put(`/admin/refunds/${ref.refund_id}/process`, { status: 'rejected', admin_note: 'Refuse par admin' });
                              setRefundRequests(prev => prev.map(r => r.refund_id === ref.refund_id ? { ...r, status: 'rejected' } : r));
                              toast.success('Remboursement refuse');
                            } catch { toast.error('Erreur'); }
                          }}>
                          <XCircle className="w-3 h-3" /> Refuser
                        </Button>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="p-8 text-center text-slate-400 text-sm">Aucune demande de remboursement</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-6" data-testid="invoices-tab">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-asphalt text-white p-6 border-l-4 border-brand">
                <p className="text-xs font-heading uppercase text-slate-400 mb-1">Total factures</p>
                <p className="text-3xl font-heading font-extrabold text-brand" data-testid="invoices-total-count">{invoiceTotals.total_count}</p>
              </div>
              <div className="bg-white border border-slate-200 p-6">
                <p className="text-xs font-heading uppercase text-slate-500 mb-1">Montant total facture</p>
                <p className="text-3xl font-heading font-extrabold text-slate-800" data-testid="invoices-total-amount">{invoiceTotals.total_amount.toFixed(2)}€</p>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white border border-slate-200" data-testid="invoices-table">
              <div className="p-4 border-b">
                <h3 className="font-heading font-bold uppercase">Toutes les factures</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 font-heading text-xs font-bold uppercase">N° Facture</th>
                      <th className="text-left p-3 font-heading text-xs font-bold uppercase">Client</th>
                      <th className="text-left p-3 font-heading text-xs font-bold uppercase">Type</th>
                      <th className="text-right p-3 font-heading text-xs font-bold uppercase">Montant</th>
                      <th className="text-center p-3 font-heading text-xs font-bold uppercase">Statut</th>
                      <th className="text-left p-3 font-heading text-xs font-bold uppercase">Date</th>
                      <th className="text-center p-3 font-heading text-xs font-bold uppercase">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allInvoices.map(inv => (
                      <tr key={inv.invoice_id} className="border-b hover:bg-slate-50" data-testid={`admin-invoice-${inv.invoice_id}`}>
                        <td className="p-3 font-mono text-xs font-bold">{inv.invoice_number}</td>
                        <td className="p-3">
                          <div className="font-medium text-sm">{inv.user_name || '—'}</div>
                          <div className="text-xs text-slate-400">{inv.user_email || ''}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${inv.source_type === 'registration' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {inv.source_type === 'registration' ? 'Inscription' : 'Boutique'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-heading font-bold">{inv.total?.toFixed(2)}€</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-green-100 text-green-700">
                            {inv.status === 'paid' ? 'Payée' : inv.status}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-slate-500">
                          {inv.created_at && format(new Date(inv.created_at), 'd MMM yyyy', { locale: fr })}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs h-7"
                            data-testid={`admin-download-invoice-${inv.invoice_id}`}
                            onClick={async () => {
                              try {
                                const res = await api.get(`/invoices/${inv.invoice_id}/pdf`, { responseType: 'blob' });
                                const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `facture_${inv.invoice_number}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                window.URL.revokeObjectURL(url);
                              } catch { /* ignore */ }
                            }}
                          >
                            <Download className="w-3 h-3" /> PDF
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {allInvoices.length === 0 && (
                      <tr><td colSpan="7" className="p-8 text-center text-slate-400">Aucune facture</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'commissions' && commissionData && (
          <div className="space-y-6" data-testid="commissions-tab">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-asphalt text-white p-6 border-l-4 border-brand">
                <p className="text-xs font-heading uppercase text-slate-400 mb-1">Commission admin totale</p>
                <p className="text-3xl font-heading font-extrabold text-brand" data-testid="total-admin-commission">
                  {commissionData.total_admin_commission.toFixed(2)}€
                </p>
                <p className="text-xs text-slate-500 mt-1">1€ par produit prestataire vendu</p>
              </div>
              <div className="bg-white border border-slate-200 p-6">
                <p className="text-xs font-heading uppercase text-slate-500 mb-1">Produits prestataires vendus</p>
                <p className="text-3xl font-heading font-extrabold text-slate-800" data-testid="total-provider-items">
                  {commissionData.total_provider_items_sold}
                </p>
                <p className="text-xs text-slate-400 mt-1">articles via prestataires</p>
              </div>
              <div className="bg-white border border-slate-200 p-6">
                <p className="text-xs font-heading uppercase text-slate-500 mb-1">Commandes avec prestataire</p>
                <p className="text-3xl font-heading font-extrabold text-slate-800" data-testid="total-provider-orders">
                  {commissionData.total_orders_with_provider}
                </p>
                <p className="text-xs text-slate-400 mt-1">commandes concernées</p>
              </div>
            </div>

            {/* By Provider Breakdown */}
            <div className="bg-white border border-slate-200" data-testid="commission-by-provider">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-heading font-bold uppercase">Commissions par prestataire</h3>
                <ShoppingBag className="w-4 h-4 text-slate-400" />
              </div>
              {commissionData.by_provider.length > 0 ? (
                <div className="divide-y">
                  {commissionData.by_provider.map(prov => (
                    <div key={prov.provider_id} className="p-4 hover:bg-slate-50 transition-colors" data-testid={`commission-provider-${prov.provider_id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-heading font-bold text-sm">{prov.name || 'Prestataire'}</p>
                          <p className="text-xs text-slate-400">{prov.orders_count} commande{prov.orders_count > 1 ? 's' : ''} — {prov.items_sold} article{prov.items_sold > 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-heading font-bold text-xl text-brand">{prov.commission.toFixed(2)}€</p>
                          <p className="text-[10px] text-slate-400">commission admin</p>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 overflow-hidden">
                        <div className="h-full bg-brand transition-all" style={{ width: `${commissionData.total_admin_commission > 0 ? ((prov.commission / commissionData.total_admin_commission) * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm">Aucune commission pour le moment</div>
              )}
            </div>

            {/* Recent Orders with Commission */}
            <div className="bg-white border border-slate-200" data-testid="commission-recent-orders">
              <div className="p-4 border-b">
                <h3 className="font-heading font-bold uppercase">Dernières commandes avec commission</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 font-heading text-xs font-bold uppercase">Commande</th>
                      <th className="text-left p-3 font-heading text-xs font-bold uppercase">Client</th>
                      <th className="text-right p-3 font-heading text-xs font-bold uppercase">Total</th>
                      <th className="text-right p-3 font-heading text-xs font-bold uppercase">Commission admin</th>
                      <th className="text-left p-3 font-heading text-xs font-bold uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissionData.recent_orders.map(o => (
                      <tr key={o.order_id} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-mono text-xs">{o.order_id?.slice(0, 16)}</td>
                        <td className="p-3">{o.user_name || '—'}</td>
                        <td className="p-3 text-right font-heading font-bold">{o.total?.toFixed(2)}€</td>
                        <td className="p-3 text-right font-heading font-bold text-brand">{o.admin_commission?.toFixed(2)}€</td>
                        <td className="p-3 text-xs text-slate-500">
                          {o.created_at && format(new Date(o.created_at), 'd MMM yyyy HH:mm', { locale: fr })}
                        </td>
                      </tr>
                    ))}
                    {commissionData.recent_orders.length === 0 && (
                      <tr><td colSpan="5" className="p-8 text-center text-slate-400">Aucune commande avec commission</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'providers' && (
          <div data-testid="providers-tab">
            <h2 className="font-heading text-xl font-bold uppercase mb-4">Gestion des prestataires</h2>
            {providers.length > 0 ? (
              <div className="space-y-3">
                {providers.map(p => (
                  <div key={p.user_id} className="bg-white border border-slate-200 p-4 flex items-center justify-between" data-testid={`provider-${p.user_id}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-bold text-base">{p.company_name || p.name}</h3>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${p.status === 'active' ? 'bg-green-100 text-green-700' : p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{p.status === 'active' ? 'Validé' : p.status === 'pending' ? 'En attente' : 'Refusé'}</span>
                      </div>
                      <p className="text-sm text-slate-500">{p.email}</p>
                      {p.phone && <p className="text-xs text-slate-400">{p.phone}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">Inscrit le {p.created_at && format(new Date(p.created_at), 'd MMM yyyy', { locale: fr })}</p>
                    </div>
                    <div className="flex gap-2">
                      {p.status === 'pending' && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-heading font-bold text-xs" onClick={() => handleProviderStatus(p.user_id, 'active')} data-testid={`approve-${p.user_id}`}>Valider</Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => handleProviderStatus(p.user_id, 'rejected')} data-testid={`reject-${p.user_id}`}>Refuser</Button>
                        </>
                      )}
                      {p.status === 'active' && (
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => handleProviderStatus(p.user_id, 'rejected')}>Suspendre</Button>
                      )}
                      {p.status === 'rejected' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs" onClick={() => handleProviderStatus(p.user_id, 'active')}>Réactiver</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 p-8 text-center text-slate-400">Aucun prestataire inscrit</div>
            )}
          </div>
        )}

        {activeTab === 'rfid' && (
          <div className="space-y-6" data-testid="rfid-tab">
            {/* Stats */}
            {rfidStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Equipements', value: rfidStats.total_equipment, color: 'text-brand' },
                  { label: 'Locations totales', value: rfidStats.total_rentals, color: 'text-slate-800' },
                  { label: 'En attente', value: rfidStats.pending_rentals, color: 'text-orange-600' },
                  { label: 'Confirmees', value: rfidStats.confirmed_rentals, color: 'text-green-600' },
                  { label: 'Revenus', value: `${rfidStats.total_revenue}€`, color: 'text-brand' },
                ].map((s, i) => (
                  <div key={i} className="bg-white border border-slate-200 p-4 text-center">
                    <p className={`font-heading font-black text-2xl ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Equipment Management */}
            <div className="bg-white border border-slate-200" data-testid="rfid-equipment-list">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-heading font-bold uppercase">Catalogue equipements RFID</h3>
                <Button size="sm" className="bg-brand text-white gap-1" onClick={() => { setEditingEquipment(null); setRfidForm({ name: '', description: '', category: 'chronometrage', daily_rate: '', quantity_total: 1, image_url: '' }); setShowRfidDialog(true); }} data-testid="rfid-add-equipment-btn">
                  <Plus className="w-3 h-3" /> Ajouter
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 font-heading text-xs font-bold uppercase">Nom</th>
                      <th className="text-left p-3 font-heading text-xs font-bold uppercase">Categorie</th>
                      <th className="text-right p-3 font-heading text-xs font-bold uppercase">Tarif/jour</th>
                      <th className="text-center p-3 font-heading text-xs font-bold uppercase">Stock</th>
                      <th className="text-center p-3 font-heading text-xs font-bold uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfidEquipment.map(eq => (
                      <tr key={eq.equipment_id} className="border-b hover:bg-slate-50" data-testid={`rfid-eq-${eq.equipment_id}`}>
                        <td className="p-3">
                          <p className="font-medium">{eq.name}</p>
                          <p className="text-xs text-slate-400 line-clamp-1">{eq.description}</p>
                        </td>
                        <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 text-xs font-bold uppercase">{eq.category}</span></td>
                        <td className="p-3 text-right font-heading font-bold text-brand">{eq.daily_rate}€</td>
                        <td className="p-3 text-center">{eq.quantity_available}/{eq.quantity_total}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                              setEditingEquipment(eq);
                              setRfidForm({ name: eq.name, description: eq.description, category: eq.category, daily_rate: eq.daily_rate, quantity_total: eq.quantity_total, image_url: eq.image_url || '' });
                              setShowRfidDialog(true);
                            }} data-testid={`rfid-edit-${eq.equipment_id}`}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteEquipment(eq.equipment_id)} data-testid={`rfid-delete-${eq.equipment_id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {rfidEquipment.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-400">Aucun equipement</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rental Requests */}
            <div className="bg-white border border-slate-200" data-testid="rfid-rentals-list">
              <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase">Demandes de location</h3></div>
              <div className="divide-y">
                {rfidRentals.map(r => (
                  <div key={r.rental_id} className="p-4" data-testid={`rfid-rental-${r.rental_id}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-heading font-bold text-sm">{r.organizer_name}</p>
                        <p className="text-xs text-slate-500">{r.event_title} — {r.start_date} au {r.end_date}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.items?.map((item, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-[10px] font-bold">{item.name} x{item.quantity} ({item.days}j)</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-heading font-bold text-lg">{r.total?.toFixed(2)}€</p>
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : r.status === 'confirmed' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                          {r.status === 'pending' ? 'En attente' : r.status === 'confirmed' ? 'Confirmee' : r.status === 'rejected' ? 'Refusee' : 'Retournee'}
                        </span>
                      </div>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" className="bg-green-600 text-white text-xs gap-1" onClick={() => handleRentalAction(r.rental_id, 'confirmed')} data-testid={`rfid-confirm-${r.rental_id}`}><Check className="w-3 h-3" /> Confirmer</Button>
                        <Button size="sm" variant="outline" className="text-red-600 text-xs gap-1" onClick={() => handleRentalAction(r.rental_id, 'rejected')} data-testid={`rfid-reject-${r.rental_id}`}><X className="w-3 h-3" /> Refuser</Button>
                      </div>
                    )}
                    {r.status === 'confirmed' && (
                      <Button size="sm" variant="outline" className="text-xs gap-1 mt-2" onClick={() => handleRentalAction(r.rental_id, 'returned')} data-testid={`rfid-return-${r.rental_id}`}><Package className="w-3 h-3" /> Marquer retourne</Button>
                    )}
                  </div>
                ))}
                {rfidRentals.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">Aucune demande de location</div>}
              </div>
            </div>

            {/* Add/Edit Equipment Dialog */}
            {showRfidDialog && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRfidDialog(false)}>
                <div className="bg-white w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()} data-testid="rfid-equipment-dialog">
                  <h3 className="font-heading font-bold text-lg uppercase">{editingEquipment ? 'Modifier' : 'Nouvel equipement'}</h3>
                  <div>
                    <label className="text-xs font-heading uppercase text-slate-500 mb-1 block">Nom *</label>
                    <Input value={rfidForm.name} onChange={(e) => setRfidForm(p => ({ ...p, name: e.target.value }))} placeholder="Portique lecteur RFID" data-testid="rfid-name-input" />
                  </div>
                  <div>
                    <label className="text-xs font-heading uppercase text-slate-500 mb-1 block">Description</label>
                    <Input value={rfidForm.description} onChange={(e) => setRfidForm(p => ({ ...p, description: e.target.value }))} placeholder="Description..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-heading uppercase text-slate-500 mb-1 block">Categorie</label>
                      <select className="w-full border border-slate-200 rounded p-2 text-sm" value={rfidForm.category} onChange={(e) => setRfidForm(p => ({ ...p, category: e.target.value }))}>
                        <option value="chronometrage">Chronometrage</option>
                        <option value="accessoire">Accessoire</option>
                        <option value="logiciel">Logiciel</option>
                        <option value="affichage">Affichage</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-heading uppercase text-slate-500 mb-1 block">Tarif/jour (€) *</label>
                      <Input type="number" value={rfidForm.daily_rate} onChange={(e) => setRfidForm(p => ({ ...p, daily_rate: e.target.value }))} data-testid="rfid-rate-input" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-heading uppercase text-slate-500 mb-1 block">Stock total</label>
                    <Input type="number" value={rfidForm.quantity_total} onChange={(e) => setRfidForm(p => ({ ...p, quantity_total: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShowRfidDialog(false)}>Annuler</Button>
                    <Button className="flex-1 bg-brand text-white" onClick={handleSaveEquipment} disabled={rfidSaving} data-testid="rfid-save-btn">
                      {rfidSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingEquipment ? 'Enregistrer' : 'Ajouter'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <MessagingPage />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
