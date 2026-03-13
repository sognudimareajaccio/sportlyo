import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Plus, Calendar, Users, Euro, TrendingUp, Settings,
  Eye, Edit, Trash2, BarChart3, ChevronRight, Building2, QrCode, Scan,
  Upload, Image, X, Loader2, Download, FileText, MapPin,
  Bike, Footprints, Medal, Car, ArrowRight, ArrowLeft, Mountain, Clock, Check,
  Route, Navigation, Globe, Facebook, Instagram, Youtube, Twitter, Tag, Timer,
  Target, Wind, Flag, CircleDot, Dumbbell, Swords
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import { eventsApi, authApi } from '../services/api';
import api from '../services/api';
import { toast } from 'sonner';
import DateTimePicker from '../components/DateTimePicker';
import OrganizerNav from '../components/OrganizerNav';

const sportOptions = [
  { value: 'cycling', label: 'Cyclisme', icon: Bike },
  { value: 'running', label: 'Course à pied', icon: Footprints },
  { value: 'triathlon', label: 'Triathlon', icon: Medal },
  { value: 'walking', label: 'Marche', icon: Footprints },
  { value: 'motorsport', label: 'Sports Mécaniques', icon: Car },
  { value: 'rallye', label: 'Rallye Voitures', icon: Car },
  { value: 'vtt', label: 'VTT', icon: Mountain },
  { value: 'bmx', label: 'BMX', icon: Bike },
  { value: 'cyclocross', label: 'Cyclo-cross', icon: Bike },
  { value: 'racquet', label: 'Sports de raquette', icon: Target },
  { value: 'archery', label: 'Tir à l\'arc', icon: Target },
  { value: 'kitesurf', label: 'Kitesurf', icon: Wind },
  { value: 'golf', label: 'Golf', icon: Flag },
  { value: 'petanque', label: 'Pétanque', icon: CircleDot },
  { value: 'billard', label: 'Billard', icon: CircleDot },
  { value: 'bowling', label: 'Bowling', icon: CircleDot },
  { value: 'crossfit', label: 'CrossFit', icon: Dumbbell },
  { value: 'combat', label: 'Sports de combat', icon: Swords }
];

const OrganizerDashboard = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [createStep, setCreateStep] = useState(1);

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    sport_type: 'running',
    location: '',
    date: '',
    max_participants: 100,
    price: 25,
    distances: '',
    elevation_gain: '',
    image_url: '',
    requires_pps: false,
    requires_medical_cert: false,
    allows_teams: false,
    min_age: '',
    max_age: '',
    races: [],
    route_url: '',
    exact_address: '',
    regulations: '',
    themes: [],
    circuit_type: '',
    has_timer: null,
    website_url: '',
    facebook_url: '',
    instagram_url: '',
    twitter_url: '',
    youtube_url: ''
  });

  const [upgradeData, setUpgradeData] = useState({
    company_name: '',
    description: '',
    iban: ''
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';

  useEffect(() => {
    if (isOrganizer) {
      fetchEvents();
    } else {
      setLoading(false);
    }
  }, [isOrganizer]);

  const fetchEvents = async () => {
    try {
      const res = await eventsApi.getOrganizerEvents();
      setEvents(res.data.events);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.location) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setCreating(true);
    try {
      let eventDate;
      try {
        eventDate = new Date(newEvent.date).toISOString();
      } catch {
        toast.error('Date invalide, veuillez la resélectionner');
        setCreating(false);
        return;
      }

      const eventData = {
        ...newEvent,
        date: eventDate,
        distances: (newEvent.distances || '').split(',').map(d => d.trim()).filter(Boolean),
        elevation_gain: newEvent.elevation_gain ? parseInt(newEvent.elevation_gain) : null,
        min_age: newEvent.min_age ? parseInt(newEvent.min_age) : null,
        max_age: newEvent.max_age ? parseInt(newEvent.max_age) : null
      };

      await eventsApi.create(eventData);
      toast.success('Événement créé avec succès !');
      setShowCreateDialog(false);
      setCreateStep(1);
      setNewEvent({
        title: '', description: '', sport_type: 'running', location: '',
        date: '', max_participants: 100, price: 25, distances: '',
        elevation_gain: '', image_url: '', requires_pps: false,
        requires_medical_cert: false, allows_teams: false, min_age: '', max_age: '',
        races: []
      });
      setImagePreview(null);
      fetchEvents();
    } catch (error) {
      console.error('Create event error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  // Open edit dialog with event data
  const openEditDialog = (event) => {
    setEditingEvent(event);
    setImagePreview(event.image_url || null);
    setShowEditDialog(true);
  };

  // Handle edit event
  const handleEditEvent = async () => {
    if (!editingEvent.title || !editingEvent.location) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setEditing(true);
    try {
      const updateData = {
        title: editingEvent.title,
        description: editingEvent.description,
        sport_type: editingEvent.sport_type,
        date: editingEvent.date,
        location: editingEvent.location,
        max_participants: editingEvent.max_participants,
        price: editingEvent.price,
        distances: editingEvent.distances,
        elevation_gain: editingEvent.elevation_gain,
        image_url: editingEvent.image_url,
        requires_pps: editingEvent.requires_pps,
        races: editingEvent.races || []
      };

      await eventsApi.update(editingEvent.event_id, updateData);
      toast.success('Événement mis à jour !');
      setShowEditDialog(false);
      setEditingEvent(null);
      setImagePreview(null);
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setEditing(false);
    }
  };

  // Add race to event
  const addRace = (isEdit = false) => {
    const newRace = {
      name: '',
      price: 25,
      max_participants: 100,
      distance_km: '',
      elevation_gain: ''
    };
    
    if (isEdit && editingEvent) {
      setEditingEvent(prev => ({
        ...prev,
        races: [...(prev.races || []), newRace]
      }));
    } else {
      setNewEvent(prev => ({
        ...prev,
        races: [...(prev.races || []), newRace]
      }));
    }
  };

  // Update race
  const updateRace = (index, field, value, isEdit = false) => {
    if (isEdit && editingEvent) {
      setEditingEvent(prev => ({
        ...prev,
        races: prev.races.map((race, i) => 
          i === index ? { ...race, [field]: value } : race
        )
      }));
    } else {
      setNewEvent(prev => ({
        ...prev,
        races: prev.races.map((race, i) => 
          i === index ? { ...race, [field]: value } : race
        )
      }));
    }
  };

  // Remove race
  const removeRace = (index, isEdit = false) => {
    if (isEdit && editingEvent) {
      setEditingEvent(prev => ({
        ...prev,
        races: prev.races.filter((_, i) => i !== index)
      }));
    } else {
      setNewEvent(prev => ({
        ...prev,
        races: prev.races.filter((_, i) => i !== index)
      }));
    }
  };

  // Handle edit image upload
  const handleEditImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format non supporté');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image trop volumineuse (max 10MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const imageUrl = `${process.env.REACT_APP_BACKEND_URL}${response.data.url}`;
      setEditingEvent(prev => ({ ...prev, image_url: imageUrl }));
      toast.success('Image uploadée !');
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
      setImagePreview(editingEvent?.image_url || null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG, GIF ou WebP');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image trop volumineuse (max 10MB)');
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    // Upload
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const imageUrl = `${process.env.REACT_APP_BACKEND_URL}${response.data.url}`;
      setNewEvent(prev => ({ ...prev, image_url: imageUrl }));
      toast.success('Image uploadée !');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'upload');
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setNewEvent(prev => ({ ...prev, image_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpgradeToOrganizer = async () => {
    try {
      await authApi.upgradeRole({
        role: 'organizer',
        ...upgradeData
      });
      updateUser({ role: 'organizer' });
      toast.success('Vous êtes maintenant organisateur !');
      setShowUpgradeDialog(false);
    } catch (error) {
      toast.error('Erreur lors de la mise à niveau');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cet événement ?')) return;
    
    try {
      await eventsApi.delete(eventId);
      toast.success('Événement annulé');
      fetchEvents();
    } catch (error) {
      toast.error('Erreur lors de l\'annulation');
    }
  };

  // Stats calculation
  const totalParticipants = events.reduce((sum, e) => sum + e.current_participants, 0);
  const totalRevenue = events.reduce((sum, e) => sum + (e.current_participants * e.price), 0);
  const organizerRevenue = totalRevenue; // L'organisateur reçoit 100% du prix de base

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader" />
      </div>
    );
  }

  // Show upgrade prompt if not organizer
  if (!isOrganizer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" data-testid="organizer-upgrade">
        <motion.div
          className="max-w-md w-full bg-white border border-slate-200 p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Building2 className="w-16 h-16 text-brand mx-auto mb-6" />
          <h1 className="font-heading text-2xl font-bold uppercase mb-4">Devenir Organisateur</h1>
          <p className="text-slate-500 mb-6">
            Créez vos propres événements sportifs, gérez les inscriptions et suivez vos statistiques en temps réel.
          </p>
          <ul className="text-left text-sm text-slate-600 mb-8 space-y-2">
            <li className="flex items-center"><span className="text-brand mr-2">✓</span> Création illimitée d'événements</li>
            <li className="flex items-center"><span className="text-brand mr-2">✓</span> Gestion des inscriptions</li>
            <li className="flex items-center"><span className="text-brand mr-2">✓</span> Statistiques détaillées</li>
            <li className="flex items-center"><span className="text-brand mr-2">✓</span> Frais de 5% ajoutés au participant (vous recevez 100%)</li>
          </ul>

          <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
            <DialogTrigger asChild>
              <Button className="w-full btn-primary" data-testid="upgrade-btn">
                Devenir Organisateur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading text-xl uppercase">Informations organisateur</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Nom de l'organisation *</Label>
                  <Input
                    placeholder="Mon Club Sportif"
                    value={upgradeData.company_name}
                    onChange={(e) => setUpgradeData(prev => ({ ...prev, company_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Décrivez votre organisation..."
                    value={upgradeData.description}
                    onChange={(e) => setUpgradeData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>IBAN (pour les virements)</Label>
                  <Input
                    placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                    value={upgradeData.iban}
                    onChange={(e) => setUpgradeData(prev => ({ ...prev, iban: e.target.value }))}
                  />
                </div>
                <Button onClick={handleUpgradeToOrganizer} className="w-full btn-primary">
                  Confirmer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="organizer-dashboard">
      {/* Header */}
      <div className="bg-asphalt text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-2xl font-bold">Espace Organisateur</h1>
              <p className="text-slate-400">Gérez vos événements et suivez vos performances</p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={(open) => {
              setShowCreateDialog(open);
              if (!open) {
                setCreateStep(1);
                setNewEvent({
                  title: '', description: '', sport_type: 'running', location: '',
                  date: '', max_participants: 100, price: 25, distances: '',
                  elevation_gain: '', image_url: '', requires_pps: false,
                  requires_medical_cert: false, allows_teams: false, min_age: '', max_age: '',
                  races: [], route_url: '', exact_address: '', regulations: '',
                  themes: [], circuit_type: '', has_timer: null,
                  website_url: '', facebook_url: '', instagram_url: '', twitter_url: '', youtube_url: ''
                });
                setImagePreview(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="btn-primary" data-testid="create-event-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvel événement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
                <div className="p-6 pb-0">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-xl uppercase">Créer un événement</DialogTitle>
                    <DialogDescription className="sr-only">Formulaire de création d'événement</DialogDescription>
                  </DialogHeader>

                  {/* Step indicator */}
                  <div className="flex items-center gap-1 mt-5 mb-2" data-testid="create-step-indicator">
                    {[
                      { n: 1, label: 'Sport & Lieu' },
                      { n: 2, label: 'Configuration' },
                      { n: 3, label: 'Parcours & Visuels' },
                      { n: 4, label: 'Épreuves' }
                    ].map((s) => (
                      <div key={s.n} className="flex-1 flex flex-col items-center">
                        <div className={`w-full h-1.5 rounded-full transition-colors duration-300 ${createStep >= s.n ? 'bg-brand' : 'bg-slate-200'}`} />
                        <span className={`text-[10px] font-heading uppercase tracking-wider mt-1.5 transition-colors ${createStep >= s.n ? 'text-brand font-bold' : 'text-slate-400'}`}>
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {/* STEP 1: Sport & Lieu */}
                  {createStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="p-6 space-y-5"
                    >
                      <div>
                        <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 mb-2 block">Nom de l'événement *</Label>
                        <Input
                          placeholder="Ex: Marathon de Lyon 2026"
                          value={newEvent.title}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                          className="h-12 text-lg font-heading"
                          data-testid="event-title-input"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 mb-3 block">Type de sport *</Label>
                        <div className="grid grid-cols-6 gap-2 max-h-[220px] overflow-y-auto pr-1" data-testid="sport-type-grid">
                          {sportOptions.map((opt) => {
                            const Icon = opt.icon;
                            const selected = newEvent.sport_type === opt.value;
                            return (
                              <motion.button
                                key={opt.value}
                                type="button"
                                onClick={() => setNewEvent(prev => ({ ...prev, sport_type: opt.value }))}
                                className={`p-3 border text-center transition-all ${
                                  selected
                                    ? 'border-brand bg-brand/5 ring-1 ring-brand'
                                    : 'border-slate-200 hover:border-brand/50'
                                }`}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.97 }}
                                data-testid={`sport-option-${opt.value}`}
                              >
                                <Icon className={`w-7 h-7 mx-auto mb-1.5 transition-colors ${selected ? 'text-brand' : 'text-slate-400'}`} />
                                <span className={`font-heading text-[10px] uppercase tracking-wider font-bold block ${selected ? 'text-brand' : 'text-slate-500'}`}>
                                  {opt.label}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 mb-2 block">
                            <Calendar className="w-3.5 h-3.5 inline mr-1" />Date *
                          </Label>
                          <DateTimePicker
                            value={newEvent.date}
                            onChange={(val) => setNewEvent(prev => ({ ...prev, date: val }))}
                            placeholder="Choisir la date"
                            testId="event-date-input"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 mb-2 block">
                            <MapPin className="w-3.5 h-3.5 inline mr-1" />Lieu *
                          </Label>
                          <Input
                            placeholder="Paris, France"
                            value={newEvent.location}
                            onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                            data-testid="event-location-input"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 mb-2 block">
                          <Navigation className="w-3.5 h-3.5 inline mr-1" />Adresse exacte du départ
                        </Label>
                        <Input
                          placeholder="12 Quai Claude Bernard, 69007 Lyon"
                          value={newEvent.exact_address}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, exact_address: e.target.value }))}
                          data-testid="event-exact-address-input"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Sera affichée sur une carte avec itinéraire</p>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={() => {
                            if (!newEvent.title || !newEvent.date || !newEvent.location) {
                              toast.error('Remplissez le titre, la date et le lieu');
                              return;
                            }
                            setCreateStep(2);
                          }}
                          className="btn-primary gap-2"
                          data-testid="step-next-1"
                        >
                          Suivant <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: Configuration */}
                  {createStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="p-6 space-y-5"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200 p-4">
                          <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-brand" /> Participants max
                          </Label>
                          <Input
                            type="number"
                            value={newEvent.max_participants}
                            onChange={(e) => setNewEvent(prev => ({ ...prev, max_participants: parseInt(e.target.value) || 0 }))}
                            className="text-lg font-heading font-bold border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                          />
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-4">
                          <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                            <Euro className="w-4 h-4 text-brand" /> Prix de base (€)
                          </Label>
                          <Input
                            type="number"
                            value={newEvent.price}
                            onChange={(e) => setNewEvent(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                            className="text-lg font-heading font-bold border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                            data-testid="event-price-input"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-brand" /> Distances
                          </Label>
                          <Input
                            placeholder="10km, 21km, 42km"
                            value={newEvent.distances}
                            onChange={(e) => setNewEvent(prev => ({ ...prev, distances: e.target.value }))}
                          />
                          <p className="text-[10px] text-slate-400 mt-1">Séparées par des virgules</p>
                        </div>
                        <div>
                          <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                            <Mountain className="w-4 h-4 text-brand" /> Dénivelé (m)
                          </Label>
                          <Input
                            type="number"
                            placeholder="500"
                            value={newEvent.elevation_gain}
                            onChange={(e) => setNewEvent(prev => ({ ...prev, elevation_gain: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-6 p-4 bg-slate-50 border border-slate-200">
                        <label className="flex items-center gap-2 cursor-pointer" data-testid="requires-pps-toggle">
                          <input
                            type="checkbox"
                            checked={newEvent.requires_pps}
                            onChange={(e) => setNewEvent(prev => ({ ...prev, requires_pps: e.target.checked }))}
                            className="w-4 h-4 accent-brand"
                          />
                          <span className="text-sm font-medium">PPS obligatoire</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newEvent.allows_teams}
                            onChange={(e) => setNewEvent(prev => ({ ...prev, allows_teams: e.target.checked }))}
                            className="w-4 h-4 accent-brand"
                          />
                          <span className="text-sm font-medium">Équipes autorisées</span>
                        </label>
                      </div>

                      {/* Thématiques */}
                      <div>
                        <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                          <Tag className="w-4 h-4 text-brand" /> Thématiques
                        </Label>
                        <div className="flex flex-wrap gap-2" data-testid="themes-grid">
                          {['Trail', 'Marathon', 'Semi-marathon', '10km', 'Ultra-trail', 'Course nature', 'Course sur route', 'Marche nordique', 'Triathlon', 'Duathlon', 'Cyclisme', 'VTT', 'Gravel', 'Course d\'obstacles', 'Course caritative', 'Course nocturne'].map(theme => {
                            const selected = (newEvent.themes || []).includes(theme);
                            return (
                              <button
                                key={theme}
                                type="button"
                                onClick={() => setNewEvent(prev => ({
                                  ...prev,
                                  themes: selected ? prev.themes.filter(t => t !== theme) : [...(prev.themes || []), theme]
                                }))}
                                className={`px-3 py-1.5 text-xs font-heading font-bold uppercase tracking-wider border transition-all ${
                                  selected ? 'border-brand bg-brand text-white' : 'border-slate-200 text-slate-500 hover:border-brand/50'
                                }`}
                                data-testid={`theme-${theme}`}
                              >
                                {theme}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Circuit & Chronométreur */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                            <Route className="w-4 h-4 text-brand" /> Type de circuit
                          </Label>
                          <Select value={newEvent.circuit_type} onValueChange={(v) => setNewEvent(prev => ({ ...prev, circuit_type: v }))}>
                            <SelectTrigger data-testid="circuit-type-select"><SelectValue placeholder="Choisir un circuit..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="boucle">Boucle</SelectItem>
                              <SelectItem value="aller-retour">Aller-retour</SelectItem>
                              <SelectItem value="point-a-point">Point à point</SelectItem>
                              <SelectItem value="multi-boucles">Multi-boucles</SelectItem>
                              <SelectItem value="semi-boucle">Semi-boucle</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                            <Timer className="w-4 h-4 text-brand" /> Avez-vous un chronométreur ?
                          </Label>
                          <div className="flex gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => setNewEvent(prev => ({ ...prev, has_timer: true }))}
                              className={`flex-1 py-2 border text-sm font-heading font-bold uppercase tracking-wider transition-all ${
                                newEvent.has_timer === true ? 'border-brand bg-brand text-white' : 'border-slate-200 text-slate-500 hover:border-brand/50'
                              }`}
                              data-testid="has-timer-yes"
                            >
                              Oui
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewEvent(prev => ({ ...prev, has_timer: false }))}
                              className={`flex-1 py-2 border text-sm font-heading font-bold uppercase tracking-wider transition-all ${
                                newEvent.has_timer === false ? 'border-brand bg-brand text-white' : 'border-slate-200 text-slate-500 hover:border-brand/50'
                              }`}
                              data-testid="has-timer-no"
                            >
                              Non
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between pt-2">
                        <Button variant="outline" onClick={() => setCreateStep(1)} className="gap-2" data-testid="step-prev-2">
                          <ArrowLeft className="w-4 h-4" /> Retour
                        </Button>
                        <Button onClick={() => setCreateStep(3)} className="btn-primary gap-2" data-testid="step-next-2">
                          Suivant <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: Parcours, Visuels & Règlement */}
                  {createStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="p-6 space-y-5"
                    >
                      {/* Image */}
                      <div>
                        <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 mb-3 block">Image de l'événement</Label>
                        {(imagePreview || newEvent.image_url) ? (
                          <div className="relative rounded overflow-hidden border border-slate-200">
                            <img
                              src={imagePreview || newEvent.image_url}
                              alt="Preview"
                              className="w-full h-40 object-cover"
                            />
                            <button
                              type="button"
                              onClick={removeImage}
                              className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 hover:border-brand p-6 text-center cursor-pointer transition-colors group"
                            data-testid="image-drop-zone"
                          >
                            <Upload className="w-8 h-8 mx-auto mb-2 text-slate-300 group-hover:text-brand transition-colors" />
                            <p className="font-heading font-bold text-xs uppercase tracking-wider text-slate-500 group-hover:text-brand">
                              {uploadingImage ? 'Upload en cours...' : 'Cliquez pour uploader'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">JPG, PNG, GIF ou WebP — Max 10MB</p>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="event-image-upload"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-400">ou</span>
                          <Input
                            placeholder="URL de l'image (https://...)"
                            value={newEvent.image_url}
                            onChange={(e) => {
                              setNewEvent(prev => ({ ...prev, image_url: e.target.value }));
                              setImagePreview(null);
                            }}
                            className="flex-1 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 mb-2 block">Description</Label>
                        <Textarea
                          placeholder="Décrivez votre événement : parcours, ambiance, services..."
                          rows={3}
                          value={newEvent.description}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                          data-testid="event-description-input"
                        />
                      </div>

                      {/* Règlement */}
                      <div>
                        <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-brand" /> Règlement de la course
                        </Label>
                        <Textarea
                          placeholder="Conditions de participation, matériel obligatoire, règles de sécurité..."
                          rows={4}
                          value={newEvent.regulations}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, regulations: e.target.value }))}
                          data-testid="event-regulations-input"
                        />
                      </div>

                      {/* Social Links */}
                      <div>
                        <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 mb-3 block">Réseaux sociaux & site web</Label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <Input placeholder="https://www.monsite.com" value={newEvent.website_url} onChange={(e) => setNewEvent(prev => ({ ...prev, website_url: e.target.value }))} data-testid="event-website" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Facebook className="w-4 h-4 text-[#1877F2] flex-shrink-0" />
                            <Input placeholder="https://facebook.com/..." value={newEvent.facebook_url} onChange={(e) => setNewEvent(prev => ({ ...prev, facebook_url: e.target.value }))} data-testid="event-facebook" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Instagram className="w-4 h-4 text-[#E4405F] flex-shrink-0" />
                            <Input placeholder="https://instagram.com/..." value={newEvent.instagram_url} onChange={(e) => setNewEvent(prev => ({ ...prev, instagram_url: e.target.value }))} data-testid="event-instagram" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Twitter className="w-4 h-4 text-slate-800 flex-shrink-0" />
                            <Input placeholder="https://x.com/..." value={newEvent.twitter_url} onChange={(e) => setNewEvent(prev => ({ ...prev, twitter_url: e.target.value }))} data-testid="event-twitter" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Youtube className="w-4 h-4 text-[#FF0000] flex-shrink-0" />
                            <Input placeholder="https://youtube.com/..." value={newEvent.youtube_url} onChange={(e) => setNewEvent(prev => ({ ...prev, youtube_url: e.target.value }))} data-testid="event-youtube" />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between pt-2">
                        <Button variant="outline" onClick={() => setCreateStep(2)} className="gap-2" data-testid="step-prev-3">
                          <ArrowLeft className="w-4 h-4" /> Retour
                        </Button>
                        <div className="flex gap-2">
                          <Button onClick={() => setCreateStep(4)} variant="outline" className="gap-2" data-testid="step-next-3">
                            Ajouter des épreuves <ArrowRight className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={handleCreateEvent}
                            disabled={creating}
                            className="btn-primary gap-2"
                            data-testid="submit-event-btn"
                          >
                            {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Création...</> : <><Check className="w-4 h-4" /> Créer l'événement</>}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 4: Épreuves */}
                  {createStep === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="p-6 space-y-5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-heading uppercase tracking-wider text-slate-500 block">Épreuves / Distances avec tarifs</Label>
                          <p className="text-xs text-slate-400 mt-0.5">Optionnel — définissez des tarifs différents par distance</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addRace(false)}
                          className="gap-1"
                          data-testid="add-race-btn"
                        >
                          <Plus className="w-4 h-4" /> Ajouter
                        </Button>
                      </div>

                      {newEvent.races && newEvent.races.length > 0 ? (
                        <div className="space-y-3">
                          {newEvent.races.map((race, index) => (
                            <motion.div
                              key={index}
                              className="flex gap-2 items-start p-4 bg-slate-50 border border-slate-200"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="flex-1">
                                <Input
                                  placeholder="Nom (ex: 10km, Marathon)"
                                  value={race.name}
                                  onChange={(e) => updateRace(index, 'name', e.target.value, false)}
                                  className="mb-2 font-heading font-bold"
                                />
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <Label className="text-[10px] font-heading uppercase tracking-wider text-slate-400">Prix (€)</Label>
                                    <Input type="number" value={race.price} onChange={(e) => updateRace(index, 'price', parseFloat(e.target.value), false)} />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] font-heading uppercase tracking-wider text-slate-400">Places max</Label>
                                    <Input type="number" value={race.max_participants} onChange={(e) => updateRace(index, 'max_participants', parseInt(e.target.value), false)} />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] font-heading uppercase tracking-wider text-slate-400">Distance (km)</Label>
                                    <Input type="number" value={race.distance_km} onChange={(e) => updateRace(index, 'distance_km', e.target.value, false)} />
                                  </div>
                                </div>
                              </div>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeRace(index, false)} className="text-red-500 mt-1">
                                <X className="w-4 h-4" />
                              </Button>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-300">
                          <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm text-slate-500">Aucune épreuve ajoutée</p>
                          <p className="text-xs text-slate-400 mt-1">Cliquez sur "Ajouter" pour définir des épreuves avec tarifs distincts</p>
                        </div>
                      )}

                      <div className="flex justify-between pt-2">
                        <Button variant="outline" onClick={() => setCreateStep(3)} className="gap-2" data-testid="step-prev-4">
                          <ArrowLeft className="w-4 h-4" /> Retour
                        </Button>
                        <Button
                          onClick={handleCreateEvent}
                          disabled={creating}
                          className="btn-primary gap-2"
                          data-testid="submit-event-btn-final"
                        >
                          {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Création...</> : <><Check className="w-4 h-4" /> Créer l'événement</>}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </DialogContent>
            </Dialog>

            {/* EDIT EVENT DIALOG */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-heading text-xl uppercase">Modifier l'événement</DialogTitle>
                  <DialogDescription className="sr-only">Formulaire de modification d'événement</DialogDescription>
                </DialogHeader>
                {editingEvent && (
                  <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>Titre *</Label>
                        <Input
                          value={editingEvent.title}
                          onChange={(e) => setEditingEvent(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Type de sport</Label>
                        <Select
                          value={editingEvent.sport_type}
                          onValueChange={(value) => setEditingEvent(prev => ({ ...prev, sport_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sportOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Date</Label>
                        <DateTimePicker
                          value={editingEvent.date ? new Date(editingEvent.date).toISOString().slice(0, 16) : ''}
                          onChange={(val) => setEditingEvent(prev => ({ ...prev, date: new Date(val).toISOString() }))}
                          placeholder="Modifier la date"
                          testId="edit-event-date-input"
                        />
                      </div>
                      <div>
                        <Label>Participants max</Label>
                        <Input
                          type="number"
                          value={editingEvent.max_participants}
                          onChange={(e) => setEditingEvent(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Lieu</Label>
                        <Input
                          value={editingEvent.location}
                          onChange={(e) => setEditingEvent(prev => ({ ...prev, location: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Prix de base (€)</Label>
                        <Input
                          type="number"
                          value={editingEvent.price}
                          onChange={(e) => setEditingEvent(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <Label>Dénivelé (m)</Label>
                        <Input
                          type="number"
                          value={editingEvent.elevation_gain || ''}
                          onChange={(e) => setEditingEvent(prev => ({ ...prev, elevation_gain: e.target.value ? parseInt(e.target.value) : null }))}
                        />
                      </div>
                      
                      {/* Image Upload for Edit */}
                      <div className="col-span-2">
                        <Label>Image</Label>
                        <div className="mt-2">
                          {(imagePreview || editingEvent.image_url) && (
                            <div className="relative mb-3 inline-block">
                              <img 
                                src={imagePreview || editingEvent.image_url} 
                                alt="Preview" 
                                className="h-32 w-auto object-cover rounded border"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setImagePreview(null);
                                  setEditingEvent(prev => ({ ...prev, image_url: '' }));
                                }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input
                              ref={editFileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              onChange={handleEditImageUpload}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => editFileInputRef.current?.click()}
                              disabled={uploadingImage}
                            >
                              {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                              Upload
                            </Button>
                            <Input
                              placeholder="URL de l'image"
                              value={editingEvent.image_url || ''}
                              onChange={(e) => {
                                setEditingEvent(prev => ({ ...prev, image_url: e.target.value }));
                                setImagePreview(null);
                              }}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <Label>Description</Label>
                        <Textarea
                          rows={3}
                          value={editingEvent.description}
                          onChange={(e) => setEditingEvent(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>

                      {/* Races / Distances with prices for Edit */}
                      <div className="col-span-2 border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-base font-bold">Épreuves / Distances avec tarifs</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addRace(true)}
                          >
                            <Plus className="w-4 h-4 mr-1" /> Ajouter
                          </Button>
                        </div>
                        
                        {editingEvent.races && editingEvent.races.length > 0 ? (
                          <div className="space-y-3">
                            {editingEvent.races.map((race, index) => (
                              <div key={index} className="flex gap-2 items-start p-3 bg-slate-50 rounded">
                                <div className="flex-1">
                                  <Input
                                    placeholder="Nom (ex: 10km)"
                                    value={race.name}
                                    onChange={(e) => updateRace(index, 'name', e.target.value, true)}
                                    className="mb-2"
                                  />
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <Label className="text-xs">Prix (€)</Label>
                                      <Input
                                        type="number"
                                        value={race.price}
                                        onChange={(e) => updateRace(index, 'price', parseFloat(e.target.value), true)}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Places</Label>
                                      <Input
                                        type="number"
                                        value={race.max_participants}
                                        onChange={(e) => updateRace(index, 'max_participants', parseInt(e.target.value), true)}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Km</Label>
                                      <Input
                                        type="number"
                                        value={race.distance_km || ''}
                                        onChange={(e) => updateRace(index, 'distance_km', e.target.value, true)}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeRace(index, true)}
                                  className="text-red-500"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded">
                            Aucune épreuve. Ajoutez des épreuves pour définir des tarifs différents par distance.
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={handleEditEvent}
                      disabled={editing}
                      className="w-full btn-primary"
                    >
                      {editing ? 'Mise à jour...' : 'Enregistrer les modifications'}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats - Clickable */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Calendar, label: 'Événements', value: events.length, action: 'events' },
            { icon: Users, label: 'Participants', value: totalParticipants, action: 'events' },
            { icon: Euro, label: 'Revenus', value: `${organizerRevenue.toFixed(0)}€`, action: 'export' },
            { icon: TrendingUp, label: 'Votre revenu', value: `${organizerRevenue.toFixed(0)}€`, action: 'export' }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              className="stats-card cursor-pointer hover:border-brand/50 hover:shadow-lg transition-all group relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
              onClick={() => {
                if (stat.action === 'events') {
                  document.getElementById('organizer-events-section')?.scrollIntoView({ behavior: 'smooth' });
                } else if (stat.action === 'export') {
                  document.getElementById('organizer-export-section')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              data-testid={`organizer-stat-card-${idx}`}
            >
              <stat.icon className="w-8 h-8 text-brand mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-2xl font-heading font-bold">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand absolute top-4 right-4 transition-colors" />
            </motion.div>
          ))}
        </div>

        {/* Navigation rapide */}
        <OrganizerNav onCreateEvent={() => setShowCreateDialog(true)} />

        {/* Export Section */}
        <div className="bg-white border border-slate-200 p-4 mb-6" id="organizer-export-section" data-testid="organizer-export">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-heading uppercase text-slate-500 mb-1">Événement</label>
              <Select defaultValue="all" onValueChange={(v) => document.getElementById('org-event-filter').value = v}>
                <SelectTrigger className="w-52" data-testid="org-event-filter">
                  <SelectValue placeholder="Tous mes événements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous mes événements</SelectItem>
                  {events.map(evt => (
                    <SelectItem key={evt.event_id} value={evt.event_id}>{evt.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" id="org-event-filter" defaultValue="all" />
            </div>
            <div>
              <label className="block text-xs font-heading uppercase text-slate-500 mb-1">Du</label>
              <Input type="date" id="org-start-date" className="w-40" data-testid="org-export-start" />
            </div>
            <div>
              <label className="block text-xs font-heading uppercase text-slate-500 mb-1">Au</label>
              <Input type="date" id="org-end-date" className="w-40" data-testid="org-export-end" />
            </div>
            <Button
              variant="outline"
              className="gap-2"
              data-testid="org-export-csv-btn"
              onClick={async () => {
                try {
                  const start = document.getElementById('org-start-date').value;
                  const end = document.getElementById('org-end-date').value;
                  const evtId = document.getElementById('org-event-filter').value;
                  const params = new URLSearchParams({ format: 'csv' });
                  if (start) params.append('start_date', start);
                  if (end) params.append('end_date', end);
                  if (evtId && evtId !== 'all') params.append('event_id', evtId);
                  const res = await api.get(`/organizer/payments/export?${params}`, { responseType: 'blob' });
                  const blob = new Blob([res.data], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url;
                  a.download = `releve_${new Date().toISOString().slice(0,10)}.csv`;
                  document.body.appendChild(a); a.click(); a.remove();
                  toast.success('CSV téléchargé');
                } catch { toast.error('Aucun paiement à exporter'); }
              }}
            >
              <Download className="w-4 h-4" /> CSV
            </Button>
            <Button
              className="gap-2 bg-brand hover:bg-brand/90 text-white"
              data-testid="org-export-pdf-btn"
              onClick={async () => {
                try {
                  const start = document.getElementById('org-start-date').value;
                  const end = document.getElementById('org-end-date').value;
                  const evtId = document.getElementById('org-event-filter').value;
                  const params = new URLSearchParams({ format: 'pdf' });
                  if (start) params.append('start_date', start);
                  if (end) params.append('end_date', end);
                  if (evtId && evtId !== 'all') params.append('event_id', evtId);
                  const res = await api.get(`/organizer/payments/export?${params}`, { responseType: 'blob' });
                  const blob = new Blob([res.data], { type: 'application/pdf' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url;
                  a.download = `releve_${new Date().toISOString().slice(0,10)}.pdf`;
                  document.body.appendChild(a); a.click(); a.remove();
                  toast.success('PDF téléchargé');
                } catch { toast.error('Aucun paiement à exporter'); }
              }}
            >
              <FileText className="w-4 h-4" /> PDF
            </Button>
          </div>
        </div>

        {/* Events Grid */}
        <section>
          <div className="flex items-end justify-between mb-8" id="organizer-events-section">
            <div>
              <span className="text-brand font-heading font-bold uppercase tracking-widest text-sm">
                Gestion
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight uppercase mt-1">
                Mes événements
              </h2>
            </div>
            <span className="text-sm text-slate-500 font-heading uppercase tracking-wider">
              {events.length} événement{events.length > 1 ? 's' : ''}
            </span>
          </div>
          
          {events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event, idx) => {
                const fillRate = event.max_participants > 0
                  ? Math.round((event.current_participants / event.max_participants) * 100)
                  : 0;
                const fillColor = fillRate >= 90 ? 'bg-red-500' : fillRate >= 60 ? 'bg-amber-500' : 'bg-emerald-500';
                const eventDate = new Date(event.date);

                return (
                  <motion.div
                    key={event.event_id}
                    className="group relative bg-white border border-slate-200 overflow-hidden hover:border-brand transition-colors duration-300"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: idx * 0.08 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    data-testid={`organizer-event-card-${event.event_id}`}
                  >
                    {/* Image */}
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={event.image_url || 'https://images.unsplash.com/photo-1766970096430-204f27f6e247?w=800'}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Status badge */}
                      <div className="absolute top-3 left-3">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-heading font-bold uppercase tracking-wider ${event.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                          {event.status === 'active' ? 'Actif' : 'Annulé'}
                        </span>
                      </div>

                      {/* Date overlay */}
                      <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <div className="bg-white text-asphalt px-2.5 py-1 text-center">
                          <div className="font-heading font-bold text-lg leading-none">{format(eventDate, 'd')}</div>
                          <div className="font-heading text-[10px] uppercase tracking-wider">{format(eventDate, 'MMM', { locale: fr })}</div>
                        </div>
                        <span className="text-white text-sm font-medium">{format(eventDate, 'yyyy')}</span>
                      </div>

                      {/* Revenue overlay */}
                      <div className="absolute bottom-3 right-3">
                        <span className="bg-brand text-white font-heading font-bold text-sm px-2.5 py-1">
                          {(event.current_participants * event.price).toFixed(0)}€
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <Link to={`/organizer/event/${event.event_id}`} className="block mb-3 group/link">
                        <h3 className="font-heading font-bold text-lg text-asphalt group-hover/link:text-brand transition-colors line-clamp-1" data-testid={`event-title-${event.event_id}`}>
                          {event.title}
                        </h3>
                        <p className="text-sm text-slate-500 flex items-center mt-1">
                          <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </p>
                      </Link>

                      {/* Fill gauge */}
                      <div className="mb-4 bg-asphalt p-3 -mx-5 px-5">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-300 font-medium flex items-center">
                            <Users className="w-3.5 h-3.5 mr-1" />
                            {event.current_participants}/{event.max_participants}
                          </span>
                          <span className="font-heading font-bold text-white">{fillRate}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-white/10 overflow-hidden rounded-sm">
                          <motion.div
                            className={`h-full ${fillColor}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${fillRate}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.08 + 0.3 }}
                          />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100">
                        <Link to={`/organizer/event/${event.event_id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs font-heading uppercase tracking-wider gap-1.5 h-8" data-testid={`manage-event-${event.event_id}`}>
                            <Settings className="w-3.5 h-3.5" />
                            Gérer
                          </Button>
                        </Link>
                        <Link to={`/organizer/checkin/${event.event_id}`}>
                          <Button variant="outline" size="sm" className="text-xs h-8 px-2.5" title="Check-in" data-testid={`checkin-event-${event.event_id}`}>
                            <Scan className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link to={`/results/${event.event_id}`}>
                          <Button variant="outline" size="sm" className="text-xs h-8 px-2.5" title="Résultats" data-testid={`results-event-${event.event_id}`}>
                            <BarChart3 className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 px-2.5"
                          title="Modifier"
                          onClick={() => openEditDialog(event)}
                          data-testid={`edit-event-${event.event_id}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 px-2.5 text-red-500 hover:text-red-700 hover:border-red-300"
                          title="Supprimer"
                          onClick={() => handleDeleteEvent(event.event_id)}
                          data-testid={`delete-event-${event.event_id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div
              className="bg-white border border-slate-200 p-12 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="font-heading text-xl font-bold mb-2">Aucun événement</h3>
              <p className="text-slate-500 mb-6">Créez votre premier événement pour commencer.</p>
              <Button onClick={() => setShowCreateDialog(true)} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Créer un événement
              </Button>
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
};

export default OrganizerDashboard;
