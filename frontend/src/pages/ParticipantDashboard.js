import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Calendar, MapPin, Trophy, Settings, ChevronRight, 
  Download, Ticket, User, TrendingUp, Upload, CheckCircle, Clock, XCircle, FileText, ExternalLink
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { registrationsApi, recommendationsApi } from '../services/api';
import api from '../services/api';
import EventCard from '../components/EventCard';
import { toast } from 'sonner';

const ParticipantDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPps, setUploadingPps] = useState(null);
  const ppsInputRef = useRef(null);

  const fetchData = async () => {
    try {
      const [regsRes, recsRes] = await Promise.all([
        registrationsApi.getAll(),
        recommendationsApi.get()
      ]);
      setRegistrations(regsRes.data.registrations);
      setRecommendations(recsRes.data.recommendations);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handlePpsUpload = async (registrationId, file) => {
    if (!file) return;
    setUploadingPps(registrationId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/registrations/${registrationId}/upload-pps`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('PPS téléchargé ! L\'organisateur le vérifiera sous peu.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors du téléchargement');
    } finally {
      setUploadingPps(null);
    }
  };

  const upcomingRegistrations = registrations
    .filter(r => r.event && new Date(r.event.date) > new Date())
    .slice(0, 3);

  const pastRegistrations = registrations
    .filter(r => r.event && new Date(r.event.date) <= new Date())
    .slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="participant-dashboard">
      {/* Header */}
      <div className="bg-asphalt text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full border-2 border-brand" />
              ) : (
                <div className="w-16 h-16 bg-brand rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
              )}
              <div>
                <h1 className="font-heading text-2xl font-bold">Bonjour, {user?.name?.split(' ')[0]} !</h1>
                <p className="text-slate-400">Bienvenue sur votre tableau de bord</p>
              </div>
            </div>
            <Button variant="outline" className="hidden md:flex border-white text-white hover:bg-white hover:text-asphalt">
              <Settings className="w-4 h-4 mr-2" />
              Paramètres
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Ticket, label: 'Inscriptions', value: registrations.length },
            { icon: Calendar, label: 'À venir', value: upcomingRegistrations.length },
            { icon: Trophy, label: 'Terminées', value: pastRegistrations.length },
            { icon: TrendingUp, label: 'Cette année', value: registrations.filter(r => {
              const date = new Date(r.created_at);
              return date.getFullYear() === new Date().getFullYear();
            }).length }
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

        {/* Upcoming Events */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-2xl font-bold uppercase">Mes prochains événements</h2>
            <Link to="/dashboard/registrations" className="text-brand font-medium hover:underline flex items-center">
              Voir tout <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {upcomingRegistrations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingRegistrations.map((reg, idx) => (
                <motion.div
                  key={reg.registration_id}
                  className="bg-white border border-slate-200 p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Dossard</p>
                      <p className="bib-number mt-1">{reg.bib_number}</p>
                    </div>
                    <span className={`badge ${reg.payment_status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                      {reg.payment_status === 'completed' ? 'Payé' : 'En attente'}
                    </span>
                  </div>
                  
                  <h3 className="font-heading font-bold text-lg mb-2 line-clamp-2">
                    {reg.event?.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-slate-500 mb-4">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {reg.event && format(new Date(reg.event.date), 'd MMMM yyyy', { locale: fr })}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {reg.event?.location}
                    </div>
                    {reg.selected_distance && (
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Distance: {reg.selected_distance}
                      </div>
                    )}
                  </div>

                  <Link to={`/events/${reg.event_id}`}>
                    <Button variant="outline" className="w-full">
                      Voir l'événement
                    </Button>
                  </Link>

                  {/* PPS Upload Section */}
                  {reg.event?.requires_pps && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      {reg.pps_status === 'approved' ? (
                        <div className="flex items-center gap-2 text-green-600 text-sm" data-testid={`pps-approved-${reg.registration_id}`}>
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-medium">PPS vérifié</span>
                        </div>
                      ) : reg.pps_status === 'rejected' ? (
                        <div>
                          <div className="flex items-center gap-2 text-red-600 text-sm mb-2">
                            <XCircle className="w-4 h-4" />
                            <span className="font-medium">PPS rejeté — renvoyez un document</span>
                          </div>
                          <label className="cursor-pointer">
                            <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                              onChange={(e) => handlePpsUpload(reg.registration_id, e.target.files[0])} />
                            <Button variant="outline" size="sm" className="w-full gap-2 text-red-600 border-red-200" asChild>
                              <span><Upload className="w-3 h-3" /> Renvoyer PPS</span>
                            </Button>
                          </label>
                        </div>
                      ) : reg.pps_document_url ? (
                        <div className="flex items-center gap-2 text-orange-600 text-sm" data-testid={`pps-pending-${reg.registration_id}`}>
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">PPS en cours de vérification</span>
                        </div>
                      ) : (
                        <div>
                          <a href="https://pps.athle.fr/?locale=fr" target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-brand hover:underline mb-2">
                            <ExternalLink className="w-3 h-3" /> Acheter un PPS sur athle.fr
                          </a>
                          <label className="cursor-pointer" data-testid={`pps-upload-${reg.registration_id}`}>
                            <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                              onChange={(e) => handlePpsUpload(reg.registration_id, e.target.files[0])} />
                            <Button variant="outline" size="sm" className="w-full gap-2"
                              disabled={uploadingPps === reg.registration_id} asChild>
                              <span>
                                {uploadingPps === reg.registration_id ? (
                                  <><Clock className="w-3 h-3 animate-spin" /> Envoi...</>
                                ) : (
                                  <><Upload className="w-3 h-3" /> Télécharger mon PPS</>
                                )}
                              </span>
                            </Button>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-heading text-xl font-bold mb-2">Aucun événement à venir</h3>
              <p className="text-slate-500 mb-6">Découvrez les événements disponibles et inscrivez-vous !</p>
              <Link to="/events">
                <Button className="btn-primary">Explorer les événements</Button>
              </Link>
            </div>
          )}
        </section>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-heading text-2xl font-bold uppercase">Recommandés pour vous</h2>
                <p className="text-slate-500 text-sm">Basé sur vos inscriptions précédentes</p>
              </div>
              <Link to="/events" className="text-brand font-medium hover:underline flex items-center">
                Voir tout <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.slice(0, 3).map((event, idx) => (
                <motion.div
                  key={event.event_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                >
                  <EventCard event={event} />
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ParticipantDashboard;
