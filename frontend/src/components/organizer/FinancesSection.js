import React from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, Heart, Crown, ShoppingBag, Building2, Download, FileText,
  Loader2, CheckCircle, TrendingUp, Wallet
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const SOURCE_CONFIG = {
  inscriptions: { icon: CreditCard, color: '#3b82f6', border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-600', pill: 'bg-blue-100 text-blue-700' },
  dons: { icon: Heart, color: '#ec4899', border: 'border-pink-500', bg: 'bg-pink-50', text: 'text-pink-600', pill: 'bg-pink-100 text-pink-700' },
  sponsors: { icon: Crown, color: '#f59e0b', border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-600', pill: 'bg-amber-100 text-amber-700' },
  produits: { icon: ShoppingBag, color: '#8b5cf6', border: 'border-violet-500', bg: 'bg-violet-50', text: 'text-violet-600', pill: 'bg-violet-100 text-violet-700' },
  reservations: { icon: Building2, color: '#0891b2', border: 'border-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-600', pill: 'bg-cyan-100 text-cyan-700' }
};

export const FinancesSection = ({ revenueData, revenueLoading, onExportCSV, onExportPDF }) => {
  if (revenueLoading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand" /></div>;
  if (!revenueData) return <div className="p-12 text-center text-slate-400">Chargement...</div>;

  const sourceEntries = Object.entries(revenueData.sources);

  return (
    <div className="space-y-6">
      {/* Grand Total Banner */}
      <div className="bg-asphalt text-white p-6 border-l-4 border-brand">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-heading uppercase text-slate-400">Chiffre d'affaires total</p>
            <p className="text-4xl font-heading font-extrabold text-brand" data-testid="org-grand-total">{revenueData.grand_total.toLocaleString()}€</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-heading uppercase text-slate-400">Frais plateforme (5%)</p>
            <p className="text-xl font-heading font-bold text-red-400" data-testid="org-grand-fees">-{revenueData.grand_fees.toLocaleString()}€</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-heading uppercase text-slate-400">Revenu net</p>
            <p className="text-3xl font-heading font-extrabold text-green-400" data-testid="org-grand-net">{revenueData.grand_net.toLocaleString()}€</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 gap-1" onClick={() => onExportCSV('all')} data-testid="finance-export-csv"><Download className="w-3.5 h-3.5" /> CSV</Button>
            <Button size="sm" className="bg-brand hover:bg-brand/90 gap-1" onClick={() => onExportPDF('all')} data-testid="finance-export-pdf"><FileText className="w-3.5 h-3.5" /> PDF</Button>
          </div>
        </div>
      </div>

      {/* Source Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {sourceEntries.map(([key, src], i) => {
          const cfg = SOURCE_CONFIG[key];
          const Icon = cfg.icon;
          return (
            <motion.div key={key} className={`bg-white border-l-4 ${cfg.border} p-4`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} data-testid={`org-source-card-${key}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 ${cfg.bg} flex items-center justify-center rounded`}><Icon className={`w-3.5 h-3.5 ${cfg.text}`} /></div>
                <span className="text-[10px] font-heading uppercase text-slate-500 font-bold">{src.label}</span>
              </div>
              <p className="text-xl font-heading font-extrabold">{src.total.toLocaleString()}€</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-slate-400">{src.count} transaction(s)</span>
                <span className="text-[10px] text-green-600 font-bold">Net: {src.net.toLocaleString()}€</span>
              </div>
              {src.pending_total > 0 && (
                <div className="mt-1 text-[10px] text-amber-600 font-medium">{src.pending_count} en attente ({src.pending_total.toLocaleString()}€)</div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Evolution Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-4">
          <h3 className="font-heading font-bold uppercase text-sm mb-4">Evolution des revenus (12 mois)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData.monthly}>
              <defs>
                {Object.entries(SOURCE_CONFIG).map(([k, v]) => (
                  <linearGradient key={k} id={`orgGrad_${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={v.color} stopOpacity={0.3} /><stop offset="100%" stopColor={v.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}€`} />
              <Tooltip formatter={(v) => `${v.toLocaleString()}€`} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="inscriptions" name="Inscriptions" stroke="#3b82f6" fill="url(#orgGrad_inscriptions)" strokeWidth={2} />
              <Area type="monotone" dataKey="dons" name="Dons" stroke="#ec4899" fill="url(#orgGrad_dons)" strokeWidth={2} />
              <Area type="monotone" dataKey="sponsors" name="Sponsors" stroke="#f59e0b" fill="url(#orgGrad_sponsors)" strokeWidth={2} />
              <Area type="monotone" dataKey="produits" name="Produits" stroke="#8b5cf6" fill="url(#orgGrad_produits)" strokeWidth={2} />
              <Area type="monotone" dataKey="reservations" name="Reservations" stroke="#0891b2" fill="url(#orgGrad_reservations)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white border border-slate-200 p-4">
          <h3 className="font-heading font-bold uppercase text-sm mb-4">Repartition des revenus</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={sourceEntries.filter(([, v]) => v.total > 0).map(([k, v]) => ({ name: v.label, value: v.total, key: k }))}
                cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}
              >
                {sourceEntries.filter(([, v]) => v.total > 0).map(([k]) => <Cell key={k} fill={SOURCE_CONFIG[k].color} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v.toLocaleString()}€`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {sourceEntries.filter(([, v]) => v.total > 0).map(([k, v]) => {
              const pct = revenueData.grand_total > 0 ? ((v.total / revenueData.grand_total) * 100).toFixed(1) : 0;
              return (
                <div key={k} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SOURCE_CONFIG[k].color }} />{v.label}</div>
                  <span className="font-heading font-bold">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Bar Chart - Net Revenue */}
      <div className="bg-white border border-slate-200 p-4">
        <h3 className="font-heading font-bold uppercase text-sm mb-4">Revenus mensuels totaux</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={revenueData.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}€`} />
            <Tooltip formatter={(v) => `${v.toLocaleString()}€`} />
            <Bar dataKey="total" name="Total mensuel" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-Event Breakdown */}
      {revenueData.events_breakdown && revenueData.events_breakdown.length > 0 && (
        <div className="bg-white border border-slate-200">
          <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase">Detail par evenement</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="org-events-breakdown-table">
              <thead className="bg-slate-50"><tr>
                <th className="text-left p-3 font-heading text-xs font-bold uppercase">Evenement</th>
                <th className="text-right p-3 font-heading text-xs font-bold uppercase">Inscrits</th>
                <th className="text-right p-3 font-heading text-xs font-bold uppercase">Prix unitaire</th>
                <th className="text-right p-3 font-heading text-xs font-bold uppercase">Revenus bruts</th>
                <th className="text-right p-3 font-heading text-xs font-bold uppercase">Frais plateforme</th>
                <th className="text-right p-3 font-heading text-xs font-bold uppercase">Revenu net</th>
              </tr></thead>
              <tbody>
                {revenueData.events_breakdown.map(evt => (
                  <tr key={evt.event_id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-heading font-bold">{evt.title}</td>
                    <td className="p-3 text-right">{evt.inscriptions_count} / {evt.max_participants}</td>
                    <td className="p-3 text-right">{evt.price}€</td>
                    <td className="p-3 text-right font-bold">{evt.inscriptions_total.toLocaleString()}€</td>
                    <td className="p-3 text-right text-red-500">-{evt.inscriptions_fees.toLocaleString()}€</td>
                    <td className="p-3 text-right font-heading font-bold text-green-600">{(evt.inscriptions_total - evt.inscriptions_fees).toLocaleString()}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white border border-slate-200">
        <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase">Dernieres transactions (toutes sources)</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="org-recent-transactions-table">
            <thead className="bg-slate-50"><tr>
              <th className="text-left p-3 font-heading text-xs font-bold uppercase">Source</th>
              <th className="text-left p-3 font-heading text-xs font-bold uppercase">Description</th>
              <th className="text-right p-3 font-heading text-xs font-bold uppercase">Montant</th>
              <th className="text-right p-3 font-heading text-xs font-bold uppercase">Frais</th>
              <th className="text-left p-3 font-heading text-xs font-bold uppercase">Statut</th>
              <th className="text-left p-3 font-heading text-xs font-bold uppercase">Date</th>
            </tr></thead>
            <tbody>
              {revenueData.recent_transactions.map((t, i) => {
                const cfg = SOURCE_CONFIG[t.type] || SOURCE_CONFIG.inscriptions;
                const label = { inscription: 'Inscription', don: 'Don', sponsor: 'Sponsor', produit: 'Produit', reservation: 'Reservation' }[t.type] || t.type;
                return (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    <td className="p-3"><span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${cfg.pill}`}>{label}</span></td>
                    <td className="p-3">{t.label}</td>
                    <td className="p-3 text-right font-heading font-bold">{t.amount?.toLocaleString()}€</td>
                    <td className="p-3 text-right text-red-500">{t.fee > 0 ? `-${t.fee.toLocaleString()}€` : '—'}</td>
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
    </div>
  );
};
