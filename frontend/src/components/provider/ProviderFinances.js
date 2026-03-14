import React from 'react';
import { motion } from 'framer-motion';
import { Euro, TrendingUp, ArrowDownRight, Users } from 'lucide-react';

const ProviderFinances = ({ financialData }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="provider-finances-section">
    <h3 className="font-heading font-bold text-base uppercase mb-4">Bilan Financier & Commissions</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white border border-slate-200 p-5 text-center">
        <Euro className="w-6 h-6 text-green-600 mx-auto mb-2" />
        <p className="font-heading font-black text-3xl">{financialData.total_sales.toFixed(0)}€</p>
        <p className="text-xs text-slate-500 font-heading uppercase mt-1">Ventes totales</p>
      </div>
      <div className="bg-white border border-red-200 p-5 text-center">
        <ArrowDownRight className="w-6 h-6 text-red-500 mx-auto mb-2" />
        <p className="font-heading font-black text-3xl text-red-600">{financialData.total_commission.toFixed(0)}€</p>
        <p className="text-xs text-slate-500 font-heading uppercase mt-1">Commission organisateurs</p>
      </div>
      <div className="bg-white border border-orange-200 p-5 text-center" data-testid="provider-admin-commission-card">
        <ArrowDownRight className="w-6 h-6 text-orange-500 mx-auto mb-2" />
        <p className="font-heading font-black text-3xl text-orange-600">{(financialData.total_admin_commission || 0).toFixed(0)}€</p>
        <p className="text-xs text-slate-500 font-heading uppercase mt-1">Commission plateforme</p>
        <p className="text-[10px] text-slate-400 mt-0.5">1€ / produit vendu</p>
      </div>
      <div className="bg-white border border-brand/30 p-5 text-center">
        <TrendingUp className="w-6 h-6 text-brand mx-auto mb-2" />
        <p className="font-heading font-black text-3xl text-brand">{financialData.net_revenue.toFixed(0)}€</p>
        <p className="text-xs text-slate-500 font-heading uppercase mt-1">Revenu net</p>
      </div>
    </div>
    <div className="bg-white border border-slate-200">
      <div className="p-4 border-b flex items-center justify-between">
        <h4 className="font-heading font-bold uppercase text-sm">Commissions par organisateur</h4>
        <Users className="w-4 h-4 text-slate-400" />
      </div>
      {financialData.by_organizer.length > 0 ? (
        <div className="divide-y">
          {financialData.by_organizer.map(org => (
            <div key={org.organizer_id} className="p-4 hover:bg-slate-50 transition-colors" data-testid={`finance-org-${org.organizer_id}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-heading font-bold text-sm">{org.name || 'Organisateur'}</p>
                  <p className="text-xs text-slate-400">{org.orders_count} commande{org.orders_count > 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="font-heading font-bold text-lg">{org.total_sales.toFixed(2)}€</p>
                  <p className="text-[10px] text-slate-400">ventes</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 bg-slate-50 p-2">
                  <p className="text-[10px] text-slate-400 font-heading uppercase">Commission organisateur</p>
                  <p className="font-heading font-bold text-red-600">{org.total_commission.toFixed(2)}€</p>
                </div>
                <div className="flex-1 bg-slate-50 p-2">
                  <p className="text-[10px] text-slate-400 font-heading uppercase">Commission plateforme</p>
                  <p className="font-heading font-bold text-orange-600">{(org.admin_commission || 0).toFixed(2)}€</p>
                </div>
                <div className="flex-1 bg-slate-50 p-2">
                  <p className="text-[10px] text-slate-400 font-heading uppercase">Revenu net</p>
                  <p className="font-heading font-bold text-green-600">{org.net_revenue.toFixed(2)}€</p>
                </div>
              </div>
              <div className="mt-2 h-2 bg-slate-100 overflow-hidden">
                <div className="h-full bg-brand" style={{ width: `${org.total_sales > 0 ? ((org.net_revenue / org.total_sales) * 100) : 0}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{org.total_sales > 0 ? ((org.net_revenue / org.total_sales) * 100).toFixed(1) : 0}% de marge nette</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 text-xs">Aucune commission pour le moment</div>
      )}
    </div>
  </motion.div>
);

export default ProviderFinances;
