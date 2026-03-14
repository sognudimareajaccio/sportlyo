import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = ['#ff4500', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const ProviderSales = ({ salesData }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="provider-sales-section">
    <h3 className="font-heading font-bold text-base uppercase mb-4">Repartition des Ventes</h3>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-white border border-slate-200 p-6">
        <h4 className="font-heading font-bold uppercase text-xs mb-4">Top produits vendus</h4>
        {salesData.top_products.length > 0 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData.top_products} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontFamily: 'var(--font-heading)', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 0 }}
                  formatter={(v, name) => [name === 'quantity' ? `${v} unites` : `${v}€`, name === 'quantity' ? 'Quantite' : 'Chiffre d\'affaires']} />
                <Bar dataKey="quantity" fill="#ff4500" radius={[0, 3, 3, 0]} name="quantity" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-56 flex items-center justify-center text-slate-400 text-xs">Pas de donnees</div>
        )}
      </div>
      <div className="bg-white border border-slate-200 p-6">
        <h4 className="font-heading font-bold uppercase text-xs mb-4">Ventes par categorie</h4>
        {salesData.by_category.length > 0 ? (
          <div className="flex items-center gap-4 h-56">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={salesData.by_category} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {salesData.by_category.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} unites`, 'Vendu']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-2">
              {salesData.by_category.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="flex-1 font-medium truncate">{c.name}</span>
                  <span className="font-heading font-bold">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-56 flex items-center justify-center text-slate-400 text-xs">Pas de donnees</div>
        )}
      </div>
    </div>
    {salesData.by_size.length > 0 && (
      <div className="bg-white border border-slate-200 p-6">
        <h4 className="font-heading font-bold uppercase text-xs mb-4">Distribution par taille</h4>
        <div className="flex gap-3 flex-wrap">
          {salesData.by_size.map((s) => {
            const max = Math.max(...salesData.by_size.map(x => x.value));
            const pct = max > 0 ? (s.value / max) * 100 : 0;
            return (
              <div key={s.name} className="flex flex-col items-center" data-testid={`size-${s.name}`}>
                <div className="w-14 bg-slate-100 relative flex items-end justify-center" style={{ height: '80px' }}>
                  <div className="w-full bg-brand absolute bottom-0" style={{ height: `${pct}%` }} />
                </div>
                <p className="font-heading font-bold text-xs mt-2">{s.name}</p>
                <p className="text-[10px] text-slate-400">{s.value} unites</p>
              </div>
            );
          })}
        </div>
      </div>
    )}
    {salesData.top_products.length > 0 && (
      <div className="bg-white border border-slate-200 mt-6">
        <div className="p-4 border-b"><h4 className="font-heading font-bold uppercase text-xs">Detail chiffre d'affaires</h4></div>
        <table className="w-full">
          <thead className="bg-slate-50 text-[10px] font-heading uppercase text-slate-400">
            <tr><th className="text-left p-3">Produit</th><th className="text-right p-3">Quantite</th><th className="text-right p-3">CA</th></tr>
          </thead>
          <tbody className="divide-y text-sm">
            {salesData.top_products.map(p => (
              <tr key={p.product_id} className="hover:bg-slate-50">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-right font-heading font-bold">{p.quantity}</td>
                <td className="p-3 text-right font-heading font-bold text-brand">{p.revenue.toFixed(2)}€</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-heading font-bold text-sm">
            <tr>
              <td className="p-3">Total</td>
              <td className="p-3 text-right">{salesData.top_products.reduce((a, p) => a + p.quantity, 0)}</td>
              <td className="p-3 text-right text-brand">{salesData.top_products.reduce((a, p) => a + p.revenue, 0).toFixed(2)}€</td>
            </tr>
          </tfoot>
        </table>
      </div>
    )}
  </motion.div>
);

export default ProviderSales;
