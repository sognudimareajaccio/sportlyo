import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Users, Calendar, Euro, TrendingUp, BarChart3,
  Settings, Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userPage, setUserPage] = useState(1);
  const [totalUserPages, setTotalUserPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

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
      const [statsRes, usersRes, paymentsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers({ page: 1, limit: 20 }),
        adminApi.getPayments({ page: 1, limit: 20 })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setTotalUserPages(usersRes.data.pages);
      setPayments(paymentsRes.data.payments);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

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
              <p className="text-slate-400">Gérez la plateforme SportsConnect</p>
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
                { icon: Euro, label: 'Commission', value: `${stats.platform_fees?.toFixed(0) || 0}€` }
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

            {/* Revenue Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white border border-slate-200 p-6">
                <h3 className="font-heading text-lg font-bold uppercase mb-4">Revenus Totaux</h3>
                <div className="text-4xl font-heading font-extrabold text-brand mb-2">
                  {stats.total_revenue?.toFixed(0) || 0}€
                </div>
                <p className="text-sm text-slate-500">Depuis le lancement</p>
              </div>
              <div className="bg-asphalt text-white border-l-4 border-brand p-6">
                <h3 className="font-heading text-lg font-bold uppercase mb-4">Commission Plateforme (6%)</h3>
                <div className="text-4xl font-heading font-extrabold text-brand mb-2">
                  {stats.platform_fees?.toFixed(0) || 0}€
                </div>
                <p className="text-sm text-slate-400">Revenus nets</p>
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
          <div className="bg-white border border-slate-200">
            <div className="p-4 border-b">
              <h3 className="font-heading font-bold uppercase">Historique des paiements</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 text-sm font-heading font-bold uppercase">ID</th>
                    <th className="text-left p-4 text-sm font-heading font-bold uppercase">Montant</th>
                    <th className="text-left p-4 text-sm font-heading font-bold uppercase">Commission</th>
                    <th className="text-left p-4 text-sm font-heading font-bold uppercase">Organisateur</th>
                    <th className="text-left p-4 text-sm font-heading font-bold uppercase">Statut</th>
                    <th className="text-left p-4 text-sm font-heading font-bold uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.payment_id} className="border-b hover:bg-slate-50">
                      <td className="p-4 text-sm font-mono">{p.payment_id?.slice(0, 12)}</td>
                      <td className="p-4 font-heading font-bold">{p.amount}€</td>
                      <td className="p-4 text-brand font-medium">{p.platform_fee}€</td>
                      <td className="p-4">{p.organizer_amount}€</td>
                      <td className="p-4">
                        <span className={`badge ${p.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                          {p.status === 'completed' ? 'Complété' : 'En attente'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {p.created_at && format(new Date(p.created_at), 'd MMM yyyy HH:mm', { locale: fr })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
