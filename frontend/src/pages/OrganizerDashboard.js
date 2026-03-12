import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Plus, Calendar, Users, Euro, TrendingUp, Settings,
  Eye, Edit, Trash2, BarChart3, ChevronRight, Building2, QrCode, Scan,
  Upload, Image, X, Loader2, Download, FileText, MapPin
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

const sportOptions = [
  { value: 'cycling', label: 'Cyclisme' },
  { value: 'running', label: 'Course à pied' },
  { value: 'triathlon', label: 'Triathlon' },
  { value: 'walking', label: 'Marche' },
  { value: 'motorsport', label: 'Sports Mécaniques' }
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
    races: []
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
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="btn-primary" data-testid="create-event-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvel événement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-heading text-xl uppercase">Créer un événement</DialogTitle>
                  <DialogDescription className="sr-only">Formulaire de création d'événement</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Titre *</Label>
                      <Input
                        placeholder="Marathon de Paris 2026"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                        data-testid="event-title-input"
                      />
                    </div>
                    <div>
                      <Label>Type de sport *</Label>
                      <Select
                        value={newEvent.sport_type}
                        onValueChange={(value) => setNewEvent(prev => ({ ...prev, sport_type: value }))}
                      >
                        <SelectTrigger data-testid="event-sport-select">
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
                      <Label>Date *</Label>
                      <DateTimePicker
                        value={newEvent.date}
                        onChange={(val) => setNewEvent(prev => ({ ...prev, date: val }))}
                        placeholder="Choisir la date de l'événement"
                        testId="event-date-input"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Lieu *</Label>
                      <Input
                        placeholder="Paris, France"
                        value={newEvent.location}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                        data-testid="event-location-input"
                      />
                    </div>
                    <div>
                      <Label>Participants max</Label>
                      <Input
                        type="number"
                        value={newEvent.max_participants}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label>Prix (€)</Label>
                      <Input
                        type="number"
                        value={newEvent.price}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                        data-testid="event-price-input"
                      />
                    </div>
                    <div>
                      <Label>Distances (séparées par virgule)</Label>
                      <Input
                        placeholder="10km, 21km, 42km"
                        value={newEvent.distances}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, distances: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Dénivelé (m)</Label>
                      <Input
                        type="number"
                        placeholder="500"
                        value={newEvent.elevation_gain}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, elevation_gain: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Image de l'événement</Label>
                      <div className="mt-2">
                        {/* Image Preview */}
                        {(imagePreview || newEvent.image_url) && (
                          <div className="relative mb-3 inline-block">
                            <img 
                              src={imagePreview || newEvent.image_url} 
                              alt="Preview" 
                              className="h-32 w-auto object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={removeImage}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        
                        {/* Upload Button */}
                        <div className="flex gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="event-image-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                            className="flex items-center gap-2"
                          >
                            {uploadingImage ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Upload...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                Uploader une image
                              </>
                            )}
                          </Button>
                          <span className="text-xs text-slate-500 self-center">
                            ou
                          </span>
                          <Input
                            placeholder="URL de l'image (https://...)"
                            value={newEvent.image_url}
                            onChange={(e) => {
                              setNewEvent(prev => ({ ...prev, image_url: e.target.value }));
                              setImagePreview(null);
                            }}
                            className="flex-1"
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          JPG, PNG, GIF ou WebP. Max 10MB.
                        </p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Décrivez votre événement..."
                        rows={4}
                        value={newEvent.description}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                        data-testid="event-description-input"
                      />
                    </div>

                    {/* Races / Distances with prices */}
                    <div className="col-span-2 border-t pt-4 mt-2">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-base font-bold">Épreuves / Distances avec tarifs</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addRace(false)}
                        >
                          <Plus className="w-4 h-4 mr-1" /> Ajouter épreuve
                        </Button>
                      </div>
                      
                      {newEvent.races && newEvent.races.length > 0 ? (
                        <div className="space-y-3">
                          {newEvent.races.map((race, index) => (
                            <div key={index} className="flex gap-2 items-start p-3 bg-slate-50 rounded">
                              <div className="flex-1">
                                <Input
                                  placeholder="Nom (ex: 10km, Marathon)"
                                  value={race.name}
                                  onChange={(e) => updateRace(index, 'name', e.target.value, false)}
                                  className="mb-2"
                                />
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <Label className="text-xs">Prix (€)</Label>
                                    <Input
                                      type="number"
                                      value={race.price}
                                      onChange={(e) => updateRace(index, 'price', parseFloat(e.target.value), false)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Places max</Label>
                                    <Input
                                      type="number"
                                      value={race.max_participants}
                                      onChange={(e) => updateRace(index, 'max_participants', parseInt(e.target.value), false)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Distance (km)</Label>
                                    <Input
                                      type="number"
                                      value={race.distance_km}
                                      onChange={(e) => updateRace(index, 'distance_km', e.target.value, false)}
                                    />
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRace(index, false)}
                                className="text-red-500"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded">
                          Aucune épreuve ajoutée. Cliquez sur "Ajouter épreuve" pour définir des tarifs par distance.
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleCreateEvent}
                    disabled={creating}
                    className="w-full btn-primary"
                    data-testid="submit-event-btn"
                  >
                    {creating ? 'Création...' : 'Créer l\'événement'}
                  </Button>
                </div>
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
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Calendar, label: 'Événements', value: events.length },
            { icon: Users, label: 'Participants', value: totalParticipants },
            { icon: Euro, label: 'Revenus', value: `${organizerRevenue.toFixed(0)}€` },
            { icon: TrendingUp, label: 'Votre revenu', value: `${organizerRevenue.toFixed(0)}€` }
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

        {/* Export Section */}
        <div className="bg-white border border-slate-200 p-4 mb-6" data-testid="organizer-export">
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
          <div className="flex items-end justify-between mb-8">
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
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-500 font-medium flex items-center">
                            <Users className="w-3.5 h-3.5 mr-1" />
                            {event.current_participants}/{event.max_participants}
                          </span>
                          <span className="font-heading font-bold text-asphalt">{fillRate}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 overflow-hidden">
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
