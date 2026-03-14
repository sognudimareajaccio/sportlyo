import React from 'react';
import api from '../../services/api';

const OrganizerAnalyticsSection = () => {
  const [analytics, setAnalytics] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/organizer/analytics');
        setAnalytics(res.data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);
  if (loading) return <div className="text-center py-8 text-slate-400">Chargement...</div>;
  if (!analytics) return <div className="text-center py-8 text-slate-400">Aucune donnee</div>;
  const { overview, events, monthly_trend, tshirt_distribution } = analytics;
  return (
    <div className="space-y-6" data-testid="analytics-section">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Evenements', value: overview.total_events, color: 'text-blue-600' },
          { label: 'Inscriptions', value: overview.total_registrations, color: 'text-emerald-600' },
          { label: 'Revenus inscriptions', value: `${overview.total_revenue.toFixed(0)}€`, color: 'text-brand' },
          { label: 'Check-in rate', value: `${overview.checkin_rate}%`, color: 'text-purple-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 p-4 text-center" data-testid={`analytics-stat-${i}`}>
            <p className={`font-heading font-black text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 uppercase font-heading mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      {monthly_trend.length > 0 && (
        <div className="bg-white border border-slate-200 p-4" data-testid="analytics-monthly">
          <h3 className="font-heading font-bold text-sm uppercase mb-3">Tendance mensuelle</h3>
          <div className="flex items-end gap-2 h-32">
            {monthly_trend.map((m, i) => {
              const maxRev = Math.max(...monthly_trend.map(x => x.revenue), 1);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-slate-600">{m.revenue.toFixed(0)}€</span>
                  <div className="w-full bg-brand/80 rounded-t" style={{ height: `${(m.revenue / maxRev) * 100}%`, minHeight: '4px' }} />
                  <span className="text-[9px] text-slate-400">{m.month.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {events.length > 0 && (
        <div className="bg-white border border-slate-200" data-testid="analytics-events">
          <div className="p-4 border-b"><h3 className="font-heading font-bold text-sm uppercase">Par evenement</h3></div>
          <div className="divide-y">
            {events.map(evt => (
              <div key={evt.event_id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-heading font-bold text-sm">{evt.title}</p>
                    <p className="text-xs text-slate-500">{evt.location} — {evt.registrations} inscrits</p>
                  </div>
                  <p className="font-heading font-bold text-lg text-brand">{evt.revenue.toFixed(0)}€</p>
                </div>
                {evt.races?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {evt.races.map((r, ri) => (
                      <span key={ri} className="px-2 py-0.5 bg-slate-100 text-xs">{r.name}: {r.count} ({r.revenue.toFixed(0)}€)</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {tshirt_distribution.length > 0 && (
        <div className="bg-white border border-slate-200 p-4" data-testid="analytics-tshirts">
          <h3 className="font-heading font-bold text-sm uppercase mb-3">Repartition tailles T-shirt</h3>
          <div className="flex gap-3">
            {tshirt_distribution.map((t, i) => (
              <div key={i} className="flex-1 text-center bg-slate-50 p-2">
                <p className="font-heading font-bold text-lg">{t.count}</p>
                <p className="text-[10px] text-slate-500 uppercase">{t.size}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerAnalyticsSection;
