import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, MapPin, Download, ChevronLeft, Search, Filter, Timer, QrCode, Trophy } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import { registrationsApi } from '../services/api';

const MyRegistrationsPage = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, upcoming, past

  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const res = await registrationsApi.getAll();
        setRegistrations(res.data.registrations);
      } catch (error) {
        console.error('Error fetching registrations:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRegistrations();
  }, []);

  const filteredRegistrations = registrations.filter(reg => {
    if (!reg.event) return false;
    const eventDate = new Date(reg.event.date);
    const now = new Date();
    
    if (filter === 'upcoming') return eventDate > now;
    if (filter === 'past') return eventDate <= now;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="my-registrations-page">
      {/* Header */}
      <div className="bg-asphalt text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/dashboard" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Retour au tableau de bord
          </Link>
          <h1 className="font-heading text-3xl font-bold uppercase">Mes inscriptions</h1>
          <p className="text-slate-400 mt-2">{registrations.length} inscription(s) au total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-16 z-40 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48" data-testid="registration-filter">
                <SelectValue placeholder="Filtrer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="upcoming">À venir</SelectItem>
                <SelectItem value="past">Passées</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-slate-500">
              {filteredRegistrations.length} résultat(s)
            </span>
          </div>
        </div>
      </div>

      {/* Registrations List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredRegistrations.length > 0 ? (
          <div className="space-y-4">
            {filteredRegistrations.map((reg, idx) => {
              const eventDate = new Date(reg.event.date);
              const isPast = eventDate <= new Date();
              
              return (
                <motion.div
                  key={reg.registration_id}
                  className={`bg-white border ${isPast ? 'border-slate-200 opacity-75' : 'border-slate-200'} p-6`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    {/* Event Image */}
                    <div className="w-full md:w-40 h-24 flex-shrink-0">
                      <img
                        src={reg.event.image_url || 'https://images.unsplash.com/photo-1766970096430-204f27f6e247?w=400'}
                        alt={reg.event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Event Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-heading font-bold text-lg">{reg.event.title}</h3>
                        <span className={`badge ${reg.payment_status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                          {reg.payment_status === 'completed' ? 'Payé' : 'En attente'}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-3">
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {format(eventDate, 'd MMMM yyyy', { locale: fr })}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {reg.event.location}
                        </span>
                        {reg.selected_distance && (
                          <span className="distance-badge">{reg.selected_distance}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Dossard</p>
                          <p className="bib-number text-lg py-1 px-3">{reg.bib_number}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Montant</p>
                          <p className="font-heading font-bold text-xl">{reg.amount_paid}€</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 md:w-40">
                      <Link to={`/events/${reg.event_id}`}>
                        <Button variant="outline" className="w-full">
                          Voir l'événement
                        </Button>
                      </Link>
                      {!isPast && (
                        <>
                          <Link to={`/timer/${reg.registration_id}`}>
                            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                              <Timer className="w-4 h-4 mr-2" />
                              Chrono
                            </Button>
                          </Link>
                          <Button variant="outline" className="w-full">
                            <QrCode className="w-4 h-4 mr-2" />
                            Billet
                          </Button>
                        </>
                      )}
                      {isPast && reg.race_finished && (
                        <Link to={`/results/${reg.event_id}`}>
                          <Button variant="outline" className="w-full">
                            <Trophy className="w-4 h-4 mr-2" />
                            Résultats
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-heading text-xl font-bold mb-2">Aucune inscription</h3>
            <p className="text-slate-500 mb-6">
              {filter === 'upcoming' 
                ? "Vous n'avez pas d'événements à venir."
                : filter === 'past'
                ? "Vous n'avez pas encore participé à un événement."
                : "Vous n'êtes inscrit à aucun événement."}
            </p>
            <Link to="/events">
              <Button className="btn-primary">Explorer les événements</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyRegistrationsPage;
