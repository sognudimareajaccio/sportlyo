import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Settings, Scan, BarChart3, Plus, Euro } from 'lucide-react';

const OrganizerNav = ({ eventId, onCreateEvent }) => {
  const location = useLocation();

  const baseItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, href: '/organizer' },
    { id: 'finances', label: 'Finances', icon: Euro, href: '/organizer', hash: '#export' },
  ];

  const eventItems = eventId ? [
    { id: 'manage', label: 'Gestion', icon: Settings, href: `/organizer/event/${eventId}` },
    { id: 'checkin', label: 'Check-in', icon: Scan, href: `/organizer/checkin/${eventId}` },
    { id: 'results', label: 'Résultats', icon: BarChart3, href: `/results/${eventId}` },
  ] : [];

  const createItem = onCreateEvent
    ? [{ id: 'create', label: 'Créer', icon: Plus, action: onCreateEvent }]
    : [];

  const items = [...baseItems, ...eventItems, ...createItem];

  const isActive = (item) => {
    if (item.hash) return false;
    return location.pathname === item.href;
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-8" data-testid="organizer-nav">
      {items.map((item, idx) => {
        const Icon = item.icon;
        const active = isActive(item);

        const cardContent = (
          <motion.div
            className={`relative p-4 bg-white border text-center cursor-pointer transition-all group ${
              active
                ? 'border-brand bg-brand/5'
                : 'border-slate-200 hover:border-brand'
            }`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            data-testid={`org-nav-${item.id}`}
          >
            <Icon className={`w-8 h-8 mx-auto mb-2 transition-colors ${
              active ? 'text-brand' : 'text-brand/70 group-hover:text-brand'
            }`} />
            <h3 className="font-heading font-bold uppercase tracking-wider text-xs leading-tight">
              {item.label}
            </h3>
          </motion.div>
        );

        if (item.action) {
          return (
            <div key={item.id} onClick={item.action}>
              {cardContent}
            </div>
          );
        }

        return (
          <Link key={item.id} to={item.href}>
            {cardContent}
          </Link>
        );
      })}
    </div>
  );
};

export default OrganizerNav;
