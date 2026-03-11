import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Plus, Calendar, Users, Euro, TrendingUp, Settings,
  Eye, Edit, Trash2, BarChart3, ChevronRight, Building2, QrCode, Scan,
  Upload, Image, X, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import { eventsApi, authApi } from '../services/api';
import api from '../services/api';
import { toast } from 'sonner';

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
      const eventData = {
        ...newEvent,
        date: new Date(newEvent.date).toISOString(),
        distances: newEvent.distances.split(',').map(d => d.trim()).filter(Boolean),
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
  const platformFees = totalRevenue * 0.05;
  const organizerRevenue = totalRevenue - platformFees;

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
            <li className="flex items-center"><span className="text-brand mr-2">✓</span> Commission de seulement 5%</li>
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
                      <Input
                        type="datetime-local"
                        value={newEvent.date}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                        data-testid="event-date-input"
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
            { icon: TrendingUp, label: 'Commission', value: `${platformFees.toFixed(0)}€` }
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

        {/* Events List */}
        <section>
          <h2 className="font-heading text-2xl font-bold uppercase mb-6">Mes événements</h2>
          
          {events.length > 0 ? (
            <div className="bg-white border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-heading font-bold uppercase text-sm">Événement</th>
                      <th className="text-left p-4 font-heading font-bold uppercase text-sm">Date</th>
                      <th className="text-left p-4 font-heading font-bold uppercase text-sm">Participants</th>
                      <th className="text-left p-4 font-heading font-bold uppercase text-sm">Revenus</th>
                      <th className="text-left p-4 font-heading font-bold uppercase text-sm">Statut</th>
                      <th className="text-right p-4 font-heading font-bold uppercase text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.event_id} className="border-b last:border-b-0 hover:bg-slate-50">
                        <td className="p-4">
                          <div className="font-medium">{event.title}</div>
                          <div className="text-sm text-slate-500">{event.location}</div>
                        </td>
                        <td className="p-4">
                          {format(new Date(event.date), 'd MMM yyyy', { locale: fr })}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2 text-slate-400" />
                            {event.current_participants}/{event.max_participants}
                          </div>
                        </td>
                        <td className="p-4 font-heading font-bold">
                          {(event.current_participants * event.price * 0.95).toFixed(0)}€
                        </td>
                        <td className="p-4">
                          <span className={`badge ${event.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                            {event.status === 'active' ? 'Actif' : 'Annulé'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link to={`/events/${event.event_id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openEditDialog(event)}
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Link to={`/organizer/events/${event.event_id}/registrations`}>
                              <Button variant="ghost" size="sm">
                                <BarChart3 className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteEvent(event.event_id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-heading text-xl font-bold mb-2">Aucun événement</h3>
              <p className="text-slate-500 mb-6">Créez votre premier événement pour commencer.</p>
              <Button onClick={() => setShowCreateDialog(true)} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Créer un événement
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default OrganizerDashboard;
