import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Users, Calendar, Euro, TrendingUp, BarChart3,
  Settings, Search, ChevronLeft, ChevronRight, Download, FileText, MessageSquare, ShoppingBag, Check, X,
  CheckCircle, XCircle, Radio, Plus, Trash2, Edit, Package, Loader2,
  CreditCard, Heart, Gift, Crown, Wallet, Eye, ArrowLeft, Clock, AlertTriangle, Ban, Play, Pause, ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';
import api from '../services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
  const [refundFilter, setRefundFilter] = useState('all');
  const [revenueData, setRevenueData] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  // Provider management
  const [detailedProviders, setDetailedProviders] = useState([]);
  const [providerStats, setProviderStats] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providerDetail, setProviderDetail] = useState(null);
  const [providerDetailLoading, setProviderDetailLoading] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');
  const [providerStatusFilter, setProviderStatusFilter] = useState('all');
  const [showSubActionDialog, setShowSubActionDialog] = useState(false);
  const [subAction, setSubAction] = useState({ action: '', days: 30, months: 1, reason: '' });
  const [suspendReason, setSuspendReason] = useState('');
  const [trialAlerts, setTrialAlerts] = useState([]);

  const filteredRefunds = refundFilter === 'all' ? refundRequests : refundRequests.filter(r => r.status === refundFilter);

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
      const [statsRes, usersRes, paymentsRes, eventsRes, providersRes, commissionsRes, invoicesRes, refundsRes, subsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers({ page: 1, limit: 20 }),
        adminApi.getPayments({ page: 1, limit: 100 }),
        api.get('/events'),
        api.get('/admin/providers'),
        api.get('/admin/commissions'),
        api.get('/admin/invoices'),
        api.get('/admin/refunds/all'),
        api.get('/admin/subscriptions').catch(() => ({ data: { subscriptions: [], stats: {} } }))
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
      setTrialAlerts(subsRes.data.subscriptions?.filter(s => {
        if (s.status !== 'trial') return false;
        const daysLeft = Math.ceil((new Date(s.trial_end) - new Date()) / (1000 * 60 * 60 * 24));
        return daysLeft <= 5;
      }).map(s => ({ ...s, days_left: Math.max(0, Math.ceil((new Date(s.trial_end) - new Date()) / (1000 * 60 * 60 * 24))) })).sort((a, b) => a.days_left - b.days_left) || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueData = async () => {
    setRevenueLoading(true);
    try {
      const res = await api.get('/admin/revenue-breakdown');
      setRevenueData(res.data);
    } catch { toast.error('Erreur chargement revenus'); }
    finally { setRevenueLoading(false); }
  };

  const fetchDetailedProviders = async () => {
    try {
      const res = await api.get('/admin/providers/detailed');
      setDetailedProviders(res.data.providers || []);
      setProviderStats(res.data.stats || null);
    } catch { toast.error('Erreur chargement partenaires'); }
  };

  const fetchProviderDetail = async (userId) => {
    setProviderDetailLoading(true);
    try {
      const res = await api.get(`/admin/providers/${userId}/detail`);
      setProviderDetail(res.data);
    } catch { toast.error('Erreur chargement detail partenaire'); }
    finally { setProviderDetailLoading(false); }
  };

  const handleProviderStatusChange = async (userId, status, reason) => {
    try {
      await api.put(`/admin/providers/${userId}/status`, { status, reason });
      toast.success(`Statut mis a jour: ${status}`);
      fetchDetailedProviders();
      if (providerDetail?.provider?.user_id === userId) fetchProviderDetail(userId);
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const handleSubAction = async () => {
    if (!selectedProvider) return;
    try {
      await api.put(`/admin/providers/${selectedProvider}/subscription`, subAction);
      toast.success('Abonnement modifie !');
      setShowSubActionDialog(false);
      fetchDetailedProviders();
      if (providerDetail?.provider?.user_id === selectedProvider) fetchProviderDetail(selectedProvider);
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
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
              {['overview', 'users', 'payments', 'revenus', 'commissions', 'invoices', 'refunds', 'providers', 'rfid', 'messages'].map(tab => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? 'default' : 'outline'}
                  className={activeTab === tab ? 'bg-brand' : 'border-white text-white'}
                  onClick={() => { setActiveTab(tab); if (tab === 'rfid') fetchRfidData(); if (tab === 'revenus') fetchRevenueData(); if (tab === 'providers') fetchDetailedProviders(); }}
                  data-testid={`tab-${tab}`}
                >
                  {tab === 'overview' ? 'Vue d\'ensemble' : tab === 'users' ? 'Utilisateurs' : tab === 'payments' ? 'Paiements' : tab === 'revenus' ? 'Revenus' : tab === 'commissions' ? 'Commissions' : tab === 'invoices' ? 'Factures' : tab === 'refunds' ? 'Remboursements' : tab === 'providers' ? `Prestataires${providers.filter(p => p.status === 'pending').length > 0 ? ` (${providers.filter(p => p.status === 'pending').length})` : ''}` : tab === 'rfid' ? 'RFID' : 'Messages'}
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

            {/* Trial Expiry Alerts */}
            {trialAlerts.length > 0 && (
              <div className="mb-8 border-l-4 border-amber-500 bg-amber-50 p-4" data-testid="trial-alerts">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h3 className="font-heading font-bold uppercase text-sm text-amber-800">
                    Fin d'essai imminente — {trialAlerts.length} partenaire{trialAlerts.length > 1 ? 's' : ''}
                  </h3>
                </div>
                <div className="space-y-2">
                  {trialAlerts.map(alert => (
                    <div key={alert.subscription_id} className="flex items-center justify-between bg-white p-3 border border-amber-200 rounded" data-testid={`trial-alert-${alert.user_id}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold text-sm ${alert.days_left <= 1 ? 'bg-red-100 text-red-700' : alert.days_left <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {alert.days_left}j
                        </div>
                        <div>
                          <p className="font-heading font-bold text-sm">{alert.user_name}</p>
                          <p className="text-xs text-slate-500">{alert.user_email} — Fin le {alert.trial_end ? format(new Date(alert.trial_end), 'd MMM yyyy', { locale: fr }) : '—'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-brand text-white gap-1 text-xs h-7" onClick={() => { setActiveTab('providers'); fetchDetailedProviders(); setTimeout(() => { setSelectedProvider(alert.user_id); fetchProviderDetail(alert.user_id); }, 500); }} data-testid={`alert-view-${alert.user_id}`}>
                          <Eye className="w-3 h-3" /> Voir
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 gap-1 text-xs h-7" onClick={() => { const r = prompt('Raison de la suspension:'); if (r) handleProviderStatusChange(alert.user_id, 'suspended', r); }} data-testid={`alert-suspend-${alert.user_id}`}>
                          <Ban className="w-3 h-3" /> Couper
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-asphalt text-white p-6 border-l-4 border-brand">
                <p className="text-xs font-heading uppercase text-slate-400 mb-1">Demandes en attente</p>
                <p className="text-3xl font-heading font-extrabold text-brand" data-testid="refunds-pending-count">{refundRequests.filter(r => r.status === 'pending').length}</p>
              </div>
              <div className="bg-white border border-slate-200 p-6">
                <p className="text-xs font-heading uppercase text-slate-500 mb-1">Approuves</p>
                <p className="text-3xl font-heading font-extrabold text-green-600">{refundRequests.filter(r => r.status === 'approved').length}</p>
              </div>
              <div className="bg-white border border-slate-200 p-6">
                <p className="text-xs font-heading uppercase text-slate-500 mb-1">Refuses</p>
                <p className="text-3xl font-heading font-extrabold text-red-600">{refundRequests.filter(r => r.status === 'rejected').length}</p>
              </div>
              <div className="bg-white border border-slate-200 p-6">
                <p className="text-xs font-heading uppercase text-slate-500 mb-1">Montant rembourse</p>
                <p className="text-3xl font-heading font-extrabold text-slate-800">{refundRequests.filter(r => r.status === 'approved').reduce((s, r) => s + (r.amount || 0), 0).toFixed(2)}€</p>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2" data-testid="refund-filters">
              <span className="text-xs font-heading uppercase text-slate-500">Filtrer :</span>
              {[{ val: 'all', label: 'Tous' }, { val: 'pending', label: 'En attente' }, { val: 'approved', label: 'Approuves' }, { val: 'rejected', label: 'Refuses' }].map(f => (
                <Button key={f.val} size="sm" variant={refundFilter === f.val ? 'default' : 'outline'} className={`text-xs h-7 ${refundFilter === f.val ? 'bg-brand' : ''}`}
                  onClick={() => setRefundFilter(f.val)} data-testid={`refund-filter-${f.val}`}>{f.label}
                </Button>
              ))}
            </div>

            {/* Refund requests table */}
            <div className="bg-white border border-slate-200" data-testid="refunds-table">
              <div className="p-4 border-b">
                <h3 className="font-heading font-bold uppercase">Demandes de remboursement</h3>
              </div>
              <div className="divide-y">
                {filteredRefunds.length > 0 ? filteredRefunds.map(ref => (
                  <div key={ref.refund_id} className="p-4 hover:bg-slate-50 transition-colors" data-testid={`refund-row-${ref.refund_id}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-heading font-bold text-sm">{ref.user_name} <span className="text-slate-400 font-normal text-xs">({ref.user_email})</span></p>
                        <p className="text-xs text-slate-500">{ref.event_title}</p>
                        <p className="text-xs text-slate-500 mt-1">Motif : <span className="italic text-slate-600">{ref.reason}</span></p>
                        {ref.admin_note && <p className="text-xs text-blue-600 mt-1">Note admin : {ref.admin_note}</p>}
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
                      <div className="flex gap-2 mt-2 items-center">
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
                            const note = window.prompt('Motif du refus (optionnel) :');
                            try {
                              await api.put(`/admin/refunds/${ref.refund_id}/process`, { status: 'rejected', admin_note: note || 'Refuse par admin' });
                              setRefundRequests(prev => prev.map(r => r.refund_id === ref.refund_id ? { ...r, status: 'rejected', admin_note: note || 'Refuse par admin' } : r));
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

        {/* ==================== REVENUS TAB ==================== */}
        {activeTab === 'revenus' && (
          <div className="space-y-6" data-testid="revenus-tab">
            {revenueLoading ? (
              <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand" /></div>
            ) : revenueData ? (
              <>
                {/* Grand Total Banner */}
                <div className="bg-asphalt text-white p-6 border-l-4 border-brand">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-heading uppercase text-slate-400">Chiffre d'affaires total</p>
                      <p className="text-4xl font-heading font-extrabold text-brand" data-testid="grand-total">{revenueData.grand_total.toLocaleString()}€</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-heading uppercase text-slate-400">Revenus plateforme (frais)</p>
                      <p className="text-2xl font-heading font-bold text-green-400" data-testid="grand-fees">{revenueData.grand_fees.toLocaleString()}€</p>
                      <p className="text-[10px] text-slate-500">dont {revenueData.platform_fees_collected.toLocaleString()}€ encaisses / {revenueData.platform_fees_pending.toLocaleString()}€ en attente</p>
                    </div>
                  </div>
                </div>

                {/* Source Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {[
                    { key: 'inscriptions', icon: CreditCard, color: 'border-blue-500', bg: 'bg-blue-50', iconColor: 'text-blue-600' },
                    { key: 'dons', icon: Heart, color: 'border-pink-500', bg: 'bg-pink-50', iconColor: 'text-pink-600' },
                    { key: 'sponsors', icon: Crown, color: 'border-amber-500', bg: 'bg-amber-50', iconColor: 'text-amber-600' },
                    { key: 'produits', icon: ShoppingBag, color: 'border-violet-500', bg: 'bg-violet-50', iconColor: 'text-violet-600' },
                    { key: 'abonnements', icon: Wallet, color: 'border-teal-500', bg: 'bg-teal-50', iconColor: 'text-teal-600' }
                  ].map(({ key, icon: Icon, color, bg, iconColor }) => {
                    const src = revenueData.sources[key];
                    return (
                      <motion.div key={key} className={`bg-white border-l-4 ${color} p-4`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} data-testid={`source-card-${key}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 ${bg} flex items-center justify-center rounded`}><Icon className={`w-4 h-4 ${iconColor}`} /></div>
                          <span className="text-[10px] font-heading uppercase text-slate-500 font-bold">{src.label}</span>
                        </div>
                        <p className="text-2xl font-heading font-extrabold">{src.total.toLocaleString()}€</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-slate-400">{src.count} transaction(s)</span>
                          <span className="text-[10px] text-green-600 font-bold">Frais: {src.fees.toLocaleString()}€</span>
                        </div>
                        {src.pending_total > 0 && (
                          <div className="mt-1 text-[10px] text-amber-600 font-medium">{src.pending_count} en attente ({src.pending_total.toLocaleString()}€)</div>
                        )}
                        {key === 'abonnements' && (src.active_subs > 0 || src.trial_subs > 0) && (
                          <div className="mt-1 text-[10px] text-teal-600 font-medium">{src.active_subs || 0} actif(s) · {src.trial_subs || 0} en essai</div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Evolution Chart */}
                  <div className="lg:col-span-2 bg-white border border-slate-200 p-4">
                    <h3 className="font-heading font-bold uppercase text-sm mb-4">Evolution des revenus (12 mois)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={revenueData.monthly}>
                        <defs>
                          <linearGradient id="gradInsc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                          <linearGradient id="gradDons" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ec4899" stopOpacity={0.3} /><stop offset="100%" stopColor="#ec4899" stopOpacity={0} /></linearGradient>
                          <linearGradient id="gradSpon" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                          <linearGradient id="gradProd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
                          <linearGradient id="gradAbo" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} /><stop offset="100%" stopColor="#14b8a6" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}€`} />
                        <Tooltip formatter={(v) => `${v.toLocaleString()}€`} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="inscriptions" name="Inscriptions" stroke="#3b82f6" fill="url(#gradInsc)" strokeWidth={2} />
                        <Area type="monotone" dataKey="dons" name="Dons" stroke="#ec4899" fill="url(#gradDons)" strokeWidth={2} />
                        <Area type="monotone" dataKey="sponsors" name="Sponsors" stroke="#f59e0b" fill="url(#gradSpon)" strokeWidth={2} />
                        <Area type="monotone" dataKey="produits" name="Produits" stroke="#8b5cf6" fill="url(#gradProd)" strokeWidth={2} />
                        <Area type="monotone" dataKey="abonnements" name="Abonnements" stroke="#14b8a6" fill="url(#gradAbo)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie Chart Distribution */}
                  <div className="bg-white border border-slate-200 p-4">
                    <h3 className="font-heading font-bold uppercase text-sm mb-4">Repartition des revenus</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={Object.entries(revenueData.sources).filter(([, v]) => v.total > 0).map(([k, v]) => ({ name: v.label, value: v.total, key: k }))}
                          cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                          dataKey="value" paddingAngle={3}
                        >
                          {Object.entries(revenueData.sources).filter(([, v]) => v.total > 0).map(([k], i) => {
                            const colors = { inscriptions: '#3b82f6', dons: '#ec4899', sponsors: '#f59e0b', produits: '#8b5cf6', abonnements: '#14b8a6' };
                            return <Cell key={k} fill={colors[k] || '#94a3b8'} />;
                          })}
                        </Pie>
                        <Tooltip formatter={(v) => `${v.toLocaleString()}€`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {Object.entries(revenueData.sources).filter(([, v]) => v.total > 0).map(([k, v]) => {
                        const colors = { inscriptions: 'bg-blue-500', dons: 'bg-pink-500', sponsors: 'bg-amber-500', produits: 'bg-violet-500', abonnements: 'bg-teal-500' };
                        const pct = revenueData.grand_total > 0 ? ((v.total / revenueData.grand_total) * 100).toFixed(1) : 0;
                        return (
                          <div key={k} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${colors[k]}`} />{v.label}</div>
                            <span className="font-heading font-bold">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bar Chart: Frais plateforme par mois */}
                <div className="bg-white border border-slate-200 p-4">
                  <h3 className="font-heading font-bold uppercase text-sm mb-4">Frais de fonctionnement plateforme (par mois)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={revenueData.monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}€`} />
                      <Tooltip formatter={(v) => `${v.toLocaleString()}€`} />
                      <Bar dataKey="frais_plateforme" name="Frais plateforme" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Recent Transactions Table */}
                <div className="bg-white border border-slate-200">
                  <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase">Dernieres transactions (toutes sources)</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="recent-transactions-table">
                      <thead className="bg-slate-50"><tr>
                        <th className="text-left p-3 font-heading text-xs font-bold uppercase">Source</th>
                        <th className="text-left p-3 font-heading text-xs font-bold uppercase">Description</th>
                        <th className="text-right p-3 font-heading text-xs font-bold uppercase">Montant</th>
                        <th className="text-right p-3 font-heading text-xs font-bold uppercase">Frais plateforme</th>
                        <th className="text-left p-3 font-heading text-xs font-bold uppercase">Statut</th>
                        <th className="text-left p-3 font-heading text-xs font-bold uppercase">Date</th>
                      </tr></thead>
                      <tbody>
                        {revenueData.recent_transactions.map((t, i) => {
                          const typeConfig = {
                            inscription: { label: 'Inscription', cls: 'bg-blue-100 text-blue-700' },
                            don: { label: 'Don', cls: 'bg-pink-100 text-pink-700' },
                            sponsor: { label: 'Sponsor', cls: 'bg-amber-100 text-amber-700' },
                            produit: { label: 'Produit', cls: 'bg-violet-100 text-violet-700' }
                          };
                          const cfg = typeConfig[t.type] || { label: t.type, cls: 'bg-slate-100 text-slate-600' };
                          return (
                            <tr key={i} className="border-b hover:bg-slate-50">
                              <td className="p-3"><span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${cfg.cls}`}>{cfg.label}</span></td>
                              <td className="p-3 text-sm">{t.label}</td>
                              <td className="p-3 text-right font-heading font-bold">{t.amount?.toLocaleString()}€</td>
                              <td className="p-3 text-right text-green-600 font-bold">{t.fee > 0 ? `${t.fee.toLocaleString()}€` : '—'}</td>
                              <td className="p-3">{t.status === 'completed' || t.status === 'paid' ? <span className="text-green-600 text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" />Paye</span> : <span className="text-amber-600 text-xs font-bold">En attente</span>}</td>
                              <td className="p-3 text-xs text-slate-500">{t.date ? format(new Date(t.date), 'd MMM yyyy', { locale: fr }) : '—'}</td>
                            </tr>
                          );
                        })}
                        {revenueData.recent_transactions.length === 0 && (
                          <tr><td colSpan="6" className="p-8 text-center text-slate-400">Aucune transaction</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400">Cliquez pour charger les donnees de revenus</div>
            )}
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
          <div data-testid="providers-tab" className="space-y-6">
            {/* Provider Detail View */}
            {providerDetail && !providerDetailLoading ? (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => { setProviderDetail(null); setSelectedProvider(null); }} data-testid="back-to-providers">
                    <ArrowLeft className="w-4 h-4" /> Retour
                  </Button>
                  <h2 className="font-heading text-xl font-bold uppercase">{providerDetail.provider.company_name || providerDetail.provider.name}</h2>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${providerDetail.provider.status === 'active' ? 'bg-green-100 text-green-700' : providerDetail.provider.status === 'suspended' ? 'bg-red-100 text-red-700' : providerDetail.provider.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{providerDetail.provider.status === 'active' ? 'Actif' : providerDetail.provider.status === 'pending' ? 'En attente' : providerDetail.provider.status === 'suspended' ? 'Suspendu' : 'Refuse'}</span>
                </div>

                {/* Info + Actions row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Profile */}
                  <div className="bg-white border border-slate-200 p-5">
                    <h3 className="font-heading font-bold uppercase text-xs text-slate-500 mb-3">Profil</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-slate-400">Nom:</span> <strong>{providerDetail.provider.name}</strong></p>
                      <p><span className="text-slate-400">Email:</span> {providerDetail.provider.email}</p>
                      {providerDetail.provider.phone && <p><span className="text-slate-400">Tel:</span> {providerDetail.provider.phone}</p>}
                      {providerDetail.provider.company_name && <p><span className="text-slate-400">Societe:</span> {providerDetail.provider.company_name}</p>}
                      <p><span className="text-slate-400">Inscrit le:</span> {providerDetail.provider.created_at ? format(new Date(providerDetail.provider.created_at), 'd MMM yyyy', { locale: fr }) : '—'}</p>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      {providerDetail.provider.status === 'active' && (
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 gap-1 text-xs" onClick={() => { const r = prompt('Raison de la suspension:'); if (r) handleProviderStatusChange(providerDetail.provider.user_id, 'suspended', r); }} data-testid="suspend-provider-btn"><Ban className="w-3 h-3" /> Suspendre</Button>
                      )}
                      {(providerDetail.provider.status === 'suspended' || providerDetail.provider.status === 'rejected') && (
                        <Button size="sm" className="bg-green-600 text-white gap-1 text-xs" onClick={() => handleProviderStatusChange(providerDetail.provider.user_id, 'active', 'Reactivation admin')} data-testid="reactivate-provider-btn"><Play className="w-3 h-3" /> Reactiver</Button>
                      )}
                      {providerDetail.provider.status === 'pending' && (
                        <>
                          <Button size="sm" className="bg-green-600 text-white gap-1 text-xs" onClick={() => handleProviderStatusChange(providerDetail.provider.user_id, 'active', 'Validation admin')} data-testid="approve-provider-btn"><Check className="w-3 h-3" /> Valider</Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 gap-1 text-xs" onClick={() => handleProviderStatusChange(providerDetail.provider.user_id, 'rejected', 'Refus admin')} data-testid="reject-provider-btn"><X className="w-3 h-3" /> Refuser</Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Subscription */}
                  <div className="bg-white border border-slate-200 p-5">
                    <h3 className="font-heading font-bold uppercase text-xs text-slate-500 mb-3">Abonnement</h3>
                    {providerDetail.subscription ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                            providerDetail.subscription.status === 'active' ? 'bg-green-100 text-green-700' :
                            providerDetail.subscription.status === 'trial' ? 'bg-blue-100 text-blue-700' :
                            providerDetail.subscription.status === 'suspended' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>{providerDetail.subscription.status}</span>
                          <span className="font-heading font-bold text-brand">{providerDetail.subscription.price}€/mois</span>
                        </div>
                        {providerDetail.subscription.trial_end && providerDetail.subscription.status === 'trial' && (
                          <p className="text-xs text-blue-600"><Clock className="w-3 h-3 inline mr-1" />Essai jusqu'au {format(new Date(providerDetail.subscription.trial_end), 'd MMM yyyy', { locale: fr })}</p>
                        )}
                        {providerDetail.subscription.current_period_end && (
                          <p className="text-xs text-slate-500">Fin de periode: {format(new Date(providerDetail.subscription.current_period_end), 'd MMM yyyy', { locale: fr })}</p>
                        )}
                        <p className="text-xs text-slate-500">Mensualites payees: <strong>{providerDetail.subscription.payments_made || 0}</strong>/{providerDetail.subscription.commitment_months || 12}</p>
                        <p className="text-xs text-slate-500">Total paye: <strong className="text-brand">{(providerDetail.subscription.total_paid || 0).toFixed(2)}€</strong></p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">Aucun abonnement</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                      <Button size="sm" className="bg-brand text-white gap-1 text-xs" onClick={() => { setSelectedProvider(providerDetail.provider.user_id); setSubAction({ action: 'activate', days: 30, months: 1, reason: '' }); setShowSubActionDialog(true); }} data-testid="activate-sub-btn"><Play className="w-3 h-3" /> Activer</Button>
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { setSelectedProvider(providerDetail.provider.user_id); setSubAction({ action: 'extend', days: 30, months: 1, reason: '' }); setShowSubActionDialog(true); }} data-testid="extend-sub-btn"><ArrowRight className="w-3 h-3" /> Prolonger</Button>
                      <Button size="sm" variant="outline" className="gap-1 text-xs text-green-600" onClick={() => { setSelectedProvider(providerDetail.provider.user_id); setSubAction({ action: 'gift', days: 30, months: 1, reason: '' }); setShowSubActionDialog(true); }} data-testid="gift-sub-btn"><Gift className="w-3 h-3" /> Offrir</Button>
                      <Button size="sm" variant="outline" className="gap-1 text-xs text-red-600" onClick={() => { setSelectedProvider(providerDetail.provider.user_id); setSubAction({ action: 'cancel', days: 30, months: 1, reason: '' }); setShowSubActionDialog(true); }} data-testid="cancel-sub-btn"><X className="w-3 h-3" /> Resilier</Button>
                    </div>
                  </div>

                  {/* KPIs */}
                  <div className="bg-white border border-slate-200 p-5">
                    <h3 className="font-heading font-bold uppercase text-xs text-slate-500 mb-3">Activite</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Produits', value: providerDetail.products_count, icon: Package, color: 'text-violet-600' },
                        { label: 'Commandes', value: providerDetail.orders_count, icon: ShoppingBag, color: 'text-blue-600' },
                        { label: 'Payees', value: providerDetail.paid_orders_count, icon: CheckCircle, color: 'text-green-600' },
                        { label: 'CA Total', value: `${providerDetail.total_revenue}€`, icon: Euro, color: 'text-brand' }
                      ].map((kpi, i) => (
                        <div key={i} className="text-center p-3 bg-slate-50 rounded">
                          <kpi.icon className={`w-4 h-4 mx-auto mb-1 ${kpi.color}`} />
                          <p className={`font-heading font-extrabold text-lg ${kpi.color}`}>{kpi.value}</p>
                          <p className="text-[10px] text-slate-400 uppercase">{kpi.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 p-4" data-testid="provider-revenue-chart">
                    <h3 className="font-heading font-bold uppercase text-sm mb-4">Revenus mensuels (12 mois)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={providerDetail.monthly_revenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}€`} />
                        <Tooltip formatter={(v) => `${v}€`} />
                        <Bar dataKey="revenue" fill="#FF5A1F" radius={[4, 4, 0, 0]} name="Revenus" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white border border-slate-200 p-4" data-testid="provider-orders-chart">
                    <h3 className="font-heading font-bold uppercase text-sm mb-4">Commandes mensuelles</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={providerDetail.monthly_revenue}>
                        <defs>
                          <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="orders" name="Commandes" stroke="#3b82f6" fill="url(#gradOrders)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Subscription Payments + Recent Orders */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200" data-testid="sub-payments-table">
                    <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase text-sm">Paiements abonnement</h3></div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50"><tr>
                          <th className="text-left p-3 text-xs font-heading font-bold uppercase">Date</th>
                          <th className="text-right p-3 text-xs font-heading font-bold uppercase">Montant</th>
                          <th className="text-center p-3 text-xs font-heading font-bold uppercase">Statut</th>
                        </tr></thead>
                        <tbody>
                          {(providerDetail.subscription_payments || []).map((sp, i) => (
                            <tr key={i} className="border-b hover:bg-slate-50">
                              <td className="p-3 text-xs">{sp.created_at ? format(new Date(sp.created_at), 'd MMM yyyy HH:mm', { locale: fr }) : '—'}</td>
                              <td className="p-3 text-right font-heading font-bold text-brand">{sp.amount}€</td>
                              <td className="p-3 text-center"><span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${sp.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{sp.status === 'completed' ? 'Paye' : 'En attente'}</span></td>
                            </tr>
                          ))}
                          {(!providerDetail.subscription_payments || providerDetail.subscription_payments.length === 0) && <tr><td colSpan="3" className="p-4 text-center text-slate-400 text-xs">Aucun paiement</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200" data-testid="recent-orders-table">
                    <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase text-sm">Commandes recentes</h3></div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50"><tr>
                          <th className="text-left p-3 text-xs font-heading font-bold uppercase">Client</th>
                          <th className="text-right p-3 text-xs font-heading font-bold uppercase">Montant</th>
                          <th className="text-center p-3 text-xs font-heading font-bold uppercase">Statut</th>
                          <th className="text-left p-3 text-xs font-heading font-bold uppercase">Date</th>
                        </tr></thead>
                        <tbody>
                          {(providerDetail.recent_orders || []).map((o, i) => (
                            <tr key={i} className="border-b hover:bg-slate-50">
                              <td className="p-3 text-xs font-medium">{o.user_name || 'Anonyme'}</td>
                              <td className="p-3 text-right font-heading font-bold">{o.total?.toFixed(2)}€</td>
                              <td className="p-3 text-center"><span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${o.status === 'completed' || o.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{o.status}</span></td>
                              <td className="p-3 text-xs text-slate-500">{o.created_at ? format(new Date(o.created_at), 'd MMM', { locale: fr }) : '—'}</td>
                            </tr>
                          ))}
                          {(!providerDetail.recent_orders || providerDetail.recent_orders.length === 0) && <tr><td colSpan="4" className="p-4 text-center text-slate-400 text-xs">Aucune commande</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Action Log */}
                <div className="bg-white border border-slate-200" data-testid="action-log">
                  <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase text-sm">Historique des actions admin</h3></div>
                  <div className="divide-y">
                    {(providerDetail.action_log || []).map((log, i) => (
                      <div key={i} className="p-3 flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{log.details}</p>
                          {log.reason && <p className="text-xs text-slate-500">Raison: {log.reason}</p>}
                          <p className="text-[10px] text-slate-400">{log.admin_name} — {log.created_at ? format(new Date(log.created_at), 'd MMM yyyy HH:mm', { locale: fr }) : ''}</p>
                        </div>
                      </div>
                    ))}
                    {(!providerDetail.action_log || providerDetail.action_log.length === 0) && <div className="p-4 text-center text-slate-400 text-xs">Aucune action enregistree</div>}
                  </div>
                </div>
              </motion.div>
            ) : providerDetailLoading ? (
              <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand" /></div>
            ) : (
              /* Provider List View */
              <>
                <h2 className="font-heading text-xl font-bold uppercase">Gestion des partenaires</h2>

                {/* Stats Cards */}
                {providerStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[
                      { label: 'Total', value: providerStats.total, color: 'text-slate-800', bg: 'border-slate-300' },
                      { label: 'Actifs', value: providerStats.active, color: 'text-green-600', bg: 'border-green-500' },
                      { label: 'En attente', value: providerStats.pending, color: 'text-amber-600', bg: 'border-amber-500' },
                      { label: 'Suspendus', value: providerStats.suspended, color: 'text-red-600', bg: 'border-red-500' },
                      { label: 'Abo Essai', value: providerStats.sub_trial, color: 'text-blue-600', bg: 'border-blue-500' },
                      { label: 'Abo Actif', value: providerStats.sub_active, color: 'text-emerald-600', bg: 'border-emerald-500' },
                      { label: 'Rev. Abo', value: `${providerStats.total_sub_revenue}€`, color: 'text-brand', bg: 'border-brand' }
                    ].map((s, i) => (
                      <div key={i} className={`bg-white border-l-4 ${s.bg} p-3 text-center`} data-testid={`prov-stat-${i}`}>
                        <p className={`font-heading font-extrabold text-xl ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-heading">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search + Filter */}
                <div className="flex gap-3 items-center">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input placeholder="Rechercher un partenaire..." className="pl-9" value={providerSearch} onChange={e => setProviderSearch(e.target.value)} data-testid="provider-search" />
                  </div>
                  <Select value={providerStatusFilter} onValueChange={setProviderStatusFilter}>
                    <SelectTrigger className="w-40" data-testid="provider-filter"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="active">Actifs</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="suspended">Suspendus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Providers Table */}
                <div className="bg-white border border-slate-200" data-testid="providers-table">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-3 font-heading text-xs font-bold uppercase">Partenaire</th>
                          <th className="text-center p-3 font-heading text-xs font-bold uppercase">Statut</th>
                          <th className="text-center p-3 font-heading text-xs font-bold uppercase">Abonnement</th>
                          <th className="text-right p-3 font-heading text-xs font-bold uppercase">Produits</th>
                          <th className="text-right p-3 font-heading text-xs font-bold uppercase">Commandes</th>
                          <th className="text-right p-3 font-heading text-xs font-bold uppercase">CA</th>
                          <th className="text-center p-3 font-heading text-xs font-bold uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailedProviders
                          .filter(p => {
                            if (providerStatusFilter !== 'all' && p.status !== providerStatusFilter) return false;
                            if (providerSearch) {
                              const q = providerSearch.toLowerCase();
                              return (p.name || '').toLowerCase().includes(q) || (p.company_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q);
                            }
                            return true;
                          })
                          .map(p => (
                          <tr key={p.user_id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedProvider(p.user_id); fetchProviderDetail(p.user_id); }} data-testid={`provider-row-${p.user_id}`}>
                            <td className="p-3">
                              <p className="font-heading font-bold text-sm">{p.company_name || p.name}</p>
                              <p className="text-xs text-slate-400">{p.email}</p>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${p.status === 'active' ? 'bg-green-100 text-green-700' : p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                {p.status === 'active' ? 'Actif' : p.status === 'pending' ? 'En attente' : 'Suspendu'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {p.subscription ? (
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  p.subscription.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                  p.subscription.status === 'trial' ? 'bg-blue-100 text-blue-700' :
                                  p.subscription.status === 'suspended' ? 'bg-red-100 text-red-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>{p.subscription.status}</span>
                              ) : <span className="text-xs text-slate-400">—</span>}
                            </td>
                            <td className="p-3 text-right font-heading font-bold">{p.products_count}</td>
                            <td className="p-3 text-right font-heading font-bold">{p.orders_count}</td>
                            <td className="p-3 text-right font-heading font-bold text-brand">{p.total_revenue}€</td>
                            <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedProvider(p.user_id); fetchProviderDetail(p.user_id); }} data-testid={`view-provider-${p.user_id}`}><Eye className="w-3.5 h-3.5" /></Button>
                                {p.status === 'active' && (
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => { const r = prompt('Raison de la suspension:'); if (r) handleProviderStatusChange(p.user_id, 'suspended', r); }} data-testid={`quick-suspend-${p.user_id}`}><Ban className="w-3.5 h-3.5" /></Button>
                                )}
                                {p.status === 'pending' && (
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-500" onClick={() => handleProviderStatusChange(p.user_id, 'active', 'Validation admin')} data-testid={`quick-approve-${p.user_id}`}><Check className="w-3.5 h-3.5" /></Button>
                                )}
                                {(p.status === 'suspended' || p.status === 'rejected') && (
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-500" onClick={() => handleProviderStatusChange(p.user_id, 'active', 'Reactivation admin')} data-testid={`quick-reactivate-${p.user_id}`}><Play className="w-3.5 h-3.5" /></Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {detailedProviders.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-slate-400">Aucun partenaire inscrit</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Subscription Action Dialog */}
            <Dialog open={showSubActionDialog} onOpenChange={setShowSubActionDialog}>
              <DialogContent aria-describedby="sub-action-desc">
                <DialogHeader>
                  <DialogTitle className="font-heading uppercase">
                    {subAction.action === 'activate' ? 'Activer l\'abonnement' :
                     subAction.action === 'extend' ? 'Prolonger l\'abonnement' :
                     subAction.action === 'gift' ? 'Offrir des mois' :
                     'Resilier l\'abonnement'}
                  </DialogTitle>
                </DialogHeader>
                <div id="sub-action-desc" className="space-y-4">
                  {subAction.action === 'extend' && (
                    <div>
                      <Label>Nombre de jours</Label>
                      <Input type="number" value={subAction.days} onChange={e => setSubAction(prev => ({ ...prev, days: parseInt(e.target.value) || 30 }))} />
                    </div>
                  )}
                  {subAction.action === 'gift' && (
                    <div>
                      <Label>Nombre de mois offerts</Label>
                      <Input type="number" value={subAction.months} onChange={e => setSubAction(prev => ({ ...prev, months: parseInt(e.target.value) || 1 }))} />
                    </div>
                  )}
                  <div>
                    <Label>Raison (optionnel)</Label>
                    <Input value={subAction.reason} onChange={e => setSubAction(prev => ({ ...prev, reason: e.target.value }))} placeholder="Motif de l'action..." />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowSubActionDialog(false)}>Annuler</Button>
                    <Button className="bg-brand text-white" onClick={handleSubAction} data-testid="confirm-sub-action">Confirmer</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
