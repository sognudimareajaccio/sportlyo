import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Users, MapPin, Settings, Edit, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';

export const EventsSection = ({ events, onEdit, onDelete, onCreateNew }) => (
  <div>
    {events.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event, idx) => {
          const fillRate = event.max_participants > 0 ? Math.round((event.current_participants / event.max_participants) * 100) : 0;
          const fillColor = fillRate >= 90 ? 'bg-red-500' : fillRate >= 60 ? 'bg-amber-500' : 'bg-emerald-500';
          const eventDate = new Date(event.date);
          return (
            <motion.div key={event.event_id} className="group bg-white border border-slate-200 overflow-hidden hover:border-brand transition-colors" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.05 }} data-testid={`event-card-${event.event_id}`}>
              <div className="relative h-40 overflow-hidden">
                <img src={event.image_url || 'https://images.unsplash.com/photo-1766970096430-204f27f6e247?w=800'} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-heading font-bold uppercase tracking-wider ${event.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                    {event.status === 'active' ? 'Actif' : 'Annulé'}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <div className="bg-white text-asphalt px-2.5 py-1 text-center">
                    <div className="font-heading font-bold text-lg leading-none">{format(eventDate, 'd')}</div>
                    <div className="font-heading text-[10px] uppercase tracking-wider">{format(eventDate, 'MMM', { locale: fr })}</div>
                  </div>
                </div>
                <div className="absolute bottom-3 right-3">
                  <span className="bg-brand text-white font-heading font-bold text-sm px-2.5 py-1">{(event.current_participants * event.price).toFixed(0)}€</span>
                </div>
              </div>
              <div className="p-5">
                <Link to={`/organizer/event/${event.event_id}`}>
                  <h3 className="font-heading font-bold text-lg text-asphalt hover:text-brand transition-colors line-clamp-1">{event.title}</h3>
                </Link>
                <p className="text-sm text-slate-500 flex items-center mt-1"><MapPin className="w-3.5 h-3.5 mr-1" />{event.location}</p>
                <div className="my-4 bg-asphalt p-3 -mx-5 px-5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-medium flex items-center"><Users className="w-3.5 h-3.5 mr-1" />{event.current_participants}/{event.max_participants}</span>
                    <span className="font-heading font-bold text-white">{fillRate}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/10 overflow-hidden rounded-sm">
                    <motion.div className={`h-full ${fillColor}`} initial={{ width: 0 }} animate={{ width: `${fillRate}%` }} transition={{ duration: 0.8 }} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100">
                  <Link to={`/organizer/event/${event.event_id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs font-heading uppercase tracking-wider gap-1.5 h-8"><Settings className="w-3.5 h-3.5" />Gérer</Button>
                  </Link>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => onEdit(event)}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button variant="outline" size="sm" className="h-8 text-red-500 hover:text-red-600" onClick={() => onDelete(event.event_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    ) : (
      <div className="text-center py-16 bg-white border border-slate-200">
        <Calendar className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <h3 className="font-heading font-bold text-lg uppercase mb-2">Aucun événement</h3>
        <p className="text-slate-500 mb-6">Créez votre premier événement sportif</p>
        <Button className="btn-primary" onClick={onCreateNew}>Créer un événement</Button>
      </div>
    )}
  </div>
);
