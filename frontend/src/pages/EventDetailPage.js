import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  MapPin, Calendar, Users, Mountain, Timer, ArrowLeft, Share2, 
  Heart, CheckCircle, AlertCircle, Loader2 
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import { eventsApi, registrationsApi, paymentsApi } from '../services/api';
import { toast } from 'sonner';

const sportLabels = {
  cycling: 'Cyclisme',
  running: 'Course à pied',
  triathlon: 'Triathlon',
  walking: 'Marche',
  motorsport: 'Sports Mécaniques'
};

const EventDetailPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(null);

  const [formData, setFormData] = useState({
    selected_distance: '',
    emergency_contact: '',
    emergency_phone: ''
  });

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await eventsApi.getById(eventId);
        setEvent(res.data);
      } catch (error) {
        console.error('Error fetching event:', error);
        toast.error('Événement non trouvé');
        navigate('/events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId, navigate]);

  const handleRegister = async () => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour vous inscrire');
      navigate('/login', { state: { from: `/events/${eventId}` } });
      return;
    }

    setRegistering(true);
    try {
      // Create registration
      const regRes = await registrationsApi.create({
        event_id: eventId,
        selected_distance: formData.selected_distance || event.distances?.[0],
        emergency_contact: formData.emergency_contact,
        emergency_phone: formData.emergency_phone
      });

      // Process payment (MOCKED)
      await paymentsApi.process({
        registration_id: regRes.data.registration_id,
        amount: event.price
      });

      setRegistrationSuccess({
        bib_number: regRes.data.bib_number,
        registration_id: regRes.data.registration_id
      });
      
      toast.success('Inscription réussie !');
      setShowRegisterDialog(false);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'inscription');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader" />
      </div>
    );
  }

  if (!event) return null;

  const eventDate = new Date(event.date);
  const spotsLeft = event.max_participants - event.current_participants;
  const isFull = spotsLeft <= 0;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="event-detail-page">
      {/* Hero Image */}
      <div className="relative h-[40vh] md:h-[50vh]">
        <img
          src={event.image_url || 'https://images.unsplash.com/photo-1766970096430-204f27f6e247?w=1920'}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-asphalt/80 to-transparent" />
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 bg-white/90 backdrop-blur p-2 rounded-sm hover:bg-white transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Actions */}
        <div className="absolute top-6 right-6 flex gap-2">
          <button className="bg-white/90 backdrop-blur p-2 rounded-sm hover:bg-white transition-colors">
            <Heart className="w-5 h-5" />
          </button>
          <button className="bg-white/90 backdrop-blur p-2 rounded-sm hover:bg-white transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Event Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 text-white">
          <div className="max-w-7xl mx-auto">
            <span className="badge badge-brand mb-4 inline-block">
              {sportLabels[event.sport_type]}
            </span>
            <h1 className="font-heading text-3xl md:text-5xl font-bold tracking-tight uppercase">
              {event.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Info */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="bg-white p-4 border border-slate-200">
                <Calendar className="w-5 h-5 text-brand mb-2" />
                <p className="text-xs text-slate-500 uppercase tracking-wider">Date</p>
                <p className="font-heading font-bold">{format(eventDate, 'd MMM yyyy', { locale: fr })}</p>
              </div>
              <div className="bg-white p-4 border border-slate-200">
                <MapPin className="w-5 h-5 text-brand mb-2" />
                <p className="text-xs text-slate-500 uppercase tracking-wider">Lieu</p>
                <p className="font-heading font-bold truncate">{event.location}</p>
              </div>
              <div className="bg-white p-4 border border-slate-200">
                <Users className="w-5 h-5 text-brand mb-2" />
                <p className="text-xs text-slate-500 uppercase tracking-wider">Participants</p>
                <p className="font-heading font-bold">{event.current_participants}/{event.max_participants}</p>
              </div>
              {event.elevation_gain && (
                <div className="bg-white p-4 border border-slate-200">
                  <Mountain className="w-5 h-5 text-brand mb-2" />
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Dénivelé</p>
                  <p className="font-heading font-bold">{event.elevation_gain}m D+</p>
                </div>
              )}
            </motion.div>

            {/* Distances */}
            {event.distances && event.distances.length > 0 && (
              <motion.div
                className="bg-white p-6 border border-slate-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <h2 className="font-heading text-xl font-bold uppercase mb-4">Distances disponibles</h2>
                <div className="flex flex-wrap gap-3">
                  {event.distances.map((distance, idx) => (
                    <div key={idx} className="distance-badge text-lg px-4 py-2">
                      {distance}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Description */}
            <motion.div
              className="bg-white p-6 border border-slate-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <h2 className="font-heading text-xl font-bold uppercase mb-4">Description</h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </motion.div>

            {/* Organizer */}
            <motion.div
              className="bg-asphalt text-white p-6 border-l-4 border-brand"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <h2 className="font-heading text-xl font-bold uppercase mb-2">Organisateur</h2>
              <p className="text-slate-300">{event.organizer_name}</p>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              className="sticky top-24 bg-white border border-slate-200 p-6 space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              {registrationSuccess ? (
                <div className="text-center space-y-4">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                  <h3 className="font-heading text-xl font-bold">Inscription confirmée !</h3>
                  <div className="bib-number mx-auto">
                    {registrationSuccess.bib_number}
                  </div>
                  <p className="text-sm text-slate-500">
                    Votre numéro de dossard
                  </p>
                  <Button 
                    onClick={() => navigate('/dashboard/registrations')}
                    className="w-full btn-primary"
                  >
                    Voir mes inscriptions
                  </Button>
                </div>
              ) : (
                <>
                  {/* Price */}
                  <div className="text-center pb-6 border-b">
                    <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">À partir de</p>
                    <p className="font-heading text-5xl font-extrabold text-brand">{event.price}€</p>
                  </div>

                  {/* Spots Left */}
                  <div className={`flex items-center justify-center gap-2 p-3 rounded-sm ${isFull ? 'bg-red-50' : 'bg-green-50'}`}>
                    {isFull ? (
                      <>
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="font-medium text-red-700">Complet</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="font-medium text-green-700">{spotsLeft} places disponibles</span>
                      </>
                    )}
                  </div>

                  {/* Register Button */}
                  <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full btn-primary" 
                        disabled={isFull}
                        data-testid="register-event-btn"
                      >
                        {isFull ? 'Complet' : 'S\'inscrire'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-heading text-xl uppercase">
                          Inscription à {event.title}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        {event.distances && event.distances.length > 1 && (
                          <div>
                            <Label>Distance</Label>
                            <Select
                              value={formData.selected_distance}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, selected_distance: value }))}
                            >
                              <SelectTrigger data-testid="distance-select">
                                <SelectValue placeholder="Choisir une distance" />
                              </SelectTrigger>
                              <SelectContent>
                                {event.distances.map((d, idx) => (
                                  <SelectItem key={idx} value={d}>{d}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div>
                          <Label>Contact d'urgence</Label>
                          <Input
                            placeholder="Nom du contact"
                            value={formData.emergency_contact}
                            onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                            data-testid="emergency-contact-input"
                          />
                        </div>
                        <div>
                          <Label>Téléphone d'urgence</Label>
                          <Input
                            placeholder="+33 6 XX XX XX XX"
                            value={formData.emergency_phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, emergency_phone: e.target.value }))}
                            data-testid="emergency-phone-input"
                          />
                        </div>
                        <div className="bg-slate-50 p-4 rounded-sm">
                          <div className="flex justify-between items-center">
                            <span>Total à payer</span>
                            <span className="font-heading text-2xl font-bold text-brand">{event.price}€</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            Paiement sécurisé par Square (DEMO)
                          </p>
                        </div>
                        <Button
                          onClick={handleRegister}
                          disabled={registering}
                          className="w-full btn-primary"
                          data-testid="confirm-register-btn"
                        >
                          {registering ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Traitement...
                            </>
                          ) : (
                            'Confirmer et payer'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <p className="text-xs text-center text-slate-500">
                    En vous inscrivant, vous acceptez les conditions générales de vente.
                  </p>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
