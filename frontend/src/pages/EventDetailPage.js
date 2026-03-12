import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  MapPin, Calendar, Users, Mountain, ArrowLeft, Share2, 
  Heart, CheckCircle, AlertCircle, Loader2, QrCode, Clock, Timer,
  Route, FileText, Navigation, ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { useAuth } from '../context/AuthContext';
import { eventsApi, registrationsApi } from '../services/api';
import { toast } from 'sonner';
import api from '../services/api';

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
    first_name: '',
    last_name: '',
    gender: 'M',
    birth_date: '',
    selected_race: '',
    selected_wave: '',
    selected_options: [],
    emergency_contact: '',
    emergency_phone: '',
    pps_number: '',
    promo_code: ''
  });

  const [promoDiscount, setPromoDiscount] = useState(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [showRegulations, setShowRegulations] = useState(false);

  const getOpenRunnerEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(/openrunner\.com\/(?:route|r)\/(\d+)/);
    if (match) return `https://www.openrunner.com/embed/${match[1]}`;
    if (url.includes('openrunner.com/embed/')) return url;
    return null;
  };

  const getMapUrl = (address) => {
    if (!address) return null;
    return `https://www.openstreetmap.org/export/embed.html?bbox=&layer=mapnik&marker=&query=${encodeURIComponent(address)}`;
  };

  const getDirectionsUrl = (address) => {
    if (!address) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await eventsApi.getById(eventId);
        setEvent(res.data);
        // Set default race if available
        if (res.data.races && res.data.races.length > 0) {
          setFormData(prev => ({ ...prev, selected_race: res.data.races[0].name }));
        }
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

  const validatePromoCode = async () => {
    if (!formData.promo_code) return;
    
    setCheckingPromo(true);
    try {
      const res = await api.post('/promo-codes/validate', {
        code: formData.promo_code,
        event_id: eventId
      });
      setPromoDiscount(res.data);
      toast.success('Code promo appliqué !');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Code promo invalide');
      setPromoDiscount(null);
    } finally {
      setCheckingPromo(false);
    }
  };

  const calculateTotal = () => {
    if (!event) return { base: 0, serviceFee: 0, total: 0 };
    
    let base = event.current_price || event.price;
    
    // Get race-specific price
    if (formData.selected_race && event.races) {
      const race = event.races.find(r => r.name === formData.selected_race);
      if (race) base = race.price;
    }
    
    // Add options
    if (formData.selected_options.length > 0 && event.options) {
      for (const optId of formData.selected_options) {
        const opt = event.options.find(o => o.option_id === optId);
        if (opt) base += opt.price;
      }
    }
    
    // Apply promo discount
    if (promoDiscount) {
      if (promoDiscount.discount_type === 'percentage') {
        base = base * (1 - promoDiscount.discount_value / 100);
      } else {
        base = Math.max(0, base - promoDiscount.discount_value);
      }
    }
    
    base = Math.round(base * 100) / 100;
    const serviceFee = Math.round(base * 0.05 * 100) / 100;
    const total = Math.round((base + serviceFee) * 100) / 100;
    
    return { base, serviceFee, total };
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour vous inscrire');
      navigate('/login', { state: { from: `/events/${eventId}` } });
      return;
    }

    // Check PPS requirement
    if (event.requires_pps && !formData.pps_number && !user?.pps_number) {
      toast.error('Un PPS (Pass Prévention Santé) est requis pour cet événement');
      return;
    }

    setRegistering(true);
    try {
      const regRes = await registrationsApi.create({
        event_id: eventId,
        first_name: formData.first_name,
        last_name: formData.last_name,
        gender: formData.gender,
        birth_date: formData.birth_date,
        selected_race: formData.selected_race || null,
        selected_wave: formData.selected_wave || null,
        selected_options: formData.selected_options.length > 0 ? formData.selected_options : null,
        emergency_contact: formData.emergency_contact,
        emergency_phone: formData.emergency_phone,
        pps_number: formData.pps_number || user?.pps_number
      });

      // Create checkout session
      const checkoutRes = await api.post('/payments/create-checkout', {
        registration_id: regRes.data.registration_id,
        origin_url: window.location.origin,
        promo_code: promoDiscount ? formData.promo_code : null
      });

      // Redirect to Stripe
      window.location.href = checkoutRes.data.checkout_url;
      
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'inscription');
      setRegistering(false);
    }
  };

  const toggleOption = (optionId) => {
    setFormData(prev => ({
      ...prev,
      selected_options: prev.selected_options.includes(optionId)
        ? prev.selected_options.filter(id => id !== optionId)
        : [...prev.selected_options, optionId]
    }));
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
        
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 bg-white/90 backdrop-blur p-2 rounded-sm hover:bg-white transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="absolute top-6 right-6 flex gap-2">
          <button className="bg-white/90 backdrop-blur p-2 rounded-sm hover:bg-white transition-colors">
            <Heart className="w-5 h-5" />
          </button>
          <div className="relative group">
            <button className="bg-white/90 backdrop-blur p-2 rounded-sm hover:bg-white transition-colors" data-testid="share-btn">
              <Share2 className="w-5 h-5" />
            </button>
            <div className="absolute right-0 top-full mt-2 bg-white shadow-lg border border-slate-200 rounded-sm p-2 hidden group-hover:block z-50 min-w-[180px]">
              <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank', 'width=600,height=400')} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2" data-testid="share-facebook">
                <span className="w-4 h-4 bg-[#1877F2] rounded-full inline-block" /> Facebook
              </button>
              <button onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(event.title)}`, '_blank', 'width=600,height=400')} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2" data-testid="share-twitter">
                <span className="w-4 h-4 bg-[#1DA1F2] rounded-full inline-block" /> Twitter / X
              </button>
              <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(event.title + ' ' + window.location.href)}`, '_blank')} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2" data-testid="share-whatsapp">
                <span className="w-4 h-4 bg-[#25D366] rounded-full inline-block" /> WhatsApp
              </button>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Lien copié !'); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2" data-testid="share-copy">
                <span className="w-4 h-4 bg-slate-400 rounded-full inline-block" /> Copier le lien
              </button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="badge badge-brand">
                {sportLabels[event.sport_type]}
              </span>
              {event.requires_pps && (
                <span className="badge bg-blue-500 text-white">PPS Requis</span>
              )}
            </div>
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

            {/* Races with real-time counter */}
            {event.races && event.races.length > 0 && (
              <motion.div
                className="bg-white p-6 border border-slate-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                data-testid="races-section"
              >
                <h2 className="font-heading text-xl font-bold uppercase mb-4">Épreuves disponibles</h2>
                <div className="space-y-3">
                  {event.races.map((race) => {
                    const current = race.current_participants || 0;
                    const max = race.max_participants || 0;
                    const fillPct = max > 0 ? Math.round((current / max) * 100) : 0;
                    const isFull = current >= max;
                    return (
                      <div 
                        key={race.name}
                        className={`p-4 border ${isFull ? 'border-red-200 bg-red-50' : 'border-slate-200 hover:border-brand'} transition-colors`}
                        data-testid={`race-card-${race.name}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-heading font-bold text-lg">{race.name}</h3>
                            <p className="text-sm text-slate-500">
                              {race.distance_km && `${race.distance_km}km`}
                              {race.elevation_gain && ` · ${race.elevation_gain}m D+`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-heading text-2xl font-bold text-brand">{race.price}€</p>
                          </div>
                        </div>
                        {/* Real-time counter */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-500 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              <span className="font-heading font-bold text-asphalt">{current}</span> / {max} inscrits
                            </span>
                            <span className={`font-heading font-bold ${isFull ? 'text-red-500' : fillPct >= 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {isFull ? 'COMPLET' : `${fillPct}%`}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 overflow-hidden">
                            <motion.div
                              className={`h-full ${isFull ? 'bg-red-500' : fillPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(fillPct, 100)}%` }}
                              transition={{ duration: 0.8 }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Legacy Distances */}
            {!event.races && event.distances && event.distances.length > 0 && (
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

            {/* Route / Parcours OpenRunner */}
            {event.route_url && getOpenRunnerEmbedUrl(event.route_url) && (
              <motion.div
                className="bg-white border border-slate-200 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                data-testid="route-section"
              >
                <div className="p-6 pb-0 flex items-center justify-between">
                  <h2 className="font-heading text-xl font-bold uppercase flex items-center gap-2">
                    <Route className="w-5 h-5 text-brand" /> Parcours & Altimétrie
                  </h2>
                  <a
                    href={event.route_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand hover:underline flex items-center gap-1"
                    data-testid="openrunner-link"
                  >
                    Voir sur OpenRunner <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="mt-4">
                  <iframe
                    src={getOpenRunnerEmbedUrl(event.route_url)}
                    width="100%"
                    height="420"
                    frameBorder="0"
                    allowFullScreen
                    title="Parcours OpenRunner"
                    className="w-full"
                    data-testid="openrunner-embed"
                  />
                </div>
              </motion.div>
            )}

            {/* Map & Directions */}
            {event.exact_address && (
              <motion.div
                className="bg-white border border-slate-200 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                data-testid="map-section"
              >
                <div className="p-6 pb-4">
                  <h2 className="font-heading text-xl font-bold uppercase flex items-center gap-2 mb-3">
                    <Navigation className="w-5 h-5 text-brand" /> Lieu de départ
                  </h2>
                  <p className="text-slate-600 flex items-center gap-2 mb-4" data-testid="exact-address">
                    <MapPin className="w-4 h-4 text-brand flex-shrink-0" />
                    {event.exact_address}
                  </p>
                  <a
                    href={getDirectionsUrl(event.exact_address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                    data-testid="directions-btn"
                  >
                    <Button className="btn-primary gap-2">
                      <Navigation className="w-4 h-4" /> Comment s'y rendre
                    </Button>
                  </a>
                </div>
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=&layer=mapnik`}
                  width="100%"
                  height="250"
                  frameBorder="0"
                  title="Carte"
                  className="w-full border-t border-slate-200"
                  style={{ display: 'none' }}
                />
                <div className="w-full h-[250px] border-t border-slate-200 bg-slate-100 relative">
                  <iframe
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(event.exact_address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                    width="100%"
                    height="250"
                    frameBorder="0"
                    allowFullScreen
                    title="Carte du lieu"
                    className="w-full h-full"
                    data-testid="map-embed"
                  />
                </div>
              </motion.div>
            )}

            {/* Options / Merchandising */}
            {event.options && event.options.length > 0 && (
              <motion.div
                className="bg-white p-6 border border-slate-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
              >
                <h2 className="font-heading text-xl font-bold uppercase mb-4">Options & Merchandising</h2>
                <div className="space-y-3">
                  {event.options.map((option) => (
                    <div 
                      key={option.option_id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-sm"
                    >
                      <div className="flex items-center gap-4">
                        {option.image_url && (
                          <img src={option.image_url} alt={option.name} className="w-16 h-16 object-cover rounded" />
                        )}
                        <div>
                          <h3 className="font-medium">{option.name}</h3>
                          {option.description && (
                            <p className="text-sm text-slate-500">{option.description}</p>
                          )}
                        </div>
                      </div>
                      <p className="font-heading font-bold text-brand">+{option.price}€</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Description */}
            {event.description && (
              <motion.div
                className="bg-white p-6 border border-slate-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <h2 className="font-heading text-xl font-bold uppercase mb-4">Description</h2>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </motion.div>
            )}

            {/* Regulations */}
            {event.regulations && (
              <motion.div
                className="bg-white border border-slate-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                data-testid="regulations-section"
              >
                <button
                  onClick={() => setShowRegulations(!showRegulations)}
                  className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  data-testid="regulations-toggle"
                >
                  <h2 className="font-heading text-xl font-bold uppercase flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand" /> Règlement de la course
                  </h2>
                  {showRegulations ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                {showRegulations && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="px-6 pb-6"
                  >
                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm" data-testid="regulations-content">
                        {event.regulations}
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* PPS Info */}
            {event.requires_pps && (
              <motion.div
                className="bg-blue-50 border border-blue-200 p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <h2 className="font-heading text-xl font-bold uppercase mb-2 text-blue-800">
                  Pass Prévention Santé Requis
                </h2>
                <p className="text-blue-700 text-sm mb-4">
                  Cet événement nécessite un PPS valide de la Fédération Française d'Athlétisme (5€/an).
                </p>
                <a 
                  href="https://pps.athle.fr/?locale=fr" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 font-medium hover:underline"
                >
                  Acheter mon PPS sur athle.fr →
                </a>
              </motion.div>
            )}

            {/* Organizer */}
            <motion.div
              className="bg-asphalt text-white p-6 border-l-4 border-brand"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.45 }}
              data-testid="organizer-section"
            >
              <h2 className="font-heading text-lg font-bold uppercase mb-1">Organisé par</h2>
              <p className="text-xl font-heading font-bold text-white" data-testid="organizer-name">{event.organizer_name}</p>
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
                  {registrationSuccess.qr_code && (
                    <div className="p-4 bg-slate-50 rounded-sm">
                      <img 
                        src={`data:image/png;base64,${registrationSuccess.qr_code}`} 
                        alt="QR Code" 
                        className="w-32 h-32 mx-auto"
                      />
                      <p className="text-xs text-slate-500 mt-2">Billet digital</p>
                    </div>
                  )}
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
                    <p className="font-heading text-5xl font-extrabold text-brand">
                      {event.races && event.races.length > 0
                        ? Math.min(...event.races.map(r => r.price))
                        : (event.current_price || event.price)}€
                    </p>
                    {event.pricing_tiers && (
                      <p className="text-xs text-slate-500 mt-2">Tarif évolutif</p>
                    )}
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
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="font-heading text-xl uppercase">
                          Inscription à {event.title}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        {/* Personal Info */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Prénom *</Label>
                            <Input
                              placeholder="Jean"
                              value={formData.first_name}
                              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                              data-testid="first-name-input"
                              required
                            />
                          </div>
                          <div>
                            <Label>Nom *</Label>
                            <Input
                              placeholder="Dupont"
                              value={formData.last_name}
                              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                              data-testid="last-name-input"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Sexe *</Label>
                            <Select
                              value={formData.gender}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                            >
                              <SelectTrigger data-testid="gender-select">
                                <SelectValue placeholder="Sexe" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="M">Homme</SelectItem>
                                <SelectItem value="F">Femme</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Date de naissance *</Label>
                            <Input
                              type="date"
                              value={formData.birth_date}
                              onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                              data-testid="birth-date-input"
                              required
                            />
                            {formData.birth_date && (() => {
                              const age = Math.floor((new Date() - new Date(formData.birth_date)) / (365.25 * 24 * 60 * 60 * 1000));
                              return <p className="text-xs mt-1 text-slate-500" data-testid="age-display">{age} ans</p>;
                            })()}
                          </div>
                        </div>

                        {/* Race Selection */}
                        {event.races && event.races.length > 1 && (
                          <div>
                            <Label>Épreuve *</Label>
                            <Select
                              value={formData.selected_race}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, selected_race: value }))}
                            >
                              <SelectTrigger data-testid="race-select">
                                <SelectValue placeholder="Choisir une épreuve" />
                              </SelectTrigger>
                              <SelectContent>
                                {event.races.map((race) => (
                                  <SelectItem 
                                    key={race.name} 
                                    value={race.name}
                                    disabled={race.current_participants >= race.max_participants}
                                  >
                                    {race.name} - {race.price}€ 
                                    {race.current_participants >= race.max_participants && ' (Complet)'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Wave Selection */}
                        {event.waves && event.waves.length > 0 && (
                          <div>
                            <Label>Vague de départ</Label>
                            <Select
                              value={formData.selected_wave}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, selected_wave: value }))}
                            >
                              <SelectTrigger data-testid="wave-select">
                                <SelectValue placeholder="Choisir une vague" />
                              </SelectTrigger>
                              <SelectContent>
                                {event.waves.map((wave) => (
                                  <SelectItem 
                                    key={wave.wave_id} 
                                    value={wave.wave_id}
                                    disabled={wave.current_participants >= wave.max_participants}
                                  >
                                    {wave.name} - {wave.start_time}
                                    {wave.current_participants >= wave.max_participants && ' (Complet)'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Options */}
                        {event.options && event.options.length > 0 && (
                          <div>
                            <Label>Options</Label>
                            <div className="space-y-2 mt-2">
                              {event.options.map((option) => (
                                <div 
                                  key={option.option_id}
                                  className="flex items-center justify-between p-3 border rounded-sm"
                                >
                                  <div className="flex items-center gap-3">
                                    <Checkbox 
                                      checked={formData.selected_options.includes(option.option_id)}
                                      onCheckedChange={() => toggleOption(option.option_id)}
                                    />
                                    <span>{option.name}</span>
                                  </div>
                                  <span className="font-medium">+{option.price}€</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* PPS Number */}
                        {event.requires_pps && !user?.pps_number && (
                          <div>
                            <Label>Numéro PPS *</Label>
                            <Input
                              placeholder="P9F28C586EB"
                              value={formData.pps_number}
                              onChange={(e) => setFormData(prev => ({ ...prev, pps_number: e.target.value.toUpperCase() }))}
                              data-testid="pps-input"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                              <a href="https://pps.athle.fr/?locale=fr" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                                Acheter un PPS sur athle.fr
                              </a>
                            </p>
                          </div>
                        )}

                        {/* Emergency Contact */}
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

                        {/* Promo Code */}
                        <div>
                          <Label>Code promo</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="CODE2026"
                              value={formData.promo_code}
                              onChange={(e) => setFormData(prev => ({ ...prev, promo_code: e.target.value.toUpperCase() }))}
                            />
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={validatePromoCode}
                              disabled={checkingPromo || !formData.promo_code}
                            >
                              {checkingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Appliquer'}
                            </Button>
                          </div>
                          {promoDiscount && (
                            <p className="text-sm text-green-600 mt-1">
                              Réduction: {promoDiscount.discount_type === 'percentage' 
                                ? `-${promoDiscount.discount_value}%` 
                                : `-${promoDiscount.discount_value}€`}
                            </p>
                          )}
                        </div>

                        {/* Total with fee breakdown */}
                        <div className="bg-slate-50 p-4 rounded-sm">
                          {(() => {
                            const { base, serviceFee, total } = calculateTotal();
                            return (
                              <>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-slate-600">Prix inscription</span>
                                  <span className="font-medium">{base}€</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mt-1">
                                  <span className="text-slate-600">Frais de service (5%)</span>
                                  <span className="font-medium">+{serviceFee}€</span>
                                </div>
                                <div className="border-t mt-2 pt-2 flex justify-between items-center">
                                  <span className="font-medium">Total à payer</span>
                                  <span className="font-heading text-2xl font-bold text-brand">{total}€</span>
                                </div>
                              </>
                            );
                          })()}
                          <p className="text-xs text-slate-500 mt-2">
                            Paiement sécurisé par Stripe
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

                  {isFull && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => toast.info('Fonctionnalité liste d\'attente à venir')}
                    >
                      Rejoindre la liste d'attente
                    </Button>
                  )}

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
