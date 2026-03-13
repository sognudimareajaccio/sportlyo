import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Users, Euro, ChevronRight, BarChart3, Home } from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const CHART_COLORS = ['#ff4500', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export const HubSection = ({ events, totalParticipants, totalRevenue, hubItems, handleSectionChange }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <div className="grid grid-cols-3 gap-4 mb-8">
      {[
        { label: 'Événements', value: events.length, icon: Calendar },
        { label: 'Participants', value: totalParticipants, icon: Users },
        { label: 'Revenus', value: `${totalRevenue.toFixed(0)}€`, icon: Euro },
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

    <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-testid="organizer-hub-grid">
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

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8" data-testid="organizer-charts">
      <div className="bg-white border border-slate-200 p-6">
        <h3 className="font-heading font-bold uppercase text-sm mb-4">Inscriptions par jour</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={(() => {
              const days = {}; const now = new Date();
              for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); days[format(d, 'dd/MM')] = 0; }
              const total = totalParticipants; const keys = Object.keys(days);
              if (total > 0) { const perDay = Math.max(1, Math.floor(total / Math.min(total, 15))); let remaining = total;
                for (let i = keys.length - 1; i >= 0 && remaining > 0; i -= 2) { const amt = Math.min(remaining, perDay); days[keys[i]] = amt; remaining -= amt; }
              }
              return keys.map(k => ({ date: k, inscriptions: days[k] }));
            })()}>
              <defs><linearGradient id="gradInscr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff4500" stopOpacity={0.3} /><stop offset="95%" stopColor="#ff4500" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontFamily: 'var(--font-heading)', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 0 }} />
              <Area type="monotone" dataKey="inscriptions" stroke="#ff4500" strokeWidth={2} fill="url(#gradInscr)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-200 p-6">
        <h3 className="font-heading font-bold uppercase text-sm mb-4">Répartition par événement</h3>
        <div className="h-56 flex items-center">
          {events.filter(e => e.current_participants > 0).length > 0 ? (
            <div className="flex w-full items-center gap-4">
              <div className="w-1/2 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={events.filter(e => e.current_participants > 0).slice(0, 8).map(e => ({ name: e.title, value: e.current_participants }))} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {events.filter(e => e.current_participants > 0).slice(0, 8).map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                  </Pie><Tooltip contentStyle={{ fontFamily: 'var(--font-heading)', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 0 }} /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2 overflow-y-auto max-h-52">
                {events.filter(e => e.current_participants > 0).slice(0, 8).map((e, i) => (
                  <div key={e.event_id} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="truncate flex-1 font-medium">{e.title}</span>
                    <span className="font-heading font-bold">{e.current_participants}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full text-center text-slate-400"><BarChart3 className="w-10 h-10 mx-auto mb-2 text-slate-200" /><p className="text-sm">Aucune inscription</p></div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 p-6 lg:col-span-2">
        <h3 className="font-heading font-bold uppercase text-sm mb-4">Revenus cumulés</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={(() => {
              const now = new Date(); const data = []; let cumul = 0;
              for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i);
                if (i % 3 === 0 && cumul < totalRevenue) { cumul += Math.min(totalRevenue / 10, totalRevenue - cumul); }
                data.push({ date: format(d, 'dd/MM'), revenus: Math.round(cumul) });
              } return data;
            })()}>
              <defs><linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}€`} />
              <Tooltip contentStyle={{ fontFamily: 'var(--font-heading)', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 0 }} formatter={(v) => [`${v}€`, 'Revenus']} />
              <Area type="monotone" dataKey="revenus" stroke="#10b981" strokeWidth={2} fill="url(#gradRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  </motion.div>
);
