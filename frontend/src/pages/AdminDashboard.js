import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Users, Calendar, Euro, TrendingUp, BarChart3,
  Settings, Search, ChevronLeft, ChevronRight, Download, FileText
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';
import api from '../services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
      const [statsRes, usersRes, paymentsRes, eventsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers({ page: 1, limit: 20 }),
        adminApi.getPayments({ page: 1, limit: 100 }),
        api.get('/events')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setTotalUserPages(usersRes.data.pages);
      setPayments(paymentsRes.data.payments);
      setPaymentTotals(paymentsRes.data.totals);
      setEvents(eventsRes.data.events || eventsRes.data || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
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

  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams({ format });
      if (exportStartDate) params.append('start_date', exportStartDate);
      if (exportEndDate) params.append('end_date', exportEndDate);
      
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
            <div className="flex gap-2">
              {['overview', 'users', 'payments'].map(tab => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? 'default' : 'outline'}
                  className={activeTab === tab ? 'bg-brand' : 'border-white text-white'}
                  onClick={() => setActiveTab(tab)}
                  data-testid={`tab-${tab}`}
                >
                  {tab === 'overview' ? 'Vue d\'ensemble' : tab === 'users' ? 'Utilisateurs' : 'Paiements'}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && stats && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { icon: Users, label: 'Utilisateurs', value: stats.total_users },
                { icon: Calendar, label: 'Événements', value: stats.total_events },
                { icon: TrendingUp, label: 'Inscriptions', value: stats.total_registrations },
                { icon: Euro, label: 'Net Plateforme', value: `${(paymentTotals?.total_platform_net || 0).toFixed(2)}€` }
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  className="stats-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                >
                  <stat.icon className="w-8 h-8 text-brand mb-2" />
                  <p className="text-2xl font-heading font-bold">{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
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
            <div className="bg-white border border-slate-200 mb-8" data-testid="events-fill-rate">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-heading font-bold uppercase">Jauges de remplissage — Temps réel</h3>
                <span className="text-xs text-slate-400">{events.length} événement(s)</span>
              </div>
              <div className="divide-y">
                {events.map(evt => {
                  const used = evt.current_participants || 0;
                  const total = evt.max_participants || 1;
                  const fill = Math.round((used / total) * 100);
                  const remaining = total - used;
                  return (
                    <div key={evt.event_id} className="p-4 hover:bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-heading font-bold text-sm uppercase truncate">{evt.title}</h4>
                          <p className="text-xs text-slate-500">{evt.location} — {evt.date && format(new Date(evt.date), 'd MMM yyyy', { locale: fr })}</p>
                        </div>
                        <div className="flex items-center gap-6 ml-4 flex-shrink-0">
                          <div className="text-right">
                            <span className="font-heading text-lg font-bold">{used}</span>
                            <span className="text-slate-400 text-sm"> / {total}</span>
                          </div>
                          <div className="text-right w-16">
                            <span className={`font-heading text-lg font-bold ${fill >= 90 ? 'text-red-600' : fill >= 70 ? 'text-orange-500' : 'text-green-600'}`}>
                              {fill}%
                            </span>
                          </div>
                          <div className={`text-right w-24 text-sm font-medium ${remaining <= 5 ? 'text-red-600' : 'text-slate-600'}`}>
                            {remaining} place{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-sm overflow-hidden">
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
                                  <span className="truncate font-medium">{race.name}</span>
                                  <span className="text-slate-400 ml-1">{rUsed}/{rTotal}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-sm overflow-hidden">
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
                  <div className="p-8 text-center text-slate-400">Aucun événement</div>
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
            {/* Export Controls */}
            <div className="bg-white border border-slate-200 p-4" data-testid="export-controls">
              <div className="flex flex-wrap items-end gap-4">
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
      </div>
    </div>
  );
};

export default AdminDashboard;
