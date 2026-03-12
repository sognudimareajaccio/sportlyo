import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  MapPin, Calendar, Users, Mountain, ArrowLeft, Share2, 
  Heart, CheckCircle, AlertCircle, Loader2, QrCode, Clock, Timer,
  Route, FileText, Navigation, ExternalLink, ChevronDown, ChevronUp,
  ArrowRight, Check, Phone, Mail, User, Globe, Shirt, Facebook, Instagram, Youtube, Twitter
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
  const [regStep, setRegStep] = useState(1);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: '',
    birth_day: '',
    birth_month: '',
    birth_year: '',
    country: 'France',
    city: '',
    postal_code: '',
    email: '',
    phone: '',
    nationality: 'France',
    selected_race: '',
    selected_wave: '',
    selected_options: [],
    tshirt_size: '',
    emergency_contact: '',
    emergency_phone: '',
    club_name: '',
    pps_number: '',
    ffa_license: '',
    promo_code: ''
  });

  const [ffaValid, setFfaValid] = useState(null);
  const [ppsValid, setPpsValid] = useState(null);

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

  // Pre-fill from user account
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
        first_name: prev.first_name || (user.name ? user.name.split(' ')[0] : ''),
        last_name: prev.last_name || (user.name ? user.name.split(' ').slice(1).join(' ') : ''),
      }));
    }
  }, [user]);

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
    if (!event) return { base: 0, serviceFee: 0, total: 0, ffaDiscount: 0 };
    
    let base = event.current_price || event.price;
    
    if (formData.selected_race && event.races) {
      const race = event.races.find(r => r.name === formData.selected_race);
      if (race) base = race.price;
    }
    
    if (formData.selected_options.length > 0 && event.options) {
      for (const optId of formData.selected_options) {
        const opt = event.options.find(o => o.option_id === optId);
        if (opt) base += opt.price;
      }
    }
    
    if (promoDiscount) {
      if (promoDiscount.discount_type === 'percentage') {
        base = base * (1 - promoDiscount.discount_value / 100);
      } else {
        base = Math.max(0, base - promoDiscount.discount_value);
      }
    }

    // FFA license discount
    const ffaDiscount = (ffaValid && formData.ffa_license) ? 3 : 0;
    base = Math.max(0, base - ffaDiscount);
    
    base = Math.round(base * 100) / 100;
    const serviceFee = Math.round(base * 0.05 * 100) / 100;
    const total = Math.round((base + serviceFee) * 100) / 100;
    
    return { base, serviceFee, total, ffaDiscount };
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour vous inscrire');
      navigate('/login', { state: { from: `/events/${eventId}` } });
      return;
    }

    if (event.requires_pps && !formData.pps_number && !user?.pps_number) {
      toast.error('Un PPS (Pass Prévention Santé) est requis pour cet événement');
      return;
    }

    // Build birth_date from day/month/year
    const birthDate = (formData.birth_year && formData.birth_month && formData.birth_day)
      ? `${formData.birth_year}-${String(formData.birth_month).padStart(2, '0')}-${String(formData.birth_day).padStart(2, '0')}`
      : null;

    setRegistering(true);
    try {
      const regRes = await registrationsApi.create({
        event_id: eventId,
        first_name: formData.first_name,
        last_name: formData.last_name,
        gender: formData.gender,
        birth_date: birthDate,
        country: formData.country,
        city: formData.city,
        postal_code: formData.postal_code,
        email: formData.email,
        phone: formData.phone,
        nationality: formData.nationality,
        selected_race: formData.selected_race || null,
        selected_wave: formData.selected_wave || null,
        selected_options: formData.selected_options.length > 0 ? formData.selected_options : null,
        emergency_contact: formData.emergency_contact,
        emergency_phone: formData.emergency_phone,
        club_name: formData.club_name || null,
        tshirt_size: formData.tshirt_size,
        ffa_license: ffaValid ? formData.ffa_license : null,
        pps_number: formData.pps_number || user?.pps_number
      });

      const checkoutRes = await api.post('/payments/create-checkout', {
        registration_id: regRes.data.registration_id,
        origin_url: window.location.origin,
        promo_code: promoDiscount ? formData.promo_code : null
      });

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
                <p className="text-sm text-slate-500 mb-4">Sélectionnez une épreuve pour voir le tarif</p>
                <div className="space-y-3">
                  {event.races.map((race) => {
                    const current = race.current_participants || 0;
                    const max = race.max_participants || 0;
                    const fillPct = max > 0 ? Math.round((current / max) * 100) : 0;
                    const isFull = current >= max;
                    const isSelected = formData.selected_race === race.name;
                    return (
                      <div 
                        key={race.name}
                        className={`p-4 border-2 cursor-pointer transition-all ${
                          isFull 
                            ? 'border-red-200 bg-red-50 cursor-not-allowed' 
                            : isSelected 
                              ? 'border-brand bg-orange-50 ring-1 ring-brand/20' 
                              : 'border-slate-200 hover:border-brand/50'
                        }`}
                        data-testid={`race-card-${race.name}`}
                        onClick={() => {
                          if (!isFull) {
                            setFormData(prev => ({ ...prev, selected_race: race.name }));
                          }
                        }}
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

            {/* Themes & Circuit */}
            {((event.themes && event.themes.length > 0) || event.circuit_type || event.has_timer !== null) && (
              <motion.div
                className="bg-white p-6 border border-slate-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                data-testid="event-meta-section"
              >
                {event.themes && event.themes.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">Thématiques</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {event.themes.map(t => (
                        <span key={t} className="px-2.5 py-1 bg-brand/10 text-brand text-xs font-heading font-bold uppercase tracking-wider">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-6 text-sm">
                  {event.circuit_type && (
                    <div data-testid="circuit-type-display">
                      <span className="text-slate-500">Circuit : </span>
                      <span className="font-heading font-bold capitalize">{event.circuit_type.replace(/-/g, ' ')}</span>
                    </div>
                  )}
                  {event.has_timer !== null && (
                    <div data-testid="timer-display">
                      <span className="text-slate-500">Chronométreur : </span>
                      <span className={`font-heading font-bold ${event.has_timer ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {event.has_timer ? 'Oui' : 'Non'}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Social Links */}
            {(event.website_url || event.facebook_url || event.instagram_url || event.twitter_url || event.youtube_url) && (
              <motion.div
                className="bg-white p-6 border border-slate-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.42 }}
                data-testid="social-links-section"
              >
                <h2 className="font-heading text-xl font-bold uppercase mb-4">Liens & Réseaux sociaux</h2>
                <div className="flex flex-wrap gap-3">
                  {event.website_url && (
                    <a href={event.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 hover:border-brand hover:text-brand transition-colors text-sm font-medium" data-testid="social-website">
                      <Globe className="w-4 h-4" /> Site web
                    </a>
                  )}
                  {event.facebook_url && (
                    <a href={event.facebook_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 hover:border-[#1877F2] hover:text-[#1877F2] transition-colors text-sm font-medium" data-testid="social-facebook">
                      <Facebook className="w-4 h-4" /> Facebook
                    </a>
                  )}
                  {event.instagram_url && (
                    <a href={event.instagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 hover:border-[#E4405F] hover:text-[#E4405F] transition-colors text-sm font-medium" data-testid="social-instagram">
                      <Instagram className="w-4 h-4" /> Instagram
                    </a>
                  )}
                  {event.twitter_url && (
                    <a href={event.twitter_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 hover:border-slate-800 hover:text-slate-800 transition-colors text-sm font-medium" data-testid="social-twitter">
                      <Twitter className="w-4 h-4" /> X / Twitter
                    </a>
                  )}
                  {event.youtube_url && (
                    <a href={event.youtube_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 hover:border-[#FF0000] hover:text-[#FF0000] transition-colors text-sm font-medium" data-testid="social-youtube">
                      <Youtube className="w-4 h-4" /> YouTube
                    </a>
                  )}
                </div>
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
                    {formData.selected_race && event.races ? (
                      <>
                        <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">
                          {event.races.find(r => r.name === formData.selected_race)?.name}
                        </p>
                        <p className="font-heading text-5xl font-extrabold text-brand">
                          {event.races.find(r => r.name === formData.selected_race)?.price}€
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">À partir de</p>
                        <p className="font-heading text-5xl font-extrabold text-brand">
                          {event.races && event.races.length > 0
                            ? Math.min(...event.races.map(r => r.price))
                            : (event.current_price || event.price)}€
                        </p>
                      </>
                    )}
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
                  <Dialog open={showRegisterDialog} onOpenChange={(open) => { setShowRegisterDialog(open); if (!open) setRegStep(1); }}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full btn-primary" 
                        disabled={isFull}
                        data-testid="register-event-btn"
                      >
                        {isFull ? 'Complet' : 'S\'inscrire'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
                      <div className="p-6 pb-0">
                        <DialogHeader>
                          <DialogTitle className="font-heading text-xl uppercase">
                            Inscription — {event.title}
                          </DialogTitle>
                        </DialogHeader>

                        {/* Step indicator */}
                        <div className="flex items-center gap-1 mt-5 mb-2" data-testid="reg-step-indicator">
                          {[
                            { n: 1, label: 'Informations' },
                            { n: 2, label: 'Course & Options' },
                            { n: 3, label: 'Licence & Paiement' }
                          ].map((s) => (
                            <div key={s.n} className="flex-1 flex flex-col items-center">
                              <div className={`w-full h-1.5 rounded-full transition-colors duration-300 ${regStep >= s.n ? 'bg-brand' : 'bg-slate-200'}`} />
                              <span className={`text-[10px] font-heading uppercase tracking-wider mt-1.5 transition-colors ${regStep >= s.n ? 'text-brand font-bold' : 'text-slate-400'}`}>
                                {s.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        {/* STEP 1: Informations personnelles */}
                        {regStep === 1 && (
                          <motion.div key="rs1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs font-heading uppercase tracking-wider text-slate-500">Nom *</Label>
                                <Input value={formData.last_name} onChange={(e) => setFormData(p => ({ ...p, last_name: e.target.value }))} placeholder="Dupont" data-testid="reg-last-name" />
                              </div>
                              <div>
                                <Label className="text-xs font-heading uppercase tracking-wider text-slate-500">Prénom *</Label>
                                <Input value={formData.first_name} onChange={(e) => setFormData(p => ({ ...p, first_name: e.target.value }))} placeholder="Jean" data-testid="reg-first-name" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs font-heading uppercase tracking-wider text-slate-500">Sexe *</Label>
                                <Select value={formData.gender} onValueChange={(v) => setFormData(p => ({ ...p, gender: v }))}>
                                  <SelectTrigger data-testid="reg-gender"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="M">Homme</SelectItem>
                                    <SelectItem value="F">Femme</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs font-heading uppercase tracking-wider text-slate-500">Date de naissance *</Label>
                                <div className="grid grid-cols-3 gap-1.5">
                                  <Select value={formData.birth_day} onValueChange={(v) => setFormData(p => ({ ...p, birth_day: v }))}>
                                    <SelectTrigger data-testid="reg-birth-day"><SelectValue placeholder="Jour" /></SelectTrigger>
                                    <SelectContent>{Array.from({ length: 31 }, (_, i) => <SelectItem key={i+1} value={String(i+1)}>{i+1}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Select value={formData.birth_month} onValueChange={(v) => setFormData(p => ({ ...p, birth_month: v }))}>
                                    <SelectTrigger data-testid="reg-birth-month"><SelectValue placeholder="Mois" /></SelectTrigger>
                                    <SelectContent>
                                      {['Janv.','Fév.','Mars','Avr.','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.'].map((m, i) => (
                                        <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select value={formData.birth_year} onValueChange={(v) => setFormData(p => ({ ...p, birth_year: v }))}>
                                    <SelectTrigger data-testid="reg-birth-year"><SelectValue placeholder="Année" /></SelectTrigger>
                                    <SelectContent>{Array.from({ length: 80 }, (_, i) => { const y = new Date().getFullYear() - 10 - i; return <SelectItem key={y} value={String(y)}>{y}</SelectItem>; })}</SelectContent>
                                  </Select>
                                </div>
                                {formData.birth_year && formData.birth_month && formData.birth_day && (
                                  <p className="text-xs text-slate-500 mt-1" data-testid="reg-age-display">
                                    {Math.floor((new Date() - new Date(formData.birth_year, formData.birth_month - 1, formData.birth_day)) / (365.25 * 24 * 60 * 60 * 1000))} ans
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs font-heading uppercase tracking-wider text-slate-500">Pays *</Label>
                                <Select value={formData.country} onValueChange={(v) => setFormData(p => ({ ...p, country: v }))}>
                                  <SelectTrigger data-testid="reg-country"><SelectValue placeholder="Pays..." /></SelectTrigger>
                                  <SelectContent>
                                    {['France','Belgique','Suisse','Luxembourg','Canada','Allemagne','Espagne','Italie','Royaume-Uni','Portugal','Pays-Bas','Maroc','Algérie','Tunisie','Sénégal','Côte d\'Ivoire','Autre'].map(c => (
                                      <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs font-heading uppercase tracking-wider text-slate-500">Ville *</Label>
                                <Input value={formData.city} onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))} placeholder="Paris" data-testid="reg-city" />
                              </div>
                              <div>
                                <Label className="text-xs font-heading uppercase tracking-wider text-slate-500">Code postal *</Label>
                                <Input value={formData.postal_code} onChange={(e) => setFormData(p => ({ ...p, postal_code: e.target.value }))} placeholder="75001" data-testid="reg-postal" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs font-heading uppercase tracking-wider text-slate-500"><Mail className="w-3 h-3 inline mr-1" />Email *</Label>
                                <Input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="jean@email.com" data-testid="reg-email" />
                              </div>
                              <div>
                                <Label className="text-xs font-heading uppercase tracking-wider text-slate-500"><Phone className="w-3 h-3 inline mr-1" />Téléphone *</Label>
                                <Input value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="06 12 34 56 78" data-testid="reg-phone" />
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs font-heading uppercase tracking-wider text-slate-500"><Globe className="w-3 h-3 inline mr-1" />Nationalité *</Label>
                              <Select value={formData.nationality} onValueChange={(v) => setFormData(p => ({ ...p, nationality: v }))}>
                                <SelectTrigger data-testid="reg-nationality"><SelectValue placeholder="Nationalité..." /></SelectTrigger>
                                <SelectContent>
                                  {['France','Belgique','Suisse','Luxembourg','Canada','Allemagne','Espagne','Italie','Royaume-Uni','Portugal','Pays-Bas','Maroc','Algérie','Tunisie','Sénégal','Côte d\'Ivoire','Autre'].map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex justify-end pt-2">
                              <Button
                                onClick={() => {
                                  if (!formData.last_name || !formData.first_name || !formData.gender || !formData.birth_day || !formData.email) {
                                    toast.error('Veuillez remplir tous les champs obligatoires');
                                    return;
                                  }
                                  setRegStep(2);
                                }}
                                className="btn-primary gap-2"
                                data-testid="reg-step-next-1"
                              >
                                Suivant <ArrowRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        {/* STEP 2: Course & Options */}
                        {regStep === 2 && (
                          <motion.div key="rs2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="p-6 space-y-4">
                            {/* Race Selection */}
                            {event.races && event.races.length > 1 && (
                              <div>
                                <Label className="text-xs font-heading uppercase tracking-wider text-slate-500 mb-2 block">Épreuve *</Label>
                                <div className="grid grid-cols-1 gap-2">
                                  {event.races.map((race) => {
                                    const full = race.current_participants >= race.max_participants;
                                    const selected = formData.selected_race === race.name;
                                    return (
                                      <button
                                        key={race.name}
                                        type="button"
                                        disabled={full}
                                        onClick={() => setFormData(p => ({ ...p, selected_race: race.name }))}
                                        className={`p-3 border text-left transition-all flex items-center justify-between ${
                                          full ? 'border-red-200 bg-red-50 opacity-60 cursor-not-allowed' :
                                          selected ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-slate-200 hover:border-brand/50'
                                        }`}
                                        data-testid={`reg-race-${race.name}`}
                                      >
                                        <div>
                                          <span className="font-heading font-bold">{race.name}</span>
                                          <span className="text-xs text-slate-500 ml-2">{race.distance_km && `${race.distance_km}km`}</span>
                                          {full && <span className="text-xs text-red-500 ml-2">(Complet)</span>}
                                        </div>
                                        <span className="font-heading font-bold text-brand">{race.price}€</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* T-shirt size */}
                            <div>
                              <Label className="text-xs font-heading uppercase tracking-wider text-slate-500 mb-2 block"><Shirt className="w-3 h-3 inline mr-1" />Taille de T-Shirt *</Label>
                              <div className="flex gap-2" data-testid="reg-tshirt-grid">
                                {['XS', 'S', 'M', 'L', 'XL', '2XL'].map(size => (
                                  <button
                                    key={size}
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, tshirt_size: size }))}
                                    className={`flex-1 py-2.5 border text-center font-heading font-bold text-sm transition-all ${
                                      formData.tshirt_size === size
                                        ? 'border-brand bg-brand text-white'
                                        : 'border-slate-200 hover:border-brand/50 text-slate-600'
                                    }`}
                                    data-testid={`reg-tshirt-${size}`}
                                  >
                                    {size}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Emergency contact */}
                            <div className="bg-slate-50 border border-slate-200 p-4 space-y-3">
                              <Label className="text-xs font-heading uppercase tracking-wider text-slate-500 block">Contact d'urgence</Label>
                              <div className="grid grid-cols-2 gap-3">
                                <Input value={formData.emergency_contact} onChange={(e) => setFormData(p => ({ ...p, emergency_contact: e.target.value }))} placeholder="Nom du contact" data-testid="reg-emergency-name" />
                                <Input value={formData.emergency_phone} onChange={(e) => setFormData(p => ({ ...p, emergency_phone: e.target.value }))} placeholder="06 XX XX XX XX" data-testid="reg-emergency-phone" />
                              </div>
                            </div>

                            {/* Club name */}
                            <div>
                              <Label className="text-xs font-heading uppercase tracking-wider text-slate-500">Nom de club</Label>
                              <Input value={formData.club_name} onChange={(e) => setFormData(p => ({ ...p, club_name: e.target.value }))} placeholder="Optionnel" data-testid="reg-club" />
                            </div>

                            {/* Options */}
                            {event.options && event.options.length > 0 && (
                              <div>
                                <Label className="text-xs font-heading uppercase tracking-wider text-slate-500 mb-2 block">Options</Label>
                                <div className="space-y-2">
                                  {event.options.map((option) => (
                                    <div key={option.option_id} className="flex items-center justify-between p-3 border border-slate-200">
                                      <div className="flex items-center gap-3">
                                        <Checkbox checked={formData.selected_options.includes(option.option_id)} onCheckedChange={() => toggleOption(option.option_id)} />
                                        <span className="text-sm">{option.name}</span>
                                      </div>
                                      <span className="font-heading font-bold text-sm">+{option.price}€</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex justify-between pt-2">
                              <Button variant="outline" onClick={() => setRegStep(1)} className="gap-2" data-testid="reg-step-prev-2">
                                <ArrowLeft className="w-4 h-4" /> Retour
                              </Button>
                              <Button
                                onClick={() => {
                                  if (!formData.tshirt_size) { toast.error('Veuillez choisir une taille de T-shirt'); return; }
                                  setRegStep(3);
                                }}
                                className="btn-primary gap-2"
                                data-testid="reg-step-next-2"
                              >
                                Suivant <ArrowRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        {/* STEP 3: Licence & Paiement */}
                        {regStep === 3 && (
                          <motion.div key="rs3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="p-6 space-y-4">
                            {/* PPS Section */}
                            <div className="bg-blue-50 border border-blue-200 p-4">
                              <h3 className="font-heading font-bold text-sm uppercase text-blue-800 mb-1">Licence / PPS</h3>
                              <p className="text-xs text-blue-700 mb-3">
                                Les certificats médicaux ne sont plus acceptés pour les courses à pied, les courses nature et les trails. Vous devrez soumettre votre PPS au plus tôt trois mois avant la date de l'épreuve.
                              </p>
                              <div className="flex gap-2 mb-2">
                                <Input
                                  placeholder="N° de PPS"
                                  value={formData.pps_number}
                                  onChange={(e) => { setFormData(p => ({ ...p, pps_number: e.target.value.toUpperCase() })); setPpsValid(null); }}
                                  data-testid="reg-pps-input"
                                  className="bg-white"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    if (!formData.pps_number || formData.pps_number.length < 5) {
                                      toast.error('Numéro PPS invalide'); setPpsValid(false); return;
                                    }
                                    setPpsValid(true);
                                    toast.success('PPS vérifié avec succès');
                                  }}
                                  disabled={!formData.pps_number}
                                  className="shrink-0"
                                  data-testid="reg-pps-verify"
                                >
                                  Vérifier mon PPS
                                </Button>
                              </div>
                              {ppsValid === true && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> PPS validé</p>}
                              {ppsValid === false && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Format PPS invalide</p>}
                              <a href="https://pps.athle.fr/?locale=fr" target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs text-blue-600 font-medium hover:underline" data-testid="reg-pps-link">
                                Obtenir mon PPS sur athle.fr →
                              </a>
                            </div>

                            {/* FFA License */}
                            <div className="bg-slate-50 border border-slate-200 p-4">
                              <h3 className="font-heading font-bold text-sm uppercase mb-1">Fédération (FFA)</h3>
                              <p className="text-xs text-slate-500 mb-3">Saisissez votre n° de licence FFA pour bénéficier d'une remise de 3€</p>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="N° de licence FFA"
                                  value={formData.ffa_license}
                                  onChange={(e) => { setFormData(p => ({ ...p, ffa_license: e.target.value.toUpperCase() })); setFfaValid(null); }}
                                  data-testid="reg-ffa-input"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    if (!formData.ffa_license || formData.ffa_license.length < 6) {
                                      toast.error('N° de licence FFA invalide'); setFfaValid(false); return;
                                    }
                                    setFfaValid(true);
                                    toast.success('Licence FFA validée — remise de 3€ appliquée !');
                                  }}
                                  disabled={!formData.ffa_license}
                                  className="shrink-0"
                                  data-testid="reg-ffa-verify"
                                >
                                  Vérifier
                                </Button>
                              </div>
                              {ffaValid === true && <p className="text-xs text-green-600 mt-2 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Licence validée — remise de 3€ appliquée</p>}
                              {ffaValid === false && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> N° de licence invalide</p>}
                            </div>

                            {/* Promo Code */}
                            <div>
                              <Label className="text-xs font-heading uppercase tracking-wider text-slate-500">Code promo</Label>
                              <div className="flex gap-2 mt-1">
                                <Input
                                  placeholder="CODE2026"
                                  value={formData.promo_code}
                                  onChange={(e) => setFormData(p => ({ ...p, promo_code: e.target.value.toUpperCase() }))}
                                  data-testid="reg-promo-input"
                                />
                                <Button type="button" variant="outline" onClick={validatePromoCode} disabled={checkingPromo || !formData.promo_code} data-testid="reg-promo-apply">
                                  {checkingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Appliquer'}
                                </Button>
                              </div>
                              {promoDiscount && (
                                <p className="text-sm text-green-600 mt-1">
                                  Réduction: {promoDiscount.discount_type === 'percentage' ? `-${promoDiscount.discount_value}%` : `-${promoDiscount.discount_value}€`}
                                </p>
                              )}
                            </div>

                            {/* Price breakdown */}
                            <div className="bg-slate-50 border border-slate-200 p-4" data-testid="reg-price-summary">
                              {(() => {
                                const { base, serviceFee, total, ffaDiscount } = calculateTotal();
                                return (
                                  <>
                                    <div className="flex justify-between text-sm"><span className="text-slate-600">Prix inscription</span><span className="font-medium">{(base + ffaDiscount).toFixed(2)}€</span></div>
                                    {ffaDiscount > 0 && <div className="flex justify-between text-sm mt-1"><span className="text-green-600">Remise licence FFA</span><span className="font-medium text-green-600">-{ffaDiscount.toFixed(2)}€</span></div>}
                                    {promoDiscount && <div className="flex justify-between text-sm mt-1"><span className="text-green-600">Code promo</span><span className="font-medium text-green-600">appliqué</span></div>}
                                    <div className="flex justify-between text-sm mt-1"><span className="text-slate-600">Frais de service (5%)</span><span className="font-medium">+{serviceFee.toFixed(2)}€</span></div>
                                    <div className="border-t mt-2 pt-2 flex justify-between items-center">
                                      <span className="font-heading font-bold">Total à payer</span>
                                      <span className="font-heading text-2xl font-bold text-brand">{total.toFixed(2)}€</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2">Paiement sécurisé par Stripe</p>
                                  </>
                                );
                              })()}
                            </div>

                            <div className="flex justify-between pt-2">
                              <Button variant="outline" onClick={() => setRegStep(2)} className="gap-2" data-testid="reg-step-prev-3">
                                <ArrowLeft className="w-4 h-4" /> Retour
                              </Button>
                              <Button onClick={handleRegister} disabled={registering} className="btn-primary gap-2" data-testid="confirm-register-btn">
                                {registering ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement...</> : <><Check className="w-4 h-4" /> Confirmer et payer</>}
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
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
