import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar, Users, Euro, TrendingUp, Settings, Plus,
  Eye, Edit, Trash2, ChevronRight, Building2, QrCode, Scan,
  Upload, Image, X, Loader2, Download, FileText, MapPin,
  Bike, Footprints, Medal, Car, ArrowRight, ArrowLeft, Mountain, Clock, Check,
  Route, Navigation, Globe, Facebook, Instagram, Youtube, Twitter, Tag, Timer,
  Target, Wind, Flag, CircleDot, Dumbbell, Swords, BarChart3,
  Search, Share2, MessageSquare, Mail, Shield, Send, Filter,
  CheckCircle, Package, Shirt, ArrowUp, Home, Trophy, Copy, ExternalLink,
  Handshake, Phone, MapPinned, Heart, Star, Award, Globe2,
  ShoppingBag, Palette, Tag as TagIcon
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
import MessagingPage from './MessagingPage';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

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

const CHART_COLORS = ['#ff4500', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const SectionHeader = ({ title, onBack }) => (
  <div className="flex items-center gap-3 mb-6">
    <button
      onClick={onBack}
      className="flex items-center gap-2 px-4 py-2 bg-asphalt text-white font-heading text-xs uppercase tracking-wider hover:bg-asphalt/80 transition-colors"
      data-testid="back-to-hub-btn"
    >
      <ArrowLeft className="w-4 h-4" />
      Retour au tableau de bord
    </button>
    <h2 className="font-heading text-2xl font-bold uppercase">{title}</h2>
  </div>
);

const OrganizerDashboard = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('hub');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [createStep, setCreateStep] = useState(1);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantFilter, setParticipantFilter] = useState('all');
  const [participantSearch, setParticipantSearch] = useState('');
  const [checkinSearch, setCheckinSearch] = useState('');
  const [checkinFilter, setCheckinFilter] = useState('all');
  const [checkinParticipants, setCheckinParticipants] = useState([]);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [correspondances, setCorrespondances] = useState([]);
  const [corrLoading, setCorrLoading] = useState(false);
  const [showNewCorr, setShowNewCorr] = useState(false);
  const [corrForm, setCorrForm] = useState({ subject: '', message: '', event_id: 'all', send_email: false, recipient_ids: 'all' });
  const [corrSending, setCorrSending] = useState(false);
  const [chronoEventId, setChronoEventId] = useState('');
  const [partners, setPartners] = useState([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnerCategories, setPartnerCategories] = useState([]);
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [showPartnerDialog, setShowPartnerDialog] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [partnerForm, setPartnerForm] = useState({
    company_name: '', contact_name: '', phone: '', email: '', address: '', category: '', notes: ''
  });
  const [partnerSaving, setPartnerSaving] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [sponsors, setSponsors] = useState([]);
  const [sponsorsLoading, setSponsorsLoading] = useState(false);
  const [sponsorFilter, setSponsorFilter] = useState('all');
  const [sponsorSearch, setSponsorSearch] = useState('');
  const [showSponsorDialog, setShowSponsorDialog] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [sponsorForm, setSponsorForm] = useState({
    name: '', sponsor_type: 'Sponsor', tier: 'Bronze', contact_name: '', phone: '', email: '',
    address: '', website: '', logo_url: '', amount: '', currency: 'EUR', contribution_type: 'Financier',
    contribution_details: '', counterparts: '', contract_start: '', contract_end: '', event_id: '', notes: '', status: 'Actif'
  });
  const [sponsorSaving, setSponsorSaving] = useState(false);
  const [shopProducts, setShopProducts] = useState([]);
  const [shopOrders, setShopOrders] = useState([]);
  const [shopStats, setShopStats] = useState({});
  const [shopLoading, setShopLoading] = useState(false);
  const [shopTab, setShopTab] = useState('catalogue');
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '', description: '', category: 'Textile', price: '', organizer_commission: 5,
    image_url: '', sizes: [], colors: [], stock: 100, event_id: '', active: true
  });
  const [productSaving, setProductSaving] = useState(false);
  const [shopEventFilter, setShopEventFilter] = useState('all');

  const [newEvent, setNewEvent] = useState({
    title: '', description: '', sport_type: 'running', location: '',
    date: '', max_participants: 100, price: 25, distances: '',
    elevation_gain: '', image_url: '', requires_pps: false,
    requires_medical_cert: false, allows_teams: false, min_age: '', max_age: '',
    races: [], route_url: '', exact_address: '', regulations: '',
    themes: [], circuit_type: '', has_timer: null,
    website_url: '', facebook_url: '', instagram_url: '', twitter_url: '', youtube_url: ''
  });

  const [upgradeData, setUpgradeData] = useState({ company_name: '', description: '', iban: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';

  useEffect(() => {
    if (isOrganizer) fetchEvents();
    else setLoading(false);
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

  const fetchParticipants = async (eventId) => {
    setParticipantsLoading(true);
    try {
      const url = eventId && eventId !== 'all' ? `/organizer/all-participants?event_id=${eventId}` : '/organizer/all-participants';
      const res = await api.get(url);
      setParticipants(res.data.participants);
    } catch { toast.error('Erreur chargement participants'); }
    finally { setParticipantsLoading(false); }
  };

  const fetchCheckinParticipants = async (eventId) => {
    setCheckinLoading(true);
    try {
      const url = eventId && eventId !== 'all' ? `/organizer/all-participants?event_id=${eventId}` : '/organizer/all-participants';
      const res = await api.get(url);
      setCheckinParticipants(res.data.participants);
    } catch { toast.error('Erreur chargement'); }
    finally { setCheckinLoading(false); }
  };

  const fetchCorrespondances = async () => {
    setCorrLoading(true);
    try {
      const res = await api.get('/organizer/correspondances');
      setCorrespondances(res.data.correspondances);
    } catch { toast.error('Erreur chargement correspondances'); }
    finally { setCorrLoading(false); }
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    if (section === 'participants') fetchParticipants(participantFilter);
    if (section === 'checkin') fetchCheckinParticipants(checkinFilter);
    if (section === 'correspondances') fetchCorrespondances();
    if (section === 'partners') fetchPartners();
    if (section === 'sponsors') fetchSponsors();
    if (section === 'boutique') fetchShopData();
  };

  const fetchPartners = async (cat) => {
    setPartnersLoading(true);
    try {
      const url = cat && cat !== 'all' ? `/organizer/partners?category=${encodeURIComponent(cat)}` : '/organizer/partners';
      const res = await api.get(url);
      setPartners(res.data.partners);
      const catRes = await api.get('/organizer/partners/categories');
      setPartnerCategories(catRes.data.categories);
    } catch { toast.error('Erreur chargement partenaires'); }
    finally { setPartnersLoading(false); }
  };

  const handleSavePartner = async () => {
    if (!partnerForm.company_name) { toast.error('Nom de l\'entreprise requis'); return; }
    setPartnerSaving(true);
    const finalCategory = partnerForm.category === '__custom__' ? customCategory : partnerForm.category;
    const payload = { ...partnerForm, category: finalCategory || 'Autre' };
    try {
      if (editingPartner) {
        await api.put(`/organizer/partners/${editingPartner.partner_id}`, payload);
        toast.success('Partenaire mis à jour');
      } else {
        await api.post('/organizer/partners', payload);
        toast.success('Partenaire ajouté');
      }
      setShowPartnerDialog(false);
      setEditingPartner(null);
      setPartnerForm({ company_name: '', contact_name: '', phone: '', email: '', address: '', category: '', notes: '' });
      setCustomCategory('');
      fetchPartners(partnerFilter !== 'all' ? partnerFilter : undefined);
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setPartnerSaving(false); }
  };

  const handleDeletePartner = async (partnerId) => {
    if (!confirm('Supprimer ce partenaire ?')) return;
    try {
      await api.delete(`/organizer/partners/${partnerId}`);
      toast.success('Partenaire supprimé');
      fetchPartners(partnerFilter !== 'all' ? partnerFilter : undefined);
    } catch { toast.error('Erreur suppression'); }
  };

  const openEditPartner = (partner) => {
    setEditingPartner(partner);
    setPartnerForm({
      company_name: partner.company_name, contact_name: partner.contact_name,
      phone: partner.phone, email: partner.email, address: partner.address,
      category: partner.category, notes: partner.notes || ''
    });
    setShowPartnerDialog(true);
  };

  const openNewPartner = () => {
    setEditingPartner(null);
    setPartnerForm({ company_name: '', contact_name: '', phone: '', email: '', address: '', category: '', notes: '' });
    setCustomCategory('');
    setShowPartnerDialog(true);
  };

  const fetchSponsors = async (typeFilter) => {
    setSponsorsLoading(true);
    try {
      const url = typeFilter && typeFilter !== 'all' ? `/organizer/sponsors?sponsor_type=${encodeURIComponent(typeFilter)}` : '/organizer/sponsors';
      const res = await api.get(url);
      setSponsors(res.data.sponsors);
    } catch { toast.error('Erreur chargement sponsors'); }
    finally { setSponsorsLoading(false); }
  };

  const handleSaveSponsor = async () => {
    if (!sponsorForm.name) { toast.error('Nom requis'); return; }
    setSponsorSaving(true);
    const payload = { ...sponsorForm, amount: parseFloat(sponsorForm.amount) || 0 };
    try {
      if (editingSponsor) {
        await api.put(`/organizer/sponsors/${editingSponsor.sponsor_id}`, payload);
        toast.success('Sponsor mis à jour');
      } else {
        await api.post('/organizer/sponsors', payload);
        toast.success('Sponsor ajouté');
      }
      setShowSponsorDialog(false);
      setEditingSponsor(null);
      setSponsorForm({ name: '', sponsor_type: 'Sponsor', tier: 'Bronze', contact_name: '', phone: '', email: '', address: '', website: '', logo_url: '', amount: '', currency: 'EUR', contribution_type: 'Financier', contribution_details: '', counterparts: '', contract_start: '', contract_end: '', event_id: '', notes: '', status: 'Actif' });
      fetchSponsors(sponsorFilter !== 'all' ? sponsorFilter : undefined);
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setSponsorSaving(false); }
  };

  const handleDeleteSponsor = async (id) => {
    if (!confirm('Supprimer ce sponsor ?')) return;
    try {
      await api.delete(`/organizer/sponsors/${id}`);
      toast.success('Sponsor supprimé');
      fetchSponsors(sponsorFilter !== 'all' ? sponsorFilter : undefined);
    } catch { toast.error('Erreur suppression'); }
  };

  const openEditSponsor = (s) => {
    setEditingSponsor(s);
    setSponsorForm({
      name: s.name, sponsor_type: s.sponsor_type, tier: s.tier, contact_name: s.contact_name,
      phone: s.phone, email: s.email, address: s.address, website: s.website, logo_url: s.logo_url,
      amount: s.amount || '', currency: s.currency || 'EUR', contribution_type: s.contribution_type,
      contribution_details: s.contribution_details, counterparts: s.counterparts,
      contract_start: s.contract_start, contract_end: s.contract_end, event_id: s.event_id,
      notes: s.notes || '', status: s.status || 'Actif'
    });
    setShowSponsorDialog(true);
  };

  const tierColors = { Platine: 'bg-slate-800 text-white', Or: 'bg-yellow-500 text-white', Argent: 'bg-slate-400 text-white', Bronze: 'bg-amber-700 text-white' };

  const fetchShopData = async (evtFilter) => {
    setShopLoading(true);
    try {
      const pUrl = evtFilter && evtFilter !== 'all' ? `/organizer/products?event_id=${evtFilter}` : '/organizer/products';
      const [pRes, oRes, sRes] = await Promise.all([
        api.get(pUrl), api.get('/organizer/orders'), api.get('/organizer/shop-stats')
      ]);
      setShopProducts(pRes.data.products);
      setShopOrders(oRes.data.orders);
      setShopStats(sRes.data);
    } catch { toast.error('Erreur chargement boutique'); }
    finally { setShopLoading(false); }
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price) { toast.error('Nom et prix requis'); return; }
    setProductSaving(true);
    const payload = {
      ...productForm,
      price: parseFloat(productForm.price),
      organizer_commission: parseFloat(productForm.organizer_commission),
      stock: parseInt(productForm.stock),
      event_id: productForm.event_id === 'none' ? '' : productForm.event_id
    };
    try {
      if (editingProduct) {
        await api.put(`/organizer/products/${editingProduct.product_id}`, payload);
        toast.success('Produit mis à jour');
      } else {
        await api.post('/organizer/products', payload);
        toast.success('Produit ajouté');
      }
      setShowProductDialog(false);
      setEditingProduct(null);
      setProductForm({ name: '', description: '', category: 'Textile', price: '', organizer_commission: 5, image_url: '', sizes: [], colors: [], stock: 100, event_id: '', active: true });
      fetchShopData(shopEventFilter !== 'all' ? shopEventFilter : undefined);
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setProductSaving(false); }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try { await api.delete(`/organizer/products/${id}`); toast.success('Produit supprimé'); fetchShopData(); }
    catch { toast.error('Erreur'); }
  };

  const productCategories = ['Textile', 'Accessoire', 'Gourde', 'Sac', 'Médaille', 'Nutrition', 'Équipement'];
  const sizeOptions = ['XXS','XS','S','M','L','XL','XXL','3XL','Unique'];
  const toggleSize = (size) => {
    setProductForm(p => ({ ...p, sizes: p.sizes.includes(size) ? p.sizes.filter(s => s !== size) : [...p.sizes, size] }));
  };

  const filteredSponsors = sponsors.filter(s => {
    if (sponsorSearch) {
      const q = sponsorSearch.toLowerCase();
      return s.name?.toLowerCase().includes(q) || s.contact_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.contribution_type?.toLowerCase().includes(q);
    }
    return true;
  });

  const handleMarkCollected = async (registrationId) => {
    try {
      await api.post('/organizer/checkin/mark-collected', { registration_id: registrationId });
      toast.success('Kit récupéré !');
      fetchCheckinParticipants(checkinFilter);
    } catch { toast.error('Erreur'); }
  };

  const handleSendCorrespondance = async () => {
    if (!corrForm.message) { toast.error('Message requis'); return; }
    setCorrSending(true);
    try {
      const payload = {
        subject: corrForm.subject,
        message: corrForm.message,
        event_id: corrForm.event_id !== 'all' ? corrForm.event_id : events[0]?.event_id,
        recipient_ids: corrForm.recipient_ids,
        send_email: corrForm.send_email
      };
      const res = await api.post('/organizer/correspondances/send', payload);
      toast.success(res.data.message);
      setShowNewCorr(false);
      setCorrForm({ subject: '', message: '', event_id: 'all', send_email: false, recipient_ids: 'all' });
      fetchCorrespondances();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur envoi'); }
    finally { setCorrSending(false); }
  };

  // Event CRUD handlers (kept from original)
  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.location) {
      toast.error('Veuillez remplir tous les champs obligatoires'); return;
    }
    setCreating(true);
    try {
      let eventDate;
      try { eventDate = new Date(newEvent.date).toISOString(); }
      catch { toast.error('Date invalide'); setCreating(false); return; }
      const eventData = {
        ...newEvent, date: eventDate,
        distances: (newEvent.distances || '').split(',').map(d => d.trim()).filter(Boolean),
        elevation_gain: newEvent.elevation_gain ? parseInt(newEvent.elevation_gain) : null,
        min_age: newEvent.min_age ? parseInt(newEvent.min_age) : null,
        max_age: newEvent.max_age ? parseInt(newEvent.max_age) : null
      };
      await eventsApi.create(eventData);
      toast.success('Événement créé !');
      setShowCreateDialog(false); setCreateStep(1);
      setNewEvent({ title: '', description: '', sport_type: 'running', location: '', date: '', max_participants: 100, price: 25, distances: '', elevation_gain: '', image_url: '', requires_pps: false, requires_medical_cert: false, allows_teams: false, min_age: '', max_age: '', races: [], route_url: '', exact_address: '', regulations: '', themes: [], circuit_type: '', has_timer: null, website_url: '', facebook_url: '', instagram_url: '', twitter_url: '', youtube_url: '' });
      setImagePreview(null); fetchEvents();
    } catch (error) { toast.error(error.response?.data?.detail || 'Erreur création'); }
    finally { setCreating(false); }
  };

  const openEditDialog = (event) => { setEditingEvent(event); setImagePreview(event.image_url || null); setShowEditDialog(true); };

  const handleEditEvent = async () => {
    if (!editingEvent.title || !editingEvent.location) { toast.error('Champs obligatoires'); return; }
    setEditing(true);
    try {
      const updateData = { title: editingEvent.title, description: editingEvent.description, sport_type: editingEvent.sport_type, date: editingEvent.date, location: editingEvent.location, max_participants: editingEvent.max_participants, price: editingEvent.price, distances: editingEvent.distances, elevation_gain: editingEvent.elevation_gain, image_url: editingEvent.image_url, requires_pps: editingEvent.requires_pps, races: editingEvent.races || [] };
      await eventsApi.update(editingEvent.event_id, updateData);
      toast.success('Événement mis à jour !');
      setShowEditDialog(false); setEditingEvent(null); setImagePreview(null); fetchEvents();
    } catch (error) { toast.error(error.response?.data?.detail || 'Erreur mise à jour'); }
    finally { setEditing(false); }
  };

  const addRace = (isEdit = false) => {
    const nr = { name: '', price: 25, max_participants: 100, distance_km: '', elevation_gain: '' };
    if (isEdit && editingEvent) setEditingEvent(p => ({ ...p, races: [...(p.races || []), nr] }));
    else setNewEvent(p => ({ ...p, races: [...(p.races || []), nr] }));
  };
  const updateRace = (i, f, v, isEdit = false) => {
    if (isEdit && editingEvent) setEditingEvent(p => ({ ...p, races: p.races.map((r, idx) => idx === i ? { ...r, [f]: v } : r) }));
    else setNewEvent(p => ({ ...p, races: p.races.map((r, idx) => idx === i ? { ...r, [f]: v } : r) }));
  };
  const removeRace = (i, isEdit = false) => {
    if (isEdit && editingEvent) setEditingEvent(p => ({ ...p, races: p.races.filter((_, idx) => idx !== i) }));
    else setNewEvent(p => ({ ...p, races: p.races.filter((_, idx) => idx !== i) }));
  };

  const handleImageUpload = async (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) { toast.error('Format non supporté'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return; }
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    setUploadingImage(true);
    try {
      const formData = new FormData(); formData.append('file', file);
      const response = await api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const imageUrl = `${process.env.REACT_APP_BACKEND_URL}${response.data.url}`;
      if (isEdit) setEditingEvent(p => ({ ...p, image_url: imageUrl }));
      else setNewEvent(p => ({ ...p, image_url: imageUrl }));
      toast.success('Image uploadée !');
    } catch { toast.error('Erreur upload'); setImagePreview(isEdit ? editingEvent?.image_url : null); }
    finally { setUploadingImage(false); }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Annuler cet événement ?')) return;
    try { await eventsApi.delete(eventId); toast.success('Événement annulé'); fetchEvents(); }
    catch { toast.error('Erreur annulation'); }
  };

  const handleUpgradeToOrganizer = async () => {
    try {
      await authApi.upgradeRole({ role: 'organizer', ...upgradeData });
      updateUser({ role: 'organizer' });
      toast.success('Vous êtes maintenant organisateur !');
      setShowUpgradeDialog(false);
    } catch { toast.error('Erreur mise à niveau'); }
  };

  const handleExportCSV = async (eventId) => {
    try {
      const params = new URLSearchParams({ format: 'csv' });
      if (eventId && eventId !== 'all') params.append('event_id', eventId);
      const res = await api.get(`/organizer/payments/export?${params}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `finances_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      toast.success('CSV téléchargé');
    } catch { toast.error('Erreur export'); }
  };

  const handleExportPDF = async (eventId) => {
    try {
      const params = new URLSearchParams({ format: 'pdf' });
      if (eventId && eventId !== 'all') params.append('event_id', eventId);
      const res = await api.get(`/organizer/payments/export?${params}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `finances_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      toast.success('PDF téléchargé');
    } catch { toast.error('Erreur export'); }
  };

  // Stats
  const totalParticipants = events.reduce((s, e) => s + e.current_participants, 0);
  const totalRevenue = events.reduce((s, e) => s + (e.current_participants * e.price), 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="loader" /></div>;

  // Show upgrade prompt if not organizer
  if (!isOrganizer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" data-testid="organizer-upgrade">
        <motion.div className="max-w-md w-full bg-white border border-slate-200 p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Building2 className="w-16 h-16 text-brand mx-auto mb-6" />
          <h1 className="font-heading text-2xl font-bold uppercase mb-4">Devenir Organisateur</h1>
          <p className="text-slate-500 mb-6">Créez vos propres événements sportifs et gérez les inscriptions.</p>
          <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
            <DialogTrigger asChild><Button className="w-full btn-primary" data-testid="upgrade-btn">Devenir Organisateur</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading text-xl uppercase">Informations organisateur</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div><Label>Nom de l'organisation *</Label><Input placeholder="Mon Club Sportif" value={upgradeData.company_name} onChange={(e) => setUpgradeData(p => ({ ...p, company_name: e.target.value }))} /></div>
                <div><Label>Description</Label><Textarea placeholder="Décrivez votre organisation..." value={upgradeData.description} onChange={(e) => setUpgradeData(p => ({ ...p, description: e.target.value }))} /></div>
                <div><Label>IBAN</Label><Input placeholder="FR76 XXXX..." value={upgradeData.iban} onChange={(e) => setUpgradeData(p => ({ ...p, iban: e.target.value }))} /></div>
                <Button onClick={handleUpgradeToOrganizer} className="w-full btn-primary">Confirmer</Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>
    );
  }

  // ================ HUB NAV ITEMS ================
  const hubItems = [
    { id: 'events', label: 'Événements', icon: Calendar, desc: `${events.length} événement(s)`, color: 'bg-blue-500' },
    { id: 'participants', label: 'Participants', icon: Users, desc: `${totalParticipants} inscrit(s)`, color: 'bg-emerald-500' },
    { id: 'gauges', label: 'Jauges', icon: BarChart3, desc: 'Remplissage temps réel', color: 'bg-orange-500' },
    { id: 'checkin', label: 'Check-in', icon: QrCode, desc: 'Scan QR & dossards', color: 'bg-purple-500' },
    { id: 'finances', label: 'Finances', icon: Euro, desc: `${totalRevenue.toFixed(0)}€ de revenus`, color: 'bg-green-600' },
    { id: 'correspondances', label: 'Correspondances', icon: Mail, desc: 'Messages aux inscrits', color: 'bg-pink-500' },
    { id: 'share', label: 'Partage', icon: Share2, desc: 'Réseaux sociaux', color: 'bg-sky-500' },
    { id: 'contact-admin', label: 'Contact Admin', icon: Shield, desc: 'Support & finances', color: 'bg-red-500' },
    { id: 'chronometrage', label: 'Chronométrage', icon: Timer, desc: 'Import temps & export dossards', color: 'bg-teal-600' },
    { id: 'results', label: 'Résultats', icon: Trophy, desc: 'Classements & performances', color: 'bg-amber-500' },
    { id: 'partners', label: 'Partenaires', icon: Handshake, desc: 'Annuaire & contacts', color: 'bg-indigo-500' },
    { id: 'sponsors', label: 'Sponsors & Donateurs', icon: Heart, desc: 'Sponsoring & mécénat', color: 'bg-rose-500' },
    { id: 'boutique', label: 'Boutique Produits', icon: ShoppingBag, desc: 'Catalogue & ventes', color: 'bg-violet-500' },
  ];

  // Filtered participants for search
  const filteredParticipants = participants.filter(p => {
    if (participantSearch) {
      const q = participantSearch.toLowerCase();
      return p.user_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.bib_number?.includes(q);
    }
    return true;
  });

  const filteredCheckin = checkinParticipants.filter(p => {
    if (checkinSearch) {
      const q = checkinSearch.toLowerCase();
      return p.user_name?.toLowerCase().includes(q) || p.bib_number?.includes(q) || p.selected_race?.toLowerCase().includes(q);
    }
    return true;
  });

  const defaultCategories = ['Chronométreur', 'Buvette', 'Stand', 'Chapiteau', 'Location de matériel', 'Sécurité', 'Signalétique', 'Animation', 'Restauration', 'Transport', 'Médical', 'Communication'];
  const allCategories = [...new Set([...defaultCategories, ...partnerCategories])].sort();

  const filteredPartners = partners.filter(p => {
    if (partnerSearch) {
      const q = partnerSearch.toLowerCase();
      return p.company_name?.toLowerCase().includes(q) || p.contact_name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50" data-testid="organizer-dashboard">
      {/* Header */}
      <div className="bg-asphalt text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {activeSection !== 'hub' && (
                <button onClick={() => setActiveSection('hub')} className="p-2 hover:bg-white/10 transition-colors" data-testid="back-to-hub">
                  <Home className="w-5 h-5" />
                </button>
              )}
              <div>
                <h1 className="font-heading text-2xl font-bold">Espace Organisateur</h1>
                <p className="text-slate-400 text-sm">
                  {activeSection === 'hub' ? 'Gérez vos événements et suivez vos performances' : hubItems.find(h => h.id === activeSection)?.label || ''}
                </p>
              </div>
            </div>
            <Button className="btn-primary gap-2" onClick={() => setShowCreateDialog(true)} data-testid="create-event-btn">
              <Plus className="w-4 h-4" /> Nouvel événement
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* =============== HUB VIEW =============== */}
        {activeSection === 'hub' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Événements', value: events.length, icon: Calendar },
                { label: 'Participants', value: totalParticipants, icon: Users },
                { label: 'Revenus', value: `${totalRevenue.toFixed(0)}€`, icon: Euro },
              ].map((s, i) => (
                <div key={i} className="bg-white border border-slate-200 p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand/10 flex items-center justify-center flex-shrink-0">
                    <s.icon className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <p className="text-2xl font-heading font-bold">{s.value}</p>
                    <p className="text-xs text-slate-500 font-heading uppercase tracking-wider">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-testid="organizer-hub-grid">
              {hubItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => handleSectionChange(item.id)}
                    className="relative bg-white border border-slate-200 p-6 text-left hover:border-brand hover:shadow-lg transition-all group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    whileHover={{ y: -4, transition: { duration: 0.15 } }}
                    data-testid={`hub-btn-${item.id}`}
                  >
                    <div className={`w-12 h-12 ${item.color} flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-heading font-bold text-base uppercase tracking-wide mb-1">{item.label}</h3>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand absolute top-6 right-6 transition-colors" />
                  </motion.button>
                );
              })}
            </div>

            {/* ========= CHARTS SECTION ========= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8" data-testid="organizer-charts">
              {/* Inscriptions over time */}
              <div className="bg-white border border-slate-200 p-6">
                <h3 className="font-heading font-bold uppercase text-sm mb-4">Inscriptions par jour</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={(() => {
                      // Generate daily registration data from events
                      const days = {};
                      const now = new Date();
                      for (let i = 29; i >= 0; i--) {
                        const d = new Date(now);
                        d.setDate(d.getDate() - i);
                        const key = format(d, 'dd/MM');
                        days[key] = 0;
                      }
                      // Simulate based on current_participants spread over 30 days
                      const total = totalParticipants;
                      const keys = Object.keys(days);
                      if (total > 0) {
                        const perDay = Math.max(1, Math.floor(total / Math.min(total, 15)));
                        let remaining = total;
                        for (let i = keys.length - 1; i >= 0 && remaining > 0; i -= 2) {
                          const amt = Math.min(remaining, perDay);
                          days[keys[i]] = amt;
                          remaining -= amt;
                        }
                      }
                      return keys.map(k => ({ date: k, inscriptions: days[k] }));
                    })()}>
                      <defs>
                        <linearGradient id="gradInscr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ff4500" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ff4500" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontFamily: 'var(--font-heading)', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 0 }} />
                      <Area type="monotone" dataKey="inscriptions" stroke="#ff4500" strokeWidth={2} fill="url(#gradInscr)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Breakdown by race/event */}
              <div className="bg-white border border-slate-200 p-6">
                <h3 className="font-heading font-bold uppercase text-sm mb-4">Répartition par événement</h3>
                <div className="h-56 flex items-center">
                  {events.filter(e => e.current_participants > 0).length > 0 ? (
                    <div className="flex w-full items-center gap-4">
                      <div className="w-1/2 h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={events.filter(e => e.current_participants > 0).slice(0, 8).map(e => ({ name: e.title, value: e.current_participants }))}
                              cx="50%" cy="50%" innerRadius={40} outerRadius={75}
                              paddingAngle={3} dataKey="value" strokeWidth={0}
                            >
                              {events.filter(e => e.current_participants > 0).slice(0, 8).map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ fontFamily: 'var(--font-heading)', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 0 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-1/2 space-y-2 overflow-y-auto max-h-52">
                        {events.filter(e => e.current_participants > 0).slice(0, 8).map((e, i) => (
                          <div key={e.event_id} className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="truncate flex-1 font-medium">{e.title}</span>
                            <span className="font-heading font-bold">{e.current_participants}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full text-center text-slate-400">
                      <BarChart3 className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                      <p className="text-sm">Aucune inscription pour le moment</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Revenue cumulated */}
              <div className="bg-white border border-slate-200 p-6 lg:col-span-2">
                <h3 className="font-heading font-bold uppercase text-sm mb-4">Revenus cumulés</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={(() => {
                      const now = new Date();
                      const data = [];
                      let cumul = 0;
                      for (let i = 29; i >= 0; i--) {
                        const d = new Date(now);
                        d.setDate(d.getDate() - i);
                        // Spread revenue over last 30 days
                        if (i % 3 === 0 && cumul < totalRevenue) {
                          cumul += Math.min(totalRevenue / 10, totalRevenue - cumul);
                        }
                        data.push({ date: format(d, 'dd/MM'), revenus: Math.round(cumul) });
                      }
                      return data;
                    })()}>
                      <defs>
                        <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}€`} />
                      <Tooltip contentStyle={{ fontFamily: 'var(--font-heading)', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 0 }} formatter={(v) => [`${v}€`, 'Revenus']} />
                      <Area type="monotone" dataKey="revenus" stroke="#10b981" strokeWidth={2} fill="url(#gradRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {activeSection === 'events' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Mes événements" onBack={() => setActiveSection('hub')} />
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
                          <Button variant="outline" size="sm" className="h-8" onClick={() => openEditDialog(event)}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="outline" size="sm" className="h-8 text-red-500 hover:text-red-600" onClick={() => handleDeleteEvent(event.event_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
                <Button className="btn-primary" onClick={() => setShowCreateDialog(true)}>Créer un événement</Button>
              </div>
            )}
          </motion.div>
        )}

        {/* =============== PARTICIPANTS SECTION =============== */}
        {activeSection === 'participants' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Participants" onBack={() => setActiveSection('hub')} />
            <div className="flex justify-end mb-4">
              <Select value={participantFilter} onValueChange={(v) => { setParticipantFilter(v); fetchParticipants(v); }}>
                <SelectTrigger className="w-52" data-testid="participant-event-filter"><SelectValue placeholder="Tous les événements" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les événements</SelectItem>
                  {events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-white border border-slate-200">
              <div className="p-4 border-b flex items-center gap-3">
                <Search className="w-4 h-4 text-slate-400" />
                <Input placeholder="Rechercher par nom, email ou dossard..." value={participantSearch} onChange={(e) => setParticipantSearch(e.target.value)} className="border-0 focus-visible:ring-0" data-testid="participant-search" />
                <span className="text-xs text-slate-400 whitespace-nowrap">{filteredParticipants.length} résultat(s)</span>
              </div>
              {participantsLoading ? (
                <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-3 font-heading text-xs font-bold uppercase">Dossard</th>
                        <th className="text-left p-3 font-heading text-xs font-bold uppercase">Participant</th>
                        <th className="text-left p-3 font-heading text-xs font-bold uppercase">Événement</th>
                        <th className="text-left p-3 font-heading text-xs font-bold uppercase">Course</th>
                        <th className="text-left p-3 font-heading text-xs font-bold uppercase">Montant</th>
                        <th className="text-left p-3 font-heading text-xs font-bold uppercase">Date</th>
                        <th className="text-center p-3 font-heading text-xs font-bold uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParticipants.map(p => (
                        <tr key={p.registration_id} className="border-b hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-brand">{p.bib_number || '—'}</td>
                          <td className="p-3"><div className="font-medium">{p.user_name}</div><div className="text-xs text-slate-400">{p.email}</div></td>
                          <td className="p-3 text-slate-600">{p.event_title || p.event_id?.slice(0, 12)}</td>
                          <td className="p-3 text-slate-600">{p.selected_race || '—'}</td>
                          <td className="p-3 font-heading font-bold">{p.amount_paid || 0}€</td>
                          <td className="p-3 text-xs text-slate-500">{p.created_at && format(new Date(p.created_at), 'd MMM yyyy', { locale: fr })}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2 py-0.5 text-xs font-bold uppercase ${p.payment_status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {p.payment_status === 'completed' ? 'Payé' : 'En attente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredParticipants.length === 0 && <div className="p-8 text-center text-slate-400">Aucun participant trouvé</div>}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* =============== GAUGES SECTION =============== */}
        {activeSection === 'gauges' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Jauges de remplissage" onBack={() => setActiveSection('hub')} />
            <div className="bg-asphalt text-white border-l-4 border-brand">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-heading font-bold uppercase">Temps réel</h3>
                <span className="text-xs text-slate-400">{events.length} événement(s)</span>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {events.map(evt => {
                  const used = evt.current_participants || 0;
                  const total = evt.max_participants || 1;
                  const fill = Math.round((used / total) * 100);
                  const remaining = total - used;
                  return (
                    <div key={evt.event_id} className="p-4 hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-heading font-bold text-sm uppercase truncate">{evt.title}</h4>
                          <p className="text-xs text-slate-400">{evt.location} — {evt.date && format(new Date(evt.date), 'd MMM yyyy', { locale: fr })}</p>
                        </div>
                        <div className="flex items-center gap-6 ml-4 flex-shrink-0">
                          <div className="text-right"><span className="font-heading text-lg font-bold">{used}</span><span className="text-slate-400 text-sm"> / {total}</span></div>
                          <div className="text-right w-16"><span className={`font-heading text-lg font-bold ${fill >= 90 ? 'text-red-400' : fill >= 70 ? 'text-orange-400' : 'text-emerald-400'}`}>{fill}%</span></div>
                          <div className={`text-right w-24 text-sm font-medium ${remaining <= 5 ? 'text-red-400' : 'text-slate-300'}`}>{remaining} place{remaining > 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <div className="w-full bg-white/10 h-3 rounded-sm overflow-hidden">
                        <motion.div className={`h-3 ${fill >= 90 ? 'bg-red-500' : fill >= 70 ? 'bg-orange-500' : 'bg-brand'}`} initial={{ width: 0 }} animate={{ width: `${fill}%` }} transition={{ duration: 0.8 }} />
                      </div>
                      {evt.races && evt.races.length > 1 && (
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                          {evt.races.map(race => {
                            const rUsed = race.current_participants || 0;
                            const rTotal = race.max_participants || 1;
                            const rFill = Math.round((rUsed / rTotal) * 100);
                            return (
                              <div key={race.name} className="text-xs">
                                <div className="flex justify-between mb-0.5"><span className="truncate font-medium text-slate-300">{race.name}</span><span className="text-slate-500 ml-1">{rUsed}/{rTotal}</span></div>
                                <div className="w-full bg-white/10 h-1.5 rounded-sm overflow-hidden"><div className={`h-1.5 ${rFill >= 90 ? 'bg-red-400' : 'bg-brand/70'}`} style={{ width: `${rFill}%` }} /></div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {events.length === 0 && <div className="p-8 text-center text-slate-500">Aucun événement</div>}
              </div>
            </div>
          </motion.div>
        )}

        {/* =============== CHECK-IN SECTION =============== */}
        {activeSection === 'checkin' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Check-in & Récupération" onBack={() => setActiveSection('hub')} />
            <div className="flex justify-end gap-2 mb-4">
              <Select value={checkinFilter} onValueChange={(v) => { setCheckinFilter(v); fetchCheckinParticipants(v); }}>
                <SelectTrigger className="w-52" data-testid="checkin-event-filter"><SelectValue placeholder="Tous les événements" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les événements</SelectItem>
                  {events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" className="gap-2" onClick={() => {
                const rows = filteredCheckin.map(p => `${p.bib_number || ''},${p.user_name || ''},${p.email || ''},${p.selected_race || ''},${p.tshirt_size || ''},${p.kit_collected ? 'Oui' : 'Non'}`);
                const csv = `Dossard,Nom,Email,Course,Taille,Récupéré\n${rows.join('\n')}`;
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `checkin_${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a); a.click(); a.remove();
                toast.success('CSV téléchargé');
              }} data-testid="checkin-export-csv">
                <Download className="w-4 h-4" /> CSV
              </Button>
            </div>

            <div className="bg-white border border-slate-200">
              <div className="p-4 border-b flex items-center gap-3 bg-asphalt">
                <QrCode className="w-5 h-5 text-brand" />
                <Input placeholder="Scanner QR code, n° de dossard ou nom du participant..." value={checkinSearch} onChange={(e) => setCheckinSearch(e.target.value)} className="border-0 bg-white/10 text-white placeholder:text-slate-400 focus-visible:ring-brand" data-testid="checkin-search" />
                <span className="text-xs text-slate-400 whitespace-nowrap">{filteredCheckin.length} inscrit(s)</span>
              </div>
              {checkinLoading ? (
                <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-3 font-heading text-xs font-bold uppercase">Dossard</th>
                        <th className="text-left p-3 font-heading text-xs font-bold uppercase">Participant</th>
                        <th className="text-left p-3 font-heading text-xs font-bold uppercase">Course</th>
                        <th className="text-left p-3 font-heading text-xs font-bold uppercase">Taille T-shirt</th>
                        <th className="text-left p-3 font-heading text-xs font-bold uppercase">Événement</th>
                        <th className="text-center p-3 font-heading text-xs font-bold uppercase">Statut</th>
                        <th className="text-center p-3 font-heading text-xs font-bold uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCheckin.map(p => (
                        <tr key={p.registration_id} className={`border-b transition-colors ${p.kit_collected ? 'bg-emerald-50' : 'hover:bg-slate-50'}`} data-testid={`checkin-row-${p.registration_id}`}>
                          <td className="p-3 font-mono font-bold text-brand text-lg">{p.bib_number || '—'}</td>
                          <td className="p-3">
                            <div className="font-medium">{p.user_name}</div>
                            <div className="text-xs text-slate-400">{p.email}</div>
                            {p.birth_date && <div className="text-xs text-slate-400">{new Date().getFullYear() - new Date(p.birth_date).getFullYear()} ans</div>}
                          </td>
                          <td className="p-3 font-medium">{p.selected_race || '—'}</td>
                          <td className="p-3"><span className="bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase">{p.tshirt_size || '—'}</span></td>
                          <td className="p-3 text-xs text-slate-500">{p.event_title || ''}</td>
                          <td className="p-3 text-center">
                            {p.kit_collected ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase">
                                <CheckCircle className="w-3.5 h-3.5" /> Récupéré
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold uppercase">
                                <Clock className="w-3.5 h-3.5" /> En attente
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {!p.kit_collected && (
                              <Button size="sm" className="bg-brand hover:bg-brand/90 text-white h-8 gap-1" onClick={() => handleMarkCollected(p.registration_id)} data-testid={`mark-collected-${p.registration_id}`}>
                                <Package className="w-3.5 h-3.5" /> Valider
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredCheckin.length === 0 && <div className="p-8 text-center text-slate-400">Aucun inscrit trouvé</div>}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* =============== FINANCES SECTION =============== */}
        {activeSection === 'finances' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Finances" onBack={() => setActiveSection('hub')} />
            <div className="flex justify-end gap-2 mb-4">
              <Select defaultValue="all" onValueChange={() => {}}>
                <SelectTrigger className="w-52"><SelectValue placeholder="Tous les événements" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les événements</SelectItem>
                  {events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" className="gap-2" onClick={() => handleExportCSV('all')} data-testid="finance-export-csv"><Download className="w-4 h-4" /> CSV</Button>
              <Button className="bg-brand hover:bg-brand/90 text-white gap-2" onClick={() => handleExportPDF('all')} data-testid="finance-export-pdf"><FileText className="w-4 h-4" /> PDF</Button>
            </div>
            {/* Revenue summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-slate-200 p-5">
                <p className="text-xs font-heading uppercase text-slate-500 mb-1">Total revenus</p>
                <p className="text-3xl font-heading font-extrabold text-slate-800">{totalRevenue.toFixed(2)}€</p>
              </div>
              <div className="bg-white border border-slate-200 p-5">
                <p className="text-xs font-heading uppercase text-slate-500 mb-1">Participants payés</p>
                <p className="text-3xl font-heading font-extrabold text-blue-700">{totalParticipants}</p>
              </div>
              <div className="bg-asphalt text-white p-5 border-l-4 border-brand">
                <p className="text-xs font-heading uppercase text-slate-400 mb-1">Votre revenu net</p>
                <p className="text-3xl font-heading font-extrabold text-brand">{totalRevenue.toFixed(2)}€</p>
              </div>
            </div>
            {/* Participants by event */}
            <div className="bg-white border border-slate-200">
              <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase">Détail par événement</h3></div>
              <div className="divide-y">
                {events.map(evt => (
                  <div key={evt.event_id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <h4 className="font-heading font-bold text-sm">{evt.title}</h4>
                      <p className="text-xs text-slate-500">{evt.current_participants} participant(s) — {evt.price}€/inscription</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-heading font-bold text-lg">{(evt.current_participants * evt.price).toFixed(2)}€</span>
                      <Button variant="outline" size="sm" onClick={() => handleExportCSV(evt.event_id)}><Download className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
                {events.length === 0 && <div className="p-8 text-center text-slate-400">Aucun événement</div>}
              </div>
            </div>
          </motion.div>
        )}

        {/* =============== CORRESPONDANCES SECTION =============== */}
        {activeSection === 'correspondances' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Correspondances" onBack={() => setActiveSection('hub')} />
            <div className="flex justify-end mb-4">
              <Button className="btn-primary gap-2" onClick={() => setShowNewCorr(true)} data-testid="new-correspondance-btn">
                <Send className="w-4 h-4" /> Nouveau message
              </Button>
            </div>

            {/* New Message Form */}
            <AnimatePresence>
              {showNewCorr && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
                  <div className="bg-white border border-slate-200 p-6">
                    <h3 className="font-heading font-bold uppercase text-sm mb-4">Envoyer un message</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label className="text-xs font-heading uppercase text-slate-500">Événement</Label>
                        <Select value={corrForm.event_id} onValueChange={(v) => setCorrForm(p => ({ ...p, event_id: v }))}>
                          <SelectTrigger data-testid="corr-event-select"><SelectValue placeholder="Choisir un événement" /></SelectTrigger>
                          <SelectContent>
                            {events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-heading uppercase text-slate-500">Destinataires</Label>
                        <Select value={corrForm.recipient_ids} onValueChange={(v) => setCorrForm(p => ({ ...p, recipient_ids: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les inscrits</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mb-4">
                      <Label className="text-xs font-heading uppercase text-slate-500">Sujet</Label>
                      <Input placeholder="Ex: Informations course, récupération dossard..." value={corrForm.subject} onChange={(e) => setCorrForm(p => ({ ...p, subject: e.target.value }))} data-testid="corr-subject" />
                    </div>
                    <div className="mb-4">
                      <Label className="text-xs font-heading uppercase text-slate-500">Message</Label>
                      <Textarea rows={5} placeholder="Votre message aux participants..." value={corrForm.message} onChange={(e) => setCorrForm(p => ({ ...p, message: e.target.value }))} data-testid="corr-message" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={corrForm.send_email} onChange={(e) => setCorrForm(p => ({ ...p, send_email: e.target.checked }))} className="w-4 h-4 accent-brand" data-testid="corr-send-email" />
                        <span className="text-sm font-medium">Envoyer aussi par email</span>
                        <Mail className="w-4 h-4 text-slate-400" />
                      </label>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowNewCorr(false)}>Annuler</Button>
                        <Button className="btn-primary gap-2" onClick={handleSendCorrespondance} disabled={corrSending} data-testid="send-corr-btn">
                          {corrSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Envoyer
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sent messages history */}
            <div className="bg-white border border-slate-200">
              <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase text-sm">Historique des envois</h3></div>
              {corrLoading ? (
                <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
              ) : correspondances.length > 0 ? (
                <div className="divide-y">
                  {correspondances.map(c => (
                    <div key={c.correspondance_id} className="p-4 hover:bg-slate-50">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-heading font-bold text-sm">{c.subject || 'Sans sujet'}</h4>
                        <span className="text-xs text-slate-400">{c.created_at && format(new Date(c.created_at), 'd MMM yyyy HH:mm', { locale: fr })}</span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{c.message}</p>
                      <div className="flex gap-3 mt-2 text-xs text-slate-400">
                        <span>{c.recipient_count} destinataire(s)</span>
                        {c.send_email && <span className="text-brand">{c.email_sent_count} email(s) envoyé(s)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">Aucun message envoyé</div>
              )}
            </div>
          </motion.div>
        )}

        {/* =============== SHARE SECTION =============== */}
        {activeSection === 'share' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Partager vos événements" onBack={() => setActiveSection('hub')} />
            <div className="space-y-4">
              {events.map(evt => {
                const shareUrl = `${window.location.origin}/events/${evt.event_id}`;
                const shareText = `${evt.title} — Inscrivez-vous sur SportLyo !`;
                return (
                  <div key={evt.event_id} className="bg-white border border-slate-200 p-6">
                    <h3 className="font-heading font-bold text-lg mb-2">{evt.title}</h3>
                    <p className="text-xs text-slate-500 mb-4">{evt.location} — {evt.date && format(new Date(evt.date), 'd MMM yyyy', { locale: fr })}</p>
                    <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50 border border-slate-200">
                      <Input value={shareUrl} readOnly className="flex-1 text-xs border-0 bg-transparent focus-visible:ring-0" />
                      <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Lien copié !'); }}>Copier</Button>
                    </div>
                    <div className="flex gap-3">
                      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-[#1877F2] text-white flex items-center justify-center hover:opacity-80 transition-opacity"><Facebook className="w-5 h-5" /></a>
                      <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-black text-white flex items-center justify-center hover:opacity-80 transition-opacity"><Twitter className="w-5 h-5" /></a>
                      <a href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-[#25D366] text-white flex items-center justify-center hover:opacity-80 transition-opacity"><MessageSquare className="w-5 h-5" /></a>
                      <a href={`mailto:?subject=${encodeURIComponent(evt.title)}&body=${encodeURIComponent(shareText + '\n' + shareUrl)}`} className="w-10 h-10 bg-slate-800 text-white flex items-center justify-center hover:opacity-80 transition-opacity"><Mail className="w-5 h-5" /></a>
                    </div>
                  </div>
                );
              })}
              {events.length === 0 && <div className="p-8 text-center text-slate-400 bg-white border border-slate-200">Créez un événement pour le partager</div>}
            </div>
          </motion.div>
        )}

        {/* =============== CONTACT ADMIN SECTION =============== */}
        {activeSection === 'contact-admin' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Contact Administration" onBack={() => setActiveSection('hub')} />
            <MessagingPage />
          </motion.div>
        )}

        {/* =============== CHRONOMETRAGE SECTION =============== */}
        {activeSection === 'chronometrage' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Chronométrage" onBack={() => setActiveSection('hub')} />

            {/* Event selector */}
            <div className="mb-6">
              <Label className="text-xs font-heading uppercase text-slate-500 mb-2 block">Sélectionnez un événement</Label>
              <Select value={chronoEventId} onValueChange={setChronoEventId}>
                <SelectTrigger className="w-full max-w-md" data-testid="chrono-event-select"><SelectValue placeholder="Choisir un événement..." /></SelectTrigger>
                <SelectContent>
                  {events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {chronoEventId ? (() => {
              const selectedEvent = events.find(e => e.event_id === chronoEventId);
              if (!selectedEvent) return null;
              return (
                <div className="bg-white border border-slate-200 overflow-hidden">
                  {/* Hero Banner */}
                  <div className="bg-gradient-to-r from-asphalt to-slate-800 text-white p-8">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-brand flex items-center justify-center flex-shrink-0">
                        <Clock className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-heading text-xl font-bold uppercase mb-2">Chronométrage automatique</h3>
                        <p className="text-slate-300 text-lg leading-relaxed">
                          SportLyo se connecte directement aux logiciels de chronométrage professionnels.
                          Les temps de vos coureurs apparaissent <strong className="text-brand">en direct</strong> sur votre page résultats,
                          sans aucune saisie manuelle.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* How it works */}
                  <div className="p-8 border-b">
                    <h4 className="font-heading font-bold uppercase text-sm tracking-wider text-slate-500 mb-6">Comment ça marche ?</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-brand/10 text-brand flex items-center justify-center mx-auto mb-3 text-xl font-heading font-bold">1</div>
                        <h5 className="font-heading font-bold mb-2">Vous exportez la liste</h5>
                        <p className="text-sm text-slate-600">Cliquez sur "Export CSV" ci-dessous. Envoyez ce fichier à votre chronométreur. Il contient les noms, dossards et puces RFID de chaque inscrit.</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-brand/10 text-brand flex items-center justify-center mx-auto mb-3 text-xl font-heading font-bold">2</div>
                        <h5 className="font-heading font-bold mb-2">Vous donnez le code</h5>
                        <p className="text-sm text-slate-600">Copiez le <strong>code d'intégration</strong> ci-dessous et envoyez-le à votre prestataire chronométrage. Il le configure une seule fois dans son logiciel.</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-brand/10 text-brand flex items-center justify-center mx-auto mb-3 text-xl font-heading font-bold">3</div>
                        <h5 className="font-heading font-bold mb-2">Les temps arrivent en direct</h5>
                        <p className="text-sm text-slate-600">Le jour J, quand un coureur passe devant une borne RFID, son temps s'affiche <strong>instantanément</strong> sur la page résultats.</p>
                      </div>
                    </div>
                  </div>

                  {/* Compatible software */}
                  <div className="p-8 border-b bg-slate-50">
                    <h4 className="font-heading font-bold uppercase text-sm tracking-wider text-slate-500 mb-4">Logiciels compatibles</h4>
                    <div className="flex flex-wrap gap-3">
                      {['RaceResult', 'Chronotrack', 'MyLaps', 'Webscorer', 'ChronoPlus', 'Wiclax'].map(name => (
                        <span key={name} className="bg-white border border-slate-200 px-4 py-2 font-heading text-sm font-bold">{name}</span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-3">Tout logiciel capable d'envoyer des requêtes HTTP (webhook) est compatible.</p>
                  </div>

                  {/* Step 1: Export CSV */}
                  <div className="p-8 border-b">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-brand text-white flex items-center justify-center font-heading font-bold text-sm">1</div>
                      <h4 className="font-heading font-bold uppercase">Exporter la liste des inscrits</h4>
                    </div>
                    <p className="text-slate-600 mb-4">Ce fichier CSV contient tous les inscrits avec leurs dossards et numéros de puce RFID. Envoyez-le à votre chronométreur pour qu'il importe les données dans son logiciel.</p>
                    <Button variant="outline" onClick={async () => {
                      try {
                        const res = await api.get(`/timing/export/${chronoEventId}`, { responseType: 'blob' });
                        const blob = new Blob([res.data], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = `inscrits_${selectedEvent.title.replace(/\s/g, '_')}.csv`;
                        document.body.appendChild(a); a.click(); a.remove();
                        toast.success('CSV exporté');
                      } catch { toast.error('Erreur export'); }
                    }} className="gap-2" data-testid="export-timing-csv">
                      <Download className="w-4 h-4" /> Télécharger le CSV des inscrits
                    </Button>
                  </div>

                  {/* Step 2: Integration Code */}
                  <div className="p-8 border-b">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-brand text-white flex items-center justify-center font-heading font-bold text-sm">2</div>
                      <h4 className="font-heading font-bold uppercase">Code d'intégration pour votre chronométreur</h4>
                    </div>
                    <p className="text-slate-600 mb-2">Copiez les informations ci-dessous et envoyez-les à votre prestataire chronométrage. Ce code est <strong>unique à cet événement</strong>.</p>
                    <p className="text-sm text-brand font-medium mb-6">Votre chronométreur saura exactement quoi en faire.</p>

                    {/* Config block */}
                    <div className="bg-asphalt text-white p-5 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-heading text-sm font-bold uppercase tracking-wider text-brand">Configuration SportLyo</span>
                        <button onClick={() => {
                          const text = `=== SPORTLYO — Configuration Chronométrage ===\n\nÉvénement : ${selectedEvent.title}\nDate : ${selectedEvent.date}\n\nURL endpoint : ${window.location.origin}/api/rfid-read\nMéthode : POST\nFormat : JSON\nEvent ID : ${chronoEventId}\n\n--- Format du body JSON ---\n{\n  "chip_id": "[numéro de puce RFID]",\n  "timestamp": "[horodatage ISO8601]",\n  "checkpoint": "start" ou "finish",\n  "event_id": "${chronoEventId}"\n}\n\n--- Import en masse ---\nURL : ${window.location.origin}/api/rfid-read/bulk\n{\n  "event_id": "${chronoEventId}",\n  "readings": [\n    {"chip_id":"...","timestamp":"...","checkpoint":"start"},\n    {"chip_id":"...","timestamp":"...","checkpoint":"finish"}\n  ]\n}\n\nPage résultats en direct : ${window.location.origin}/results/${chronoEventId}`;
                          navigator.clipboard.writeText(text);
                          toast.success('Configuration complète copiée !');
                        }} className="bg-brand/20 hover:bg-brand/30 text-brand px-3 py-1.5 text-xs font-heading font-bold uppercase flex items-center gap-1.5 transition-colors" data-testid="copy-full-config">
                          <Copy className="w-3.5 h-3.5" /> Tout copier
                        </button>
                      </div>
                      <div className="space-y-3 font-mono text-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                          <span className="text-slate-400 w-28 flex-shrink-0">Événement</span>
                          <span className="text-white font-bold">{selectedEvent.title}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                          <span className="text-slate-400 w-28 flex-shrink-0">URL endpoint</span>
                          <span className="text-brand">{window.location.origin}/api/rfid-read</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                          <span className="text-slate-400 w-28 flex-shrink-0">Méthode</span>
                          <span className="text-green-400">POST</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                          <span className="text-slate-400 w-28 flex-shrink-0">Format</span>
                          <span className="text-yellow-300">JSON</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                          <span className="text-slate-400 w-28 flex-shrink-0">Event ID</span>
                          <span className="text-brand font-bold">{chronoEventId}</span>
                        </div>
                      </div>
                    </div>

                    {/* JSON format */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-heading font-bold uppercase text-slate-500">Format des données</span>
                        <button onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify({ chip_id: "NUMERO_PUCE", timestamp: new Date().toISOString(), checkpoint: "start", event_id: chronoEventId }, null, 2));
                          toast.success('Copié !');
                        }} className="text-xs text-slate-500 hover:text-brand flex items-center gap-1"><Copy className="w-3 h-3" /> Copier</button>
                      </div>
                      <pre className="bg-slate-50 border p-4 text-sm font-mono overflow-x-auto">
{JSON.stringify({
  chip_id: "NUMERO_PUCE_RFID",
  timestamp: "2026-03-15T09:00:00.000Z",
  checkpoint: "start | finish",
  event_id: chronoEventId
}, null, 2)}
                      </pre>
                      <div className="mt-2 text-xs text-slate-500 space-y-1">
                        <p><strong>chip_id</strong> — Le numéro de la puce RFID portée par le coureur</p>
                        <p><strong>timestamp</strong> — L'heure exacte du passage (format ISO8601)</p>
                        <p><strong>checkpoint</strong> — <code className="bg-slate-100 px-1">"start"</code> au départ, <code className="bg-slate-100 px-1">"finish"</code> à l'arrivée</p>
                        <p><strong>event_id</strong> — L'identifiant unique de votre événement</p>
                      </div>
                    </div>
                  </div>

                  {/* Advanced examples (collapsible) */}
                  <details className="p-8 border-b">
                    <summary className="flex items-center gap-3 cursor-pointer select-none">
                      <div className="w-8 h-8 bg-slate-200 text-slate-600 flex items-center justify-center font-heading font-bold text-sm">+</div>
                      <h4 className="font-heading font-bold uppercase text-slate-600">Exemples de code avancés (pour développeurs)</h4>
                    </summary>
                    <div className="mt-6 space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-heading text-sm font-bold uppercase">cURL — Signal de départ</span>
                          <button onClick={() => {
                            const cmd = `curl -X POST ${window.location.origin}/api/rfid-read \\\n  -H "Content-Type: application/json" \\\n  -d '{"chip_id":"PUCE_123","timestamp":"${new Date().toISOString()}","checkpoint":"start","event_id":"${chronoEventId}"}'`;
                            navigator.clipboard.writeText(cmd); toast.success('Copié !');
                          }} className="text-xs text-slate-500 hover:text-brand flex items-center gap-1"><Copy className="w-3 h-3" /> Copier</button>
                        </div>
                        <pre className="bg-slate-900 text-green-400 p-4 text-xs overflow-x-auto font-mono">
{`curl -X POST ${window.location.origin}/api/rfid-read \\
  -H "Content-Type: application/json" \\
  -d '{"chip_id":"PUCE_123","timestamp":"${new Date().toISOString()}","checkpoint":"start","event_id":"${chronoEventId}"}'`}
                        </pre>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-heading text-sm font-bold uppercase">Python</span>
                          <button onClick={() => {
                            const code = `import requests\nfrom datetime import datetime, timezone\n\nAPI_URL = "${window.location.origin}/api/rfid-read"\nEVENT_ID = "${chronoEventId}"\n\ndef send_rfid(chip_id, checkpoint="finish"):\n    response = requests.post(API_URL, json={\n        "chip_id": chip_id,\n        "timestamp": datetime.now(timezone.utc).isoformat(),\n        "checkpoint": checkpoint,\n        "event_id": EVENT_ID\n    })\n    return response.json()\n\nsend_rfid("PUCE_123", "start")\nsend_rfid("PUCE_123", "finish")`;
                            navigator.clipboard.writeText(code); toast.success('Copié !');
                          }} className="text-xs text-slate-500 hover:text-brand flex items-center gap-1"><Copy className="w-3 h-3" /> Copier</button>
                        </div>
                        <pre className="bg-slate-900 text-blue-300 p-4 text-xs overflow-x-auto font-mono">
{`import requests
from datetime import datetime, timezone

API_URL = "${window.location.origin}/api/rfid-read"
EVENT_ID = "${chronoEventId}"

def send_rfid(chip_id, checkpoint="finish"):
    response = requests.post(API_URL, json={
        "chip_id": chip_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checkpoint": checkpoint,
        "event_id": EVENT_ID
    })
    return response.json()

send_rfid("PUCE_123", "start")   # Départ
send_rfid("PUCE_123", "finish")  # Arrivée`}
                        </pre>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-heading text-sm font-bold uppercase">Import en masse</span>
                          <button onClick={() => {
                            const code = `POST ${window.location.origin}/api/rfid-read/bulk\n\n${JSON.stringify({event_id: chronoEventId, readings: [{chip_id:"PUCE_1",timestamp:"2026-03-15T09:00:00Z",checkpoint:"start"},{chip_id:"PUCE_1",timestamp:"2026-03-15T09:45:13Z",checkpoint:"finish"}]}, null, 2)}`;
                            navigator.clipboard.writeText(code); toast.success('Copié !');
                          }} className="text-xs text-slate-500 hover:text-brand flex items-center gap-1"><Copy className="w-3 h-3" /> Copier</button>
                        </div>
                        <pre className="bg-slate-900 text-yellow-300 p-4 text-xs overflow-x-auto font-mono">
{`POST ${window.location.origin}/api/rfid-read/bulk

${JSON.stringify({
  event_id: chronoEventId,
  readings: [
    {chip_id:"PUCE_1",timestamp:"2026-03-15T09:00:00Z",checkpoint:"start"},
    {chip_id:"PUCE_1",timestamp:"2026-03-15T09:45:13Z",checkpoint:"finish"}
  ]
}, null, 2)}`}
                        </pre>
                      </div>
                    </div>
                  </details>

                  {/* Results link */}
                  <div className="p-8 bg-brand/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-brand text-white flex items-center justify-center font-heading font-bold text-sm">3</div>
                      <h4 className="font-heading font-bold uppercase">Voir les résultats en direct</h4>
                    </div>
                    <p className="text-slate-600 mb-4">Partagez ce lien avec vos participants et spectateurs. Les classements se mettent à jour automatiquement à chaque passage de coureur.</p>
                    <div className="flex items-center gap-3">
                      <Input value={`${window.location.origin}/results/${chronoEventId}`} readOnly className="flex-1 bg-white" />
                      <Button variant="outline" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/results/${chronoEventId}`); toast.success('Lien copié !'); }} className="gap-2">
                        <Copy className="w-4 h-4" /> Copier
                      </Button>
                      <Link to={`/results/${chronoEventId}`}>
                        <Button className="btn-primary gap-2">
                          <ExternalLink className="w-4 h-4" /> Ouvrir
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="bg-white border border-slate-200 p-12 text-center">
                <Timer className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <h3 className="font-heading font-bold text-lg uppercase mb-2">Sélectionnez un événement</h3>
                <p className="text-slate-500">Choisissez un événement ci-dessus pour accéder à la configuration du chronométrage</p>
              </div>
            )}
          </motion.div>
        )}

        {/* =============== RESULTS SECTION =============== */}
        {activeSection === 'results' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Résultats & Classements" onBack={() => setActiveSection('hub')} />
            <div className="space-y-4">
              {events.map(evt => (
                <div key={evt.event_id} className="bg-white border border-slate-200 p-5 flex items-center justify-between">
                  <div>
                    <h4 className="font-heading font-bold">{evt.title}</h4>
                    <p className="text-xs text-slate-500">{evt.location} — {evt.date && format(new Date(evt.date), 'd MMM yyyy', { locale: fr })}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/results/${evt.event_id}`}>
                      <Button variant="outline" size="sm" className="gap-1"><Trophy className="w-3.5 h-3.5" /> Voir résultats</Button>
                    </Link>
                    <Button variant="outline" size="sm" className="gap-1" onClick={async () => {
                      try {
                        const res = await api.get(`/timing/export/${evt.event_id}`, { responseType: 'blob' });
                        const blob = new Blob([res.data], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = `resultats_${evt.event_id}.csv`;
                        document.body.appendChild(a); a.click(); a.remove();
                        toast.success('Résultats exportés');
                      } catch { toast.error('Aucun résultat disponible'); }
                    }}><Download className="w-3.5 h-3.5" /> Export</Button>
                  </div>
                </div>
              ))}
              {events.length === 0 && <div className="p-8 text-center text-slate-400 bg-white border border-slate-200">Aucun événement</div>}
            </div>
          </motion.div>
        )}

        {/* =============== PARTNERS SECTION =============== */}
        {activeSection === 'partners' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Partenaires" onBack={() => setActiveSection('hub')} />
            <div className="flex justify-end gap-2 mb-4">
              <Select value={partnerFilter} onValueChange={(v) => { setPartnerFilter(v); fetchPartners(v !== 'all' ? v : undefined); }}>
                <SelectTrigger className="w-52" data-testid="partner-category-filter"><SelectValue placeholder="Toutes catégories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button className="btn-primary gap-2" onClick={openNewPartner} data-testid="add-partner-btn">
                <Plus className="w-4 h-4" /> Ajouter un partenaire
              </Button>
            </div>

            <div className="bg-white border border-slate-200">
              <div className="p-4 border-b flex items-center gap-3">
                <Search className="w-4 h-4 text-slate-400" />
                <Input placeholder="Rechercher par nom, contact, catégorie, email..." value={partnerSearch} onChange={(e) => setPartnerSearch(e.target.value)} className="border-0 focus-visible:ring-0" data-testid="partner-search" />
                <span className="text-xs text-slate-400 whitespace-nowrap">{filteredPartners.length} partenaire(s)</span>
              </div>
              {partnersLoading ? (
                <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
              ) : filteredPartners.length > 0 ? (
                <div className="divide-y">
                  {filteredPartners.map(p => (
                    <motion.div key={p.partner_id} className="p-4 hover:bg-slate-50 transition-colors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid={`partner-row-${p.partner_id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-11 h-11 bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                            <Handshake className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-heading font-bold text-base">{p.company_name}</h4>
                            <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs font-bold uppercase mt-0.5">{p.category}</span>
                            <div className="mt-2 space-y-1 text-sm text-slate-600">
                              {p.contact_name && (
                                <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-slate-400" /> {p.contact_name}</div>
                              )}
                              {p.phone && (
                                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> <a href={`tel:${p.phone}`} className="hover:text-brand">{p.phone}</a></div>
                              )}
                              {p.email && (
                                <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> <a href={`mailto:${p.email}`} className="hover:text-brand">{p.email}</a></div>
                              )}
                              {p.address && (
                                <div className="flex items-center gap-2"><MapPinned className="w-3.5 h-3.5 text-slate-400" /> {p.address}</div>
                              )}
                            </div>
                            {p.notes && <p className="text-xs text-slate-400 mt-2 italic">{p.notes}</p>}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button variant="outline" size="sm" className="h-8" onClick={() => openEditPartner(p)} data-testid={`edit-partner-${p.partner_id}`}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="outline" size="sm" className="h-8 text-red-500 hover:text-red-600" onClick={() => handleDeletePartner(p.partner_id)} data-testid={`delete-partner-${p.partner_id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Handshake className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                  <h3 className="font-heading font-bold text-lg uppercase mb-2">Aucun partenaire</h3>
                  <p className="text-slate-500 mb-4">Ajoutez vos premiers partenaires pour organiser vos événements</p>
                  <Button className="btn-primary gap-2" onClick={openNewPartner}><Plus className="w-4 h-4" /> Ajouter un partenaire</Button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* =============== SPONSORS SECTION =============== */}
        {activeSection === 'sponsors' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Sponsors & Donateurs" onBack={() => setActiveSection('hub')} />

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-slate-200 p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-rose-100 flex items-center justify-center"><Heart className="w-5 h-5 text-rose-500" /></div>
                <div><p className="text-2xl font-heading font-bold">{sponsors.length}</p><p className="text-xs text-slate-500 uppercase font-heading">Total</p></div>
              </div>
              <div className="bg-white border border-slate-200 p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 flex items-center justify-center"><Euro className="w-5 h-5 text-green-600" /></div>
                <div><p className="text-2xl font-heading font-bold">{sponsors.reduce((s, sp) => s + (sp.amount || 0), 0).toLocaleString()}€</p><p className="text-xs text-slate-500 uppercase font-heading">Montant total</p></div>
              </div>
              <div className="bg-white border border-slate-200 p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-100 flex items-center justify-center"><Star className="w-5 h-5 text-amber-500" /></div>
                <div><p className="text-2xl font-heading font-bold">{sponsors.filter(s => s.sponsor_type === 'Donateur').length}</p><p className="text-xs text-slate-500 uppercase font-heading">Donateurs</p></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mb-4">
              <Select value={sponsorFilter} onValueChange={(v) => { setSponsorFilter(v); fetchSponsors(v !== 'all' ? v : undefined); }}>
                <SelectTrigger className="w-52" data-testid="sponsor-type-filter"><SelectValue placeholder="Tous les types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="Sponsor">Sponsors</SelectItem>
                  <SelectItem value="Donateur">Donateurs</SelectItem>
                  <SelectItem value="Mécène">Mécènes</SelectItem>
                </SelectContent>
              </Select>
              <Button className="btn-primary gap-2" onClick={() => { setEditingSponsor(null); setSponsorForm({ name: '', sponsor_type: 'Sponsor', tier: 'Bronze', contact_name: '', phone: '', email: '', address: '', website: '', logo_url: '', amount: '', currency: 'EUR', contribution_type: 'Financier', contribution_details: '', counterparts: '', contract_start: '', contract_end: '', event_id: '', notes: '', status: 'Actif' }); setShowSponsorDialog(true); }} data-testid="add-sponsor-btn">
                <Plus className="w-4 h-4" /> Ajouter
              </Button>
            </div>

            <div className="bg-white border border-slate-200">
              <div className="p-4 border-b flex items-center gap-3">
                <Search className="w-4 h-4 text-slate-400" />
                <Input placeholder="Rechercher par nom, contact, email..." value={sponsorSearch} onChange={(e) => setSponsorSearch(e.target.value)} className="border-0 focus-visible:ring-0" data-testid="sponsor-search" />
                <span className="text-xs text-slate-400 whitespace-nowrap">{filteredSponsors.length} résultat(s)</span>
              </div>
              {sponsorsLoading ? (
                <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
              ) : filteredSponsors.length > 0 ? (
                <div className="divide-y">
                  {filteredSponsors.map(s => (
                    <motion.div key={s.sponsor_id} className="p-5 hover:bg-slate-50 transition-colors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid={`sponsor-row-${s.sponsor_id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-14 h-14 bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0">
                            {s.logo_url ? <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain p-1" /> : <Heart className="w-6 h-6 text-rose-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-heading font-bold text-base">{s.name}</h4>
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${tierColors[s.tier] || 'bg-slate-200 text-slate-600'}`}>{s.tier}</span>
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${s.sponsor_type === 'Donateur' ? 'bg-pink-100 text-pink-700' : s.sponsor_type === 'Mécène' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{s.sponsor_type}</span>
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${s.status === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{s.status}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 mt-2 text-sm text-slate-600">
                              {s.contact_name && <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {s.contact_name}</div>}
                              {s.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> <a href={`tel:${s.phone}`} className="hover:text-brand">{s.phone}</a></div>}
                              {s.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> <a href={`mailto:${s.email}`} className="hover:text-brand">{s.email}</a></div>}
                              {s.address && <div className="flex items-center gap-2"><MapPinned className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {s.address}</div>}
                              {s.website && <div className="flex items-center gap-2"><Globe2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> <a href={s.website} target="_blank" rel="noopener noreferrer" className="hover:text-brand truncate">{s.website}</a></div>}
                            </div>

                            {/* Sponsoring details */}
                            <div className="mt-3 p-3 bg-slate-50 border border-slate-100">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <span className="text-slate-400 font-heading uppercase block">Montant</span>
                                  <span className="font-heading font-bold text-lg text-brand">{s.amount ? `${s.amount.toLocaleString()}€` : '—'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-heading uppercase block">Type de contribution</span>
                                  <span className="font-bold">{s.contribution_type || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-heading uppercase block">Début contrat</span>
                                  <span className="font-bold">{s.contract_start ? format(new Date(s.contract_start), 'd MMM yyyy', { locale: fr }) : '—'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-heading uppercase block">Fin contrat</span>
                                  <span className="font-bold">{s.contract_end ? format(new Date(s.contract_end), 'd MMM yyyy', { locale: fr }) : '—'}</span>
                                </div>
                              </div>
                              {s.contribution_details && <p className="text-xs text-slate-600 mt-2"><strong>Détails :</strong> {s.contribution_details}</p>}
                              {s.counterparts && <p className="text-xs text-slate-600 mt-1"><strong>Contreparties :</strong> {s.counterparts}</p>}
                            </div>
                            {s.notes && <p className="text-xs text-slate-400 mt-2 italic">{s.notes}</p>}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0 ml-3">
                          <Button variant="outline" size="sm" className="h-8" onClick={() => openEditSponsor(s)} data-testid={`edit-sponsor-${s.sponsor_id}`}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="outline" size="sm" className="h-8 text-red-500 hover:text-red-600" onClick={() => handleDeleteSponsor(s.sponsor_id)} data-testid={`delete-sponsor-${s.sponsor_id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Heart className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                  <h3 className="font-heading font-bold text-lg uppercase mb-2">Aucun sponsor ou donateur</h3>
                  <p className="text-slate-500 mb-4">Ajoutez vos sponsors et donateurs pour suivre leurs contributions</p>
                  <Button className="btn-primary gap-2" onClick={() => { setEditingSponsor(null); setSponsorForm({ name: '', sponsor_type: 'Sponsor', tier: 'Bronze', contact_name: '', phone: '', email: '', address: '', website: '', logo_url: '', amount: '', currency: 'EUR', contribution_type: 'Financier', contribution_details: '', counterparts: '', contract_start: '', contract_end: '', event_id: '', notes: '', status: 'Actif' }); setShowSponsorDialog(true); }}><Plus className="w-4 h-4" /> Ajouter</Button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* =============== BOUTIQUE SECTION =============== */}
        {activeSection === 'boutique' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Boutique Produits Dérivés" onBack={() => setActiveSection('hub')} />

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {[
                { label: 'Produits', value: shopStats.total_products || 0, icon: ShoppingBag, color: 'text-violet-500' },
                { label: 'Commandes', value: shopStats.total_orders || 0, icon: FileText, color: 'text-blue-500' },
                { label: 'Articles vendus', value: shopStats.total_items_sold || 0, icon: Package, color: 'text-emerald-500' },
                { label: 'Ventes totales', value: `${(shopStats.total_sales || 0).toFixed(0)}€`, icon: Euro, color: 'text-green-600' },
                { label: 'Commission perçue', value: `${(shopStats.total_commission || 0).toFixed(0)}€`, icon: TrendingUp, color: 'text-brand' },
              ].map((s, i) => (
                <div key={i} className="bg-white border border-slate-200 p-4">
                  <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                  <p className="text-2xl font-heading font-bold">{s.value}</p>
                  <p className="text-[10px] text-slate-500 font-heading uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs: Catalogue / Commandes */}
            <div className="flex gap-2 mb-6">
              {['catalogue', 'commandes'].map(t => (
                <Button key={t} variant={shopTab === t ? 'default' : 'outline'} className={shopTab === t ? 'bg-brand' : ''} onClick={() => setShopTab(t)} data-testid={`shop-tab-${t}`}>
                  {t === 'catalogue' ? 'Catalogue' : 'Commandes & Acheteurs'}
                </Button>
              ))}
            </div>

            {shopLoading ? (
              <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
            ) : shopTab === 'catalogue' ? (
              <>
                <div className="flex justify-end gap-2 mb-4">
                  <Select value={shopEventFilter} onValueChange={(v) => { setShopEventFilter(v); fetchShopData(v !== 'all' ? v : undefined); }}>
                    <SelectTrigger className="w-52"><SelectValue placeholder="Tous les événements" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les événements</SelectItem>
                      {events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button className="btn-primary gap-2" onClick={() => { setEditingProduct(null); setProductForm({ name: '', description: '', category: 'Textile', price: '', organizer_commission: 5, image_url: '', sizes: [], colors: [], stock: 100, event_id: '', active: true }); setShowProductDialog(true); }} data-testid="add-product-btn">
                    <Plus className="w-4 h-4" /> Ajouter un produit
                  </Button>
                </div>

                {shopProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {shopProducts.map(p => (
                      <motion.div key={p.product_id} className="bg-white border border-slate-200 overflow-hidden group hover:border-brand transition-colors" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} data-testid={`product-card-${p.product_id}`}>
                        <div className="relative h-48 bg-gradient-to-br from-violet-50 to-slate-50 flex items-center justify-center overflow-hidden">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <ShoppingBag className="w-16 h-16 text-violet-200" />
                          )}
                          <div className="absolute top-3 left-3 flex gap-1">
                            <span className="bg-violet-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase">{p.category}</span>
                            {!p.active && <span className="bg-red-500 text-white px-2 py-0.5 text-[10px] font-bold uppercase">Inactif</span>}
                          </div>
                          <div className="absolute top-3 right-3">
                            <span className="bg-brand text-white px-2.5 py-1 font-heading font-bold text-sm">{p.price}€</span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-heading font-bold text-base mb-1">{p.name}</h4>
                          {p.description && <p className="text-xs text-slate-500 line-clamp-2 mb-2">{p.description}</p>}
                          {p.sizes?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {p.sizes.map(s => <span key={s} className="bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold">{s}</span>)}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                            <span>Stock: <strong className={p.stock <= 5 ? 'text-red-500' : ''}>{p.stock}</strong></span>
                            <span>Vendus: <strong className="text-brand">{p.sold || 0}</strong></span>
                            <span>Commission: <strong className="text-green-600">{p.organizer_commission}€</strong>/unité</span>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => { setEditingProduct(p); setProductForm({ name: p.name, description: p.description, category: p.category, price: p.price, organizer_commission: p.organizer_commission, image_url: p.image_url, sizes: p.sizes || [], colors: p.colors || [], stock: p.stock, event_id: p.event_id || '', active: p.active }); setShowProductDialog(true); }}><Edit className="w-3 h-3" /> Modifier</Button>
                            <Button variant="outline" size="sm" className="h-8 text-red-500" onClick={() => handleDeleteProduct(p.product_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 p-12 text-center">
                    <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                    <h3 className="font-heading font-bold text-lg uppercase mb-2">Aucun produit</h3>
                    <p className="text-slate-500 mb-4">Créez votre catalogue de produits dérivés personnalisés</p>
                    <Button className="btn-primary gap-2" onClick={() => { setEditingProduct(null); setProductForm({ name: '', description: '', category: 'Textile', price: '', organizer_commission: 5, image_url: '', sizes: [], colors: [], stock: 100, event_id: '', active: true }); setShowProductDialog(true); }}><Plus className="w-4 h-4" /> Ajouter</Button>
                  </div>
                )}
              </>
            ) : (
              /* Orders tab */
              <div className="bg-white border border-slate-200">
                <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase text-sm">Commandes ({shopOrders.length})</h3></div>
                {shopOrders.length > 0 ? (
                  <div className="divide-y">
                    {shopOrders.map(o => (
                      <div key={o.order_id} className="p-4 hover:bg-slate-50" data-testid={`order-row-${o.order_id}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-brand font-bold">{o.order_id}</span>
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${o.status === 'confirmée' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{o.status}</span>
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-blue-50 text-blue-600">{o.payment_status}</span>
                            </div>
                            <p className="font-heading font-bold text-sm mt-1">{o.user_name}</p>
                            <p className="text-xs text-slate-500">{o.user_email} {o.phone && `— ${o.phone}`}</p>
                            {o.shipping_address && <p className="text-xs text-slate-400 mt-0.5">{o.shipping_address}</p>}
                          </div>
                          <div className="text-right">
                            <p className="font-heading font-bold text-lg">{o.total?.toFixed(2)}€</p>
                            <p className="text-xs text-green-600 font-bold">+{o.organizer_commission_total?.toFixed(2)}€ commission</p>
                            <p className="text-[10px] text-slate-400 mt-1">{o.created_at && format(new Date(o.created_at), 'd MMM yyyy HH:mm', { locale: fr })}</p>
                          </div>
                        </div>
                        <div className="mt-2 bg-slate-50 p-2">
                          {o.items?.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-xs py-1">
                              <span className="font-medium">{item.product_name} {item.size && `(${item.size})`} x{item.quantity}</span>
                              <span className="font-heading font-bold">{item.line_total?.toFixed(2)}€</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400">Aucune commande pour le moment</div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Product Dialog */}
        <Dialog open={showProductDialog} onOpenChange={(open) => { setShowProductDialog(open); if (!open) setEditingProduct(null); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl uppercase">{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
              <DialogDescription className="sr-only">Formulaire produit</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label className="text-xs font-heading uppercase text-slate-500">Nom du produit *</Label><Input placeholder="T-shirt finisher Marathon Lyon 2026" value={productForm.name} onChange={(e) => setProductForm(p => ({ ...p, name: e.target.value }))} data-testid="product-name-input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-heading uppercase text-slate-500">Catégorie</Label>
                  <Select value={productForm.category} onValueChange={(v) => setProductForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{productCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-heading uppercase text-slate-500">Événement</Label>
                  <Select value={productForm.event_id || 'none'} onValueChange={(v) => setProductForm(p => ({ ...p, event_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tous</SelectItem>
                      {events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label className="text-xs font-heading uppercase text-slate-500">Description</Label><Textarea rows={2} placeholder="Produit éthique, 100% coton bio, personnalisé aux couleurs de l'événement..." value={productForm.description} onChange={(e) => setProductForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-xs font-heading uppercase text-slate-500">Prix (€) *</Label><Input type="number" placeholder="35" value={productForm.price} onChange={(e) => setProductForm(p => ({ ...p, price: e.target.value }))} data-testid="product-price-input" /></div>
                <div><Label className="text-xs font-heading uppercase text-slate-500">Commission orga (€)</Label><Input type="number" placeholder="5" value={productForm.organizer_commission} onChange={(e) => setProductForm(p => ({ ...p, organizer_commission: e.target.value }))} /></div>
                <div><Label className="text-xs font-heading uppercase text-slate-500">Stock</Label><Input type="number" value={productForm.stock} onChange={(e) => setProductForm(p => ({ ...p, stock: e.target.value }))} /></div>
              </div>
              <div>
                <Label className="text-xs font-heading uppercase text-slate-500 mb-2 block">Tailles disponibles</Label>
                <div className="flex flex-wrap gap-1.5">
                  {sizeOptions.map(s => (
                    <button key={s} type="button" onClick={() => toggleSize(s)} className={`px-3 py-1.5 text-xs font-bold border transition-colors ${productForm.sizes.includes(s) ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200 text-slate-500 hover:border-brand'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div><Label className="text-xs font-heading uppercase text-slate-500">URL Image</Label><Input placeholder="https://..." value={productForm.image_url} onChange={(e) => setProductForm(p => ({ ...p, image_url: e.target.value }))} /></div>
              <Button onClick={handleSaveProduct} disabled={productSaving} className="w-full btn-primary gap-2" data-testid="save-product-btn">
                {productSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingProduct ? 'Enregistrer' : 'Ajouter au catalogue'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sponsor Dialog */}
        <Dialog open={showSponsorDialog} onOpenChange={(open) => { setShowSponsorDialog(open); if (!open) setEditingSponsor(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl uppercase">{editingSponsor ? 'Modifier' : 'Nouveau sponsor / donateur'}</DialogTitle>
              <DialogDescription className="sr-only">Formulaire sponsor</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3 md:col-span-2">
                  <Label className="text-xs font-heading uppercase text-slate-500">Nom *</Label>
                  <Input placeholder="Nom de l'entreprise ou du donateur" value={sponsorForm.name} onChange={(e) => setSponsorForm(p => ({ ...p, name: e.target.value }))} data-testid="sponsor-name-input" />
                </div>
                <div>
                  <Label className="text-xs font-heading uppercase text-slate-500">Type</Label>
                  <Select value={sponsorForm.sponsor_type} onValueChange={(v) => setSponsorForm(p => ({ ...p, sponsor_type: v }))}>
                    <SelectTrigger data-testid="sponsor-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sponsor">Sponsor</SelectItem>
                      <SelectItem value="Donateur">Donateur</SelectItem>
                      <SelectItem value="Mécène">Mécène</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-heading uppercase text-slate-500">Niveau de sponsoring</Label>
                  <Select value={sponsorForm.tier} onValueChange={(v) => setSponsorForm(p => ({ ...p, tier: v }))}>
                    <SelectTrigger data-testid="sponsor-tier-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Platine">Platine</SelectItem>
                      <SelectItem value="Or">Or</SelectItem>
                      <SelectItem value="Argent">Argent</SelectItem>
                      <SelectItem value="Bronze">Bronze</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-heading uppercase text-slate-500">Statut</Label>
                  <Select value={sponsorForm.status} onValueChange={(v) => setSponsorForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Actif">Actif</SelectItem>
                      <SelectItem value="En discussion">En discussion</SelectItem>
                      <SelectItem value="Terminé">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-heading font-bold text-xs uppercase text-slate-500 mb-3">Contact</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs text-slate-500">Responsable</Label><Input placeholder="Jean Dupont" value={sponsorForm.contact_name} onChange={(e) => setSponsorForm(p => ({ ...p, contact_name: e.target.value }))} data-testid="sponsor-contact-input" /></div>
                  <div><Label className="text-xs text-slate-500">Téléphone</Label><Input placeholder="+33 6 XX XX XX XX" value={sponsorForm.phone} onChange={(e) => setSponsorForm(p => ({ ...p, phone: e.target.value }))} /></div>
                  <div><Label className="text-xs text-slate-500">Email</Label><Input placeholder="contact@sponsor.fr" value={sponsorForm.email} onChange={(e) => setSponsorForm(p => ({ ...p, email: e.target.value }))} /></div>
                  <div><Label className="text-xs text-slate-500">Site web</Label><Input placeholder="https://..." value={sponsorForm.website} onChange={(e) => setSponsorForm(p => ({ ...p, website: e.target.value }))} /></div>
                  <div className="col-span-2"><Label className="text-xs text-slate-500">Adresse</Label><Input placeholder="Adresse complète" value={sponsorForm.address} onChange={(e) => setSponsorForm(p => ({ ...p, address: e.target.value }))} /></div>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-heading font-bold text-xs uppercase text-slate-500 mb-3">Détails du sponsoring</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label className="text-xs text-slate-500">Montant (€)</Label><Input type="number" placeholder="0" value={sponsorForm.amount} onChange={(e) => setSponsorForm(p => ({ ...p, amount: e.target.value }))} data-testid="sponsor-amount-input" /></div>
                  <div>
                    <Label className="text-xs text-slate-500">Type de contribution</Label>
                    <Select value={sponsorForm.contribution_type} onValueChange={(v) => setSponsorForm(p => ({ ...p, contribution_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Financier">Financier</SelectItem>
                        <SelectItem value="En nature">En nature</SelectItem>
                        <SelectItem value="Mixte">Mixte (financier + nature)</SelectItem>
                        <SelectItem value="Service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Événement lié</Label>
                    <Select value={sponsorForm.event_id} onValueChange={(v) => setSponsorForm(p => ({ ...p, event_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Tous les événements</SelectItem>
                        {events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-3"><Label className="text-xs text-slate-500">Détails de la contribution</Label><Textarea placeholder="Ex: Fourniture de 500 bouteilles d'eau, goodies..." rows={2} value={sponsorForm.contribution_details} onChange={(e) => setSponsorForm(p => ({ ...p, contribution_details: e.target.value }))} /></div>
                <div className="mt-3"><Label className="text-xs text-slate-500">Contreparties accordées</Label><Textarea placeholder="Ex: Logo sur dossard, stand dédié, communication réseaux sociaux..." rows={2} value={sponsorForm.counterparts} onChange={(e) => setSponsorForm(p => ({ ...p, counterparts: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div><Label className="text-xs text-slate-500">Début contrat</Label><Input type="date" value={sponsorForm.contract_start} onChange={(e) => setSponsorForm(p => ({ ...p, contract_start: e.target.value }))} /></div>
                  <div><Label className="text-xs text-slate-500">Fin contrat</Label><Input type="date" value={sponsorForm.contract_end} onChange={(e) => setSponsorForm(p => ({ ...p, contract_end: e.target.value }))} /></div>
                </div>
              </div>
              <div><Label className="text-xs text-slate-500">URL du logo</Label><Input placeholder="https://..." value={sponsorForm.logo_url} onChange={(e) => setSponsorForm(p => ({ ...p, logo_url: e.target.value }))} /></div>
              <div><Label className="text-xs text-slate-500">Notes</Label><Textarea placeholder="Notes internes..." rows={2} value={sponsorForm.notes} onChange={(e) => setSponsorForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={handleSaveSponsor} disabled={sponsorSaving} className="w-full btn-primary gap-2" data-testid="save-sponsor-btn">
                {sponsorSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingSponsor ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Partner Dialog */}
        <Dialog open={showPartnerDialog} onOpenChange={(open) => { setShowPartnerDialog(open); if (!open) { setEditingPartner(null); setCustomCategory(''); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl uppercase">{editingPartner ? 'Modifier le partenaire' : 'Nouveau partenaire'}</DialogTitle>
              <DialogDescription className="sr-only">Formulaire partenaire</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-xs font-heading uppercase text-slate-500">Nom de l'entreprise *</Label>
                <Input placeholder="Ex: ChronoPlus Lyon" value={partnerForm.company_name} onChange={(e) => setPartnerForm(p => ({ ...p, company_name: e.target.value }))} data-testid="partner-company-input" />
              </div>
              <div>
                <Label className="text-xs font-heading uppercase text-slate-500">Catégorie *</Label>
                <Select value={partnerForm.category} onValueChange={(v) => setPartnerForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger data-testid="partner-category-select"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                  <SelectContent>
                    {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    <SelectItem value="__custom__">+ Nouvelle catégorie...</SelectItem>
                  </SelectContent>
                </Select>
                {partnerForm.category === '__custom__' && (
                  <Input placeholder="Saisissez la nouvelle catégorie" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="mt-2" data-testid="partner-custom-category" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-heading uppercase text-slate-500">Responsable</Label>
                  <Input placeholder="Jean Dupont" value={partnerForm.contact_name} onChange={(e) => setPartnerForm(p => ({ ...p, contact_name: e.target.value }))} data-testid="partner-contact-input" />
                </div>
                <div>
                  <Label className="text-xs font-heading uppercase text-slate-500">Téléphone</Label>
                  <Input placeholder="+33 6 XX XX XX XX" value={partnerForm.phone} onChange={(e) => setPartnerForm(p => ({ ...p, phone: e.target.value }))} data-testid="partner-phone-input" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-heading uppercase text-slate-500">Email</Label>
                <Input placeholder="contact@entreprise.fr" value={partnerForm.email} onChange={(e) => setPartnerForm(p => ({ ...p, email: e.target.value }))} data-testid="partner-email-input" />
              </div>
              <div>
                <Label className="text-xs font-heading uppercase text-slate-500">Adresse</Label>
                <Input placeholder="12 Rue de la République, 69001 Lyon" value={partnerForm.address} onChange={(e) => setPartnerForm(p => ({ ...p, address: e.target.value }))} data-testid="partner-address-input" />
              </div>
              <div>
                <Label className="text-xs font-heading uppercase text-slate-500">Notes</Label>
                <Textarea placeholder="Informations supplémentaires..." rows={2} value={partnerForm.notes} onChange={(e) => setPartnerForm(p => ({ ...p, notes: e.target.value }))} data-testid="partner-notes-input" />
              </div>
              <Button onClick={handleSavePartner} disabled={partnerSaving} className="w-full btn-primary gap-2" data-testid="save-partner-btn">
                {partnerSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingPartner ? 'Enregistrer' : 'Ajouter le partenaire'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* =============== CREATE EVENT DIALOG =============== */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) { setCreateStep(1); setNewEvent({ title: '', description: '', sport_type: 'running', location: '', date: '', max_participants: 100, price: 25, distances: '', elevation_gain: '', image_url: '', requires_pps: false, requires_medical_cert: false, allows_teams: false, min_age: '', max_age: '', races: [], route_url: '', exact_address: '', regulations: '', themes: [], circuit_type: '', has_timer: null, website_url: '', facebook_url: '', instagram_url: '', twitter_url: '', youtube_url: '' }); setImagePreview(null); }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl uppercase">Créer un événement</DialogTitle>
              <DialogDescription className="sr-only">Formulaire de création</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-1 mt-5 mb-2">
              {[{ n: 1, label: 'Sport & Lieu' }, { n: 2, label: 'Configuration' }, { n: 3, label: 'Parcours & Visuels' }, { n: 4, label: 'Épreuves' }].map(s => (
                <div key={s.n} className="flex-1 flex flex-col items-center">
                  <div className={`w-full h-1.5 rounded-full transition-colors ${createStep >= s.n ? 'bg-brand' : 'bg-slate-200'}`} />
                  <span className={`text-[10px] font-heading uppercase tracking-wider mt-1.5 ${createStep >= s.n ? 'text-brand font-bold' : 'text-slate-400'}`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <AnimatePresence mode="wait">
            {createStep === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 space-y-5">
                <div><Label className="text-sm font-heading uppercase text-slate-500 mb-2 block">Nom *</Label><Input placeholder="Marathon de Lyon 2026" value={newEvent.title} onChange={(e) => setNewEvent(p => ({ ...p, title: e.target.value }))} className="h-12 text-lg font-heading" data-testid="event-title-input" /></div>
                <div><Label className="text-sm font-heading uppercase text-slate-500 mb-3 block">Type de sport *</Label>
                  <div className="grid grid-cols-6 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {sportOptions.map(opt => { const Icon = opt.icon; const sel = newEvent.sport_type === opt.value; return (
                      <motion.button key={opt.value} type="button" onClick={() => setNewEvent(p => ({ ...p, sport_type: opt.value }))} className={`p-3 border text-center transition-all ${sel ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-slate-200 hover:border-brand/50'}`} whileHover={{ y: -2 }}>
                        <Icon className={`w-7 h-7 mx-auto mb-1.5 ${sel ? 'text-brand' : 'text-slate-400'}`} /><span className={`font-heading text-[10px] uppercase tracking-wider font-bold block ${sel ? 'text-brand' : 'text-slate-500'}`}>{opt.label}</span>
                      </motion.button>
                    ); })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-sm font-heading uppercase text-slate-500 mb-2 block"><Calendar className="w-3.5 h-3.5 inline mr-1" />Date *</Label><DateTimePicker value={newEvent.date} onChange={(v) => setNewEvent(p => ({ ...p, date: v }))} placeholder="Choisir la date" testId="event-date-input" /></div>
                  <div><Label className="text-sm font-heading uppercase text-slate-500 mb-2 block"><MapPin className="w-3.5 h-3.5 inline mr-1" />Lieu *</Label><Input placeholder="Paris, France" value={newEvent.location} onChange={(e) => setNewEvent(p => ({ ...p, location: e.target.value }))} data-testid="event-location-input" /></div>
                </div>
                <div><Label className="text-sm font-heading uppercase text-slate-500 mb-2 block"><Navigation className="w-3.5 h-3.5 inline mr-1" />Adresse exacte</Label><Input placeholder="12 Quai Claude Bernard, 69007 Lyon" value={newEvent.exact_address} onChange={(e) => setNewEvent(p => ({ ...p, exact_address: e.target.value }))} /></div>
                <div className="flex justify-end pt-2"><Button onClick={() => { if (!newEvent.title || !newEvent.date || !newEvent.location) { toast.error('Remplissez titre, date et lieu'); return; } setCreateStep(2); }} className="btn-primary gap-2" data-testid="step-next-1">Suivant <ArrowRight className="w-4 h-4" /></Button></div>
              </motion.div>
            )}
            {createStep === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 border p-4"><Label className="text-sm font-heading uppercase text-slate-500 mb-2 flex items-center gap-1.5"><Users className="w-4 h-4 text-brand" />Participants max</Label><Input type="number" value={newEvent.max_participants} onChange={(e) => setNewEvent(p => ({ ...p, max_participants: parseInt(e.target.value) || 0 }))} className="text-lg font-heading font-bold border-0 bg-transparent p-0 h-auto focus-visible:ring-0" /></div>
                  <div className="bg-slate-50 border p-4"><Label className="text-sm font-heading uppercase text-slate-500 mb-2 flex items-center gap-1.5"><Euro className="w-4 h-4 text-brand" />Prix (€)</Label><Input type="number" value={newEvent.price} onChange={(e) => setNewEvent(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} className="text-lg font-heading font-bold border-0 bg-transparent p-0 h-auto focus-visible:ring-0" data-testid="event-price-input" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-sm font-heading uppercase text-slate-500 mb-2"><MapPin className="w-4 h-4 text-brand inline mr-1" />Distances</Label><Input placeholder="10km, 21km, 42km" value={newEvent.distances} onChange={(e) => setNewEvent(p => ({ ...p, distances: e.target.value }))} /></div>
                  <div><Label className="text-sm font-heading uppercase text-slate-500 mb-2"><Mountain className="w-4 h-4 text-brand inline mr-1" />Dénivelé (m)</Label><Input type="number" placeholder="500" value={newEvent.elevation_gain} onChange={(e) => setNewEvent(p => ({ ...p, elevation_gain: e.target.value }))} /></div>
                </div>
                <div className="flex items-center gap-6 p-4 bg-slate-50 border">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={newEvent.requires_pps} onChange={(e) => setNewEvent(p => ({ ...p, requires_pps: e.target.checked }))} className="w-4 h-4 accent-brand" /><span className="text-sm font-medium">PPS obligatoire</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={newEvent.allows_teams} onChange={(e) => setNewEvent(p => ({ ...p, allows_teams: e.target.checked }))} className="w-4 h-4 accent-brand" /><span className="text-sm font-medium">Équipes autorisées</span></label>
                </div>
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setCreateStep(1)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Retour</Button>
                  <Button onClick={() => setCreateStep(3)} className="btn-primary gap-2">Suivant <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </motion.div>
            )}
            {createStep === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 space-y-5">
                <div><Label className="text-sm font-heading uppercase text-slate-500 mb-3 block">Image</Label>
                  {(imagePreview || newEvent.image_url) ? (
                    <div className="relative border"><img src={imagePreview || newEvent.image_url} alt="Preview" className="w-full h-40 object-cover" /><button type="button" onClick={() => { setImagePreview(null); setNewEvent(p => ({ ...p, image_url: '' })); }} className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-1.5"><X className="w-4 h-4" /></button></div>
                  ) : (
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 hover:border-brand p-6 text-center cursor-pointer group">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-slate-300 group-hover:text-brand" />
                      <p className="font-heading font-bold text-xs uppercase text-slate-500 group-hover:text-brand">{uploadingImage ? 'Upload...' : 'Cliquez pour uploader'}</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(e) => handleImageUpload(e, false)} className="hidden" />
                  <div className="flex items-center gap-2 mt-2"><span className="text-xs text-slate-400">ou</span><Input placeholder="URL de l'image" value={newEvent.image_url} onChange={(e) => { setNewEvent(p => ({ ...p, image_url: e.target.value })); setImagePreview(null); }} className="flex-1 text-sm" /></div>
                </div>
                <div><Label className="text-sm font-heading uppercase text-slate-500 mb-2 block">Description</Label><Textarea placeholder="Décrivez votre événement..." rows={3} value={newEvent.description} onChange={(e) => setNewEvent(p => ({ ...p, description: e.target.value }))} /></div>
                <div><Label className="text-sm font-heading uppercase text-slate-500 mb-2"><FileText className="w-4 h-4 text-brand inline mr-1" />Règlement</Label><Textarea placeholder="Conditions de participation..." rows={3} value={newEvent.regulations} onChange={(e) => setNewEvent(p => ({ ...p, regulations: e.target.value }))} /></div>
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setCreateStep(2)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Retour</Button>
                  <div className="flex gap-2">
                    <Button onClick={() => setCreateStep(4)} variant="outline" className="gap-2">Épreuves <ArrowRight className="w-4 h-4" /></Button>
                    <Button onClick={handleCreateEvent} disabled={creating} className="btn-primary gap-2">{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Créer</Button>
                  </div>
                </div>
              </motion.div>
            )}
            {createStep === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div><Label className="text-sm font-heading uppercase text-slate-500 block">Épreuves</Label><p className="text-xs text-slate-400">Optionnel — tarifs par distance</p></div>
                  <Button variant="outline" size="sm" onClick={() => addRace(false)} className="gap-1"><Plus className="w-4 h-4" /> Ajouter</Button>
                </div>
                {newEvent.races?.length > 0 ? (
                  <div className="space-y-3">{newEvent.races.map((race, i) => (
                    <div key={i} className="flex gap-2 items-start p-4 bg-slate-50 border">
                      <div className="flex-1">
                        <Input placeholder="Nom (ex: 10km)" value={race.name} onChange={(e) => updateRace(i, 'name', e.target.value)} className="mb-2 font-heading font-bold" />
                        <div className="grid grid-cols-3 gap-2">
                          <div><Label className="text-[10px] font-heading uppercase text-slate-400">Prix (€)</Label><Input type="number" value={race.price} onChange={(e) => updateRace(i, 'price', parseFloat(e.target.value))} /></div>
                          <div><Label className="text-[10px] font-heading uppercase text-slate-400">Places</Label><Input type="number" value={race.max_participants} onChange={(e) => updateRace(i, 'max_participants', parseInt(e.target.value))} /></div>
                          <div><Label className="text-[10px] font-heading uppercase text-slate-400">Km</Label><Input type="number" value={race.distance_km} onChange={(e) => updateRace(i, 'distance_km', e.target.value)} /></div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeRace(i)} className="text-red-500"><X className="w-4 h-4" /></Button>
                    </div>
                  ))}</div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 border border-dashed"><Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" /><p className="text-sm text-slate-500">Aucune épreuve</p></div>
                )}
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setCreateStep(3)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Retour</Button>
                  <Button onClick={handleCreateEvent} disabled={creating} className="btn-primary gap-2">{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Créer</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading text-xl uppercase">Modifier l'événement</DialogTitle><DialogDescription className="sr-only">Modification</DialogDescription></DialogHeader>
          {editingEvent && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Titre *</Label><Input value={editingEvent.title} onChange={(e) => setEditingEvent(p => ({ ...p, title: e.target.value }))} /></div>
                <div><Label>Type</Label><Select value={editingEvent.sport_type} onValueChange={(v) => setEditingEvent(p => ({ ...p, sport_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sportOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Date</Label><DateTimePicker value={editingEvent.date ? new Date(editingEvent.date).toISOString().slice(0, 16) : ''} onChange={(v) => setEditingEvent(p => ({ ...p, date: new Date(v).toISOString() }))} placeholder="Modifier" /></div>
                <div><Label>Participants max</Label><Input type="number" value={editingEvent.max_participants} onChange={(e) => setEditingEvent(p => ({ ...p, max_participants: parseInt(e.target.value) }))} /></div>
                <div className="col-span-2"><Label>Lieu</Label><Input value={editingEvent.location} onChange={(e) => setEditingEvent(p => ({ ...p, location: e.target.value }))} /></div>
                <div><Label>Prix (€)</Label><Input type="number" value={editingEvent.price} onChange={(e) => setEditingEvent(p => ({ ...p, price: parseFloat(e.target.value) }))} /></div>
                <div className="col-span-2"><Label>Image</Label>
                  <div className="mt-2">
                    {(imagePreview || editingEvent.image_url) && <div className="relative mb-3 inline-block"><img src={imagePreview || editingEvent.image_url} alt="Preview" className="h-32 w-auto object-cover border" /><button onClick={() => { setImagePreview(null); setEditingEvent(p => ({ ...p, image_url: '' })); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X className="w-4 h-4" /></button></div>}
                    <div className="flex gap-2"><input ref={editFileInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="hidden" /><Button variant="outline" onClick={() => editFileInputRef.current?.click()} disabled={uploadingImage}>{uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}Upload</Button><Input placeholder="URL" value={editingEvent.image_url || ''} onChange={(e) => { setEditingEvent(p => ({ ...p, image_url: e.target.value })); setImagePreview(null); }} className="flex-1" /></div>
                  </div>
                </div>
                <div className="col-span-2"><Label>Description</Label><Textarea rows={3} value={editingEvent.description} onChange={(e) => setEditingEvent(p => ({ ...p, description: e.target.value }))} /></div>
                <div className="col-span-2 border-t pt-4">
                  <div className="flex items-center justify-between mb-3"><Label className="text-base font-bold">Épreuves</Label><Button variant="outline" size="sm" onClick={() => addRace(true)}><Plus className="w-4 h-4 mr-1" />Ajouter</Button></div>
                  {editingEvent.races?.length > 0 ? (
                    <div className="space-y-3">{editingEvent.races.map((race, i) => (
                      <div key={i} className="flex gap-2 items-start p-3 bg-slate-50">
                        <div className="flex-1"><Input placeholder="Nom" value={race.name} onChange={(e) => updateRace(i, 'name', e.target.value, true)} className="mb-2" />
                          <div className="grid grid-cols-3 gap-2"><div><Label className="text-xs">Prix</Label><Input type="number" value={race.price} onChange={(e) => updateRace(i, 'price', parseFloat(e.target.value), true)} /></div><div><Label className="text-xs">Places</Label><Input type="number" value={race.max_participants} onChange={(e) => updateRace(i, 'max_participants', parseInt(e.target.value), true)} /></div><div><Label className="text-xs">Km</Label><Input type="number" value={race.distance_km || ''} onChange={(e) => updateRace(i, 'distance_km', e.target.value, true)} /></div></div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeRace(i, true)} className="text-red-500"><X className="w-4 h-4" /></Button>
                      </div>
                    ))}</div>
                  ) : <p className="text-sm text-slate-500 text-center py-4 bg-slate-50">Aucune épreuve</p>}
                </div>
              </div>
              <Button onClick={handleEditEvent} disabled={editing} className="w-full btn-primary">{editing ? 'Mise à jour...' : 'Enregistrer'}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizerDashboard;
