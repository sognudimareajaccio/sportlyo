import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, Users, Calendar, Euro, CheckCircle, ShoppingBag, Filter } from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../services/api';

const COLORS = ['#FF4500', '#1e293b', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const OrganizerAnalyticsSection = () => {
  const [analytics, setAnalytics] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState('all');

  const fetchAnalytics = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/organizer/analytics?period=${period}`);
      setAnalytics(res.data);
    } catch {}
    finally { setLoading(false); }
  }, [period]);

  React.useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) return <div className="text-center py-8 text-slate-400">Chargement...</div>;
  if (!analytics) return <div className="text-center py-8 text-slate-400">Aucune donnee</div>;

  const { overview, events, monthly_trend, tshirt_distribution } = analytics;

  // Data for pie chart (registrations per event)
  const pieData = events.filter(e => e.registrations > 0).map(e => ({ name: e.title.length > 20 ? e.title.slice(0, 20) + '...' : e.title, value: e.registrations }));
  // Revenue per event for bar chart
  const barData = events.filter(e => e.revenue > 0).map(e => ({ name: e.title.length > 15 ? e.title.slice(0, 15) + '...' : e.title, revenue: e.revenue, inscrits: e.registrations }));

  return (
    <div className="space-y-6" data-testid="analytics-section">
      {/* Period filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-heading uppercase text-slate-500">Periode</span>
        </div>
        <div className="flex gap-1" data-testid="analytics-period-filter">
          {[
            { value: 'all', label: 'Tout' },
            { value: '30d', label: '30 jours' },
            { value: '90d', label: '3 mois' },
            { value: '365d', label: '1 an' },
          ].map(p => (
            <Button
              key={p.value}
              size="sm"
              variant={period === p.value ? 'default' : 'outline'}
              className={`text-xs h-7 ${period === p.value ? 'bg-brand' : ''}`}
              onClick={() => setPeriod(p.value)}
              data-testid={`period-${p.value}`}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: Calendar, label: 'Evenements', value: overview.total_events, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Users, label: 'Inscriptions', value: overview.total_registrations, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: Euro, label: 'Revenus', value: `${overview.total_revenue.toFixed(0)}€`, color: 'text-brand', bg: 'bg-orange-50' },
          { icon: ShoppingBag, label: 'Boutique', value: `${overview.shop_revenue.toFixed(0)}€`, color: 'text-purple-600', bg: 'bg-purple-50' },
          { icon: CheckCircle, label: 'Check-in', value: `${overview.checkin_rate}%`, color: 'text-green-600', bg: 'bg-green-50' },
          { icon: TrendingUp, label: 'Revenu total', value: `${(overview.total_revenue + overview.shop_revenue).toFixed(0)}€`, color: 'text-slate-800', bg: 'bg-slate-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} border border-slate-200 p-3`} data-testid={`analytics-kpi-${i}`}>
            <s.icon className={`w-4 h-4 ${s.color} mb-1`} />
            <p className={`font-heading font-black text-xl ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-500 uppercase font-heading">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Revenue Trend */}
        {monthly_trend.length > 0 && (
          <div className="bg-white border border-slate-200 p-4" data-testid="analytics-monthly-chart">
            <h3 className="font-heading font-bold text-sm uppercase mb-4">Tendance mensuelle</h3>
            <ResponsiveContainer width="100%" height={220} minHeight={220}>
              <LineChart data={monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tickFormatter={v => v.slice(5)} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v, name) => [`${v}${name === 'revenue' ? '€' : ''}`, name === 'revenue' ? 'Revenus' : 'Inscriptions']} />
                <Legend formatter={v => v === 'revenue' ? 'Revenus (€)' : 'Inscriptions'} />
                <Line type="monotone" dataKey="revenue" stroke="#FF4500" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="registrations" stroke="#1e293b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Registrations Distribution Pie */}
        {pieData.length > 0 && (
          <div className="bg-white border border-slate-200 p-4" data-testid="analytics-pie-chart">
            <h3 className="font-heading font-bold text-sm uppercase mb-4">Repartition inscriptions</h3>
            <ResponsiveContainer width="100%" height={220} minHeight={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Revenue per event bar chart */}
      {barData.length > 0 && (
        <div className="bg-white border border-slate-200 p-4" data-testid="analytics-bar-chart">
          <h3 className="font-heading font-bold text-sm uppercase mb-4">Revenus par evenement</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 40)} minHeight={200}>
            <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v, name) => [`${v}${name === 'revenue' ? '€' : ''}`, name === 'revenue' ? 'Revenus' : 'Inscrits']} />
              <Bar dataKey="revenue" fill="#FF4500" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Events detail table */}
      {events.length > 0 && (
        <div className="bg-white border border-slate-200" data-testid="analytics-events-table">
          <div className="p-4 border-b"><h3 className="font-heading font-bold text-sm uppercase">Detail par evenement</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 font-heading text-xs font-bold uppercase">Evenement</th>
                  <th className="text-center p-3 font-heading text-xs font-bold uppercase">Inscrits</th>
                  <th className="text-right p-3 font-heading text-xs font-bold uppercase">Revenus</th>
                  <th className="text-center p-3 font-heading text-xs font-bold uppercase">Check-in</th>
                  <th className="text-left p-3 font-heading text-xs font-bold uppercase">Courses</th>
                </tr>
              </thead>
              <tbody>
                {events.map(evt => (
                  <tr key={evt.event_id} className="border-b hover:bg-slate-50">
                    <td className="p-3">
                      <p className="font-medium">{evt.title}</p>
                      <p className="text-[10px] text-slate-400">{evt.location}</p>
                    </td>
                    <td className="p-3 text-center font-heading font-bold">{evt.registrations}</td>
                    <td className="p-3 text-right font-heading font-bold text-brand">{evt.revenue.toFixed(0)}€</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold ${evt.checkin_rate >= 80 ? 'bg-green-100 text-green-700' : evt.checkin_rate >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                        {evt.checkin_rate}%
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {evt.races?.map((r, ri) => (
                          <span key={ri} className="px-1.5 py-0.5 bg-slate-100 text-[10px]">{r.name}: {r.count}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* T-shirt distribution */}
      {tshirt_distribution.length > 0 && (
        <div className="bg-white border border-slate-200 p-4" data-testid="analytics-tshirts">
          <h3 className="font-heading font-bold text-sm uppercase mb-3">Repartition tailles T-shirt</h3>
          <div className="flex gap-3">
            {tshirt_distribution.map((t, i) => {
              const max = Math.max(...tshirt_distribution.map(x => x.count), 1);
              return (
                <div key={i} className="flex-1 text-center">
                  <div className="w-full bg-slate-100 rounded-t overflow-hidden" style={{ height: '60px' }}>
                    <div className="w-full bg-brand/80 rounded-t" style={{ height: `${(t.count / max) * 100}%`, marginTop: `${100 - (t.count / max) * 100}%` }} />
                  </div>
                  <p className="font-heading font-bold text-sm mt-1">{t.count}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{t.size}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerAnalyticsSection;
