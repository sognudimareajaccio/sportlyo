import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar, Users, Euro, TrendingUp, Plus,
  Eye, Edit, Trash2, ChevronRight, Building2, QrCode, Scan,
  Upload, Image, X, Loader2, Download, FileText, MapPin,
  Bike, Footprints, Medal, Car, ArrowRight, ArrowLeft, Mountain, Clock, Check,
  Route, Navigation, Globe, Facebook, Instagram, Youtube, Twitter, Tag, Timer,
  Target, Wind, Flag, CircleDot, Dumbbell, Swords, BarChart3,
  Search, Share2, MessageSquare, Mail, Shield, Send, Filter,
  CheckCircle, Package, Shirt, ArrowUp, ArrowDown, Home, Trophy, ExternalLink,
  Handshake, Phone, MapPinned, Heart, Star, Award, Globe2, Lock, ChevronLeft,
  ShoppingBag, Palette, GripVertical, FileDown, ToggleLeft, ToggleRight, Radio,
  HeartHandshake
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
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
import OrganizerSmsSection from '../components/organizer/OrganizerSmsSection';
import OrganizerAnalyticsSection from '../components/organizer/OrganizerAnalyticsSection';
import {
  HubSection, EventsSection, ParticipantsSection, GaugesSection,
  CheckinSection, FinancesSection, CorrespondancesSection,
  ShareSection, ChronometrageSection, ResultsSection,
  PartnersSection, SponsorsSection, BookingsSection, BoutiqueSection,
  VolunteersSection
} from '../components/organizer';

const sportOptions = [
  { value: 'cycling', label: 'Cyclisme', icon: Bike },
  { value: 'running', label: 'Course a pied', icon: Footprints },
  { value: 'triathlon', label: 'Triathlon', icon: Medal },
  { value: 'walking', label: 'Marche', icon: Footprints },
  { value: 'motorsport', label: 'Sports Mecaniques', icon: Car },
  { value: 'rallye', label: 'Rallye Voitures', icon: Car },
  { value: 'vtt', label: 'VTT', icon: Mountain },
  { value: 'bmx', label: 'BMX', icon: Bike },
  { value: 'cyclocross', label: 'Cyclo-cross', icon: Bike },
  { value: 'racquet', label: 'Sports de raquette', icon: Target },
  { value: 'archery', label: 'Tir a l\'arc', icon: Target },
  { value: 'kitesurf', label: 'Kitesurf', icon: Wind },
  { value: 'golf', label: 'Golf', icon: Flag },
  { value: 'petanque', label: 'Petanque', icon: CircleDot },
  { value: 'billard', label: 'Billard', icon: CircleDot },
  { value: 'bowling', label: 'Bowling', icon: CircleDot },
  { value: 'crossfit', label: 'CrossFit', icon: Dumbbell },
  { value: 'combat', label: 'Sports de combat', icon: Swords }
];

const SectionHeader = ({ title, onBack }) => (
  <div className="flex items-center gap-3 mb-6">
    <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-asphalt text-white font-heading text-xs uppercase tracking-wider hover:bg-asphalt/80 transition-colors" data-testid="back-to-hub-btn">
      <ArrowLeft className="w-4 h-4" /> Retour au tableau de bord
    </button>
    <h2 className="font-heading text-2xl font-bold uppercase">{title}</h2>
  </div>
);

const OrganizerDashboard = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  // Core state
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('hub');

  // Event creation / edit
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [createStep, setCreateStep] = useState(1);
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', sport_type: 'running', location: '',
    date: '', max_participants: 100, price: 25, distances: '',
    elevation_gain: '', image_url: '', requires_pps: false,
    requires_medical_cert: false, allows_teams: false, min_age: '', max_age: '',
    races: [], route_url: '', exact_address: '', regulations: '',
    regulations_pdf_url: '', published: false, provided_items: ['tshirt'],
    is_free: false, sponsor_logos: [],
    themes: [], circuit_type: '', has_timer: null,
    custom_provided_item: '',
    website_url: '', facebook_url: '', instagram_url: '', twitter_url: '', youtube_url: ''
  });
  const [upgradeData, setUpgradeData] = useState({ company_name: '', description: '', iban: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  // Participants
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantFilter, setParticipantFilter] = useState('all');
  const [participantSearch, setParticipantSearch] = useState('');

  // Check-in
  const [checkinSearch, setCheckinSearch] = useState('');
  const [checkinFilter, setCheckinFilter] = useState('all');
  const [checkinParticipants, setCheckinParticipants] = useState([]);
  const [checkinLoading, setCheckinLoading] = useState(false);

  // Correspondances
  const [correspondances, setCorrespondances] = useState([]);
  const [corrLoading, setCorrLoading] = useState(false);
  const [showNewCorr, setShowNewCorr] = useState(false);
  const [corrForm, setCorrForm] = useState({ subject: '', message: '', event_id: 'all', send_email: false, recipient_ids: 'all' });
  const [corrSending, setCorrSending] = useState(false);

  // Chronometrage
  const [chronoEventId, setChronoEventId] = useState('');

  // Partners
  const [partners, setPartners] = useState([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnerCategories, setPartnerCategories] = useState([]);
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [showPartnerDialog, setShowPartnerDialog] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [partnerForm, setPartnerForm] = useState({ company_name: '', contact_name: '', phone: '', email: '', address: '', category: '', notes: '' });
  const [partnerSaving, setPartnerSaving] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  // Sponsors
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

  // Boutique
  const [shopProducts, setShopProducts] = useState([]);
  const [shopOrders, setShopOrders] = useState([]);
  const [shopStats, setShopStats] = useState({});
  const [shopLoading, setShopLoading] = useState(false);
  const [shopTab, setShopTab] = useState('catalogue');
  const [orgCardImageIndex, setOrgCardImageIndex] = useState({});
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '', description: '', category: 'Textile', price: '', organizer_commission: 5,
    image_url: '', sizes: [], colors: [], stock: 100, event_id: '', active: true
  });
  const [productSaving, setProductSaving] = useState(false);
  const [shopEventFilter, setShopEventFilter] = useState('all');
  const [providerCatalog, setProviderCatalog] = useState([]);
  const [providerConvos, setProviderConvos] = useState([]);
  const [providerChat, setProviderChat] = useState(null);
  const [providerMessages, setProviderMessages] = useState([]);
  const [providerNewMsg, setProviderNewMsg] = useState('');
  const [addingProviderProduct, setAddingProviderProduct] = useState(null);
  const [providerCommission, setProviderCommission] = useState(5);
  const [providerEventId, setProviderEventId] = useState('');
  const [orgLogo, setOrgLogo] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);

  // Bookings
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [bookingForm, setBookingForm] = useState({ company_name: '', contact_name: '', email: '', phone: '', team_count: 1, members_per_team: 5, event_id: '', price_per_team: '', notes: '' });
  const [bookingSearch, setBookingSearch] = useState('');
  const [providersList, setProvidersList] = useState([]);

  // Revenue
  const [revenueData, setRevenueData] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(false);

  // Volunteers
  const [volunteers, setVolunteers] = useState([]);
  const [volunteersLoading, setVolunteersLoading] = useState(false);
  const [volunteerEventFilter, setVolunteerEventFilter] = useState('all');
  const [volunteerSearch, setVolunteerSearch] = useState('');
  const [showVolunteerDialog, setShowVolunteerDialog] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState(null);
  const [volunteerForm, setVolunteerForm] = useState({ first_name: '', last_name: '', phone: '', email: '', role_assigned: '', event_id: '', notes: '' });
  const [volunteerSaving, setVolunteerSaving] = useState(false);

  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';

  // ==================== DATA FETCHING ====================
  useEffect(() => {
    if (isOrganizer) fetchEvents();
    else setLoading(false);
  }, [isOrganizer]);

  const fetchEvents = async () => {
    try { const res = await eventsApi.getOrganizerEvents(); setEvents(res.data.events); }
    catch (error) { console.error('Error fetching events:', error); }
    finally { setLoading(false); }
  };

  const fetchParticipants = async (eventId) => {
    setParticipantsLoading(true);
    try {
      const url = eventId && eventId !== 'all' ? `/organizer/all-participants?event_id=${eventId}` : '/organizer/all-participants';
      const res = await api.get(url); setParticipants(res.data.participants);
    } catch { toast.error('Erreur chargement participants'); }
    finally { setParticipantsLoading(false); }
  };

  const fetchCheckinParticipants = async (eventId) => {
    setCheckinLoading(true);
    try {
      const url = eventId && eventId !== 'all' ? `/organizer/all-participants?event_id=${eventId}` : '/organizer/all-participants';
      const res = await api.get(url); setCheckinParticipants(res.data.participants);
    } catch { toast.error('Erreur chargement'); }
    finally { setCheckinLoading(false); }
  };

  const fetchCorrespondances = async () => {
    setCorrLoading(true);
    try { const res = await api.get('/organizer/correspondances'); setCorrespondances(res.data.correspondances); }
    catch { toast.error('Erreur chargement correspondances'); }
    finally { setCorrLoading(false); }
  };

  const fetchPartners = async (cat) => {
    setPartnersLoading(true);
    try {
      const url = cat && cat !== 'all' ? `/organizer/partners?category=${encodeURIComponent(cat)}` : '/organizer/partners';
      const res = await api.get(url); setPartners(res.data.partners);
      const catRes = await api.get('/organizer/partners/categories'); setPartnerCategories(catRes.data.categories);
    } catch { toast.error('Erreur chargement partenaires'); }
    finally { setPartnersLoading(false); }
  };

  const fetchSponsors = async (typeFilter) => {
    setSponsorsLoading(true);
    try {
      const url = typeFilter && typeFilter !== 'all' ? `/organizer/sponsors?sponsor_type=${encodeURIComponent(typeFilter)}` : '/organizer/sponsors';
      const res = await api.get(url); setSponsors(res.data.sponsors);
    } catch { toast.error('Erreur chargement sponsors'); }
    finally { setSponsorsLoading(false); }
  };

  const fetchShopData = async (evtFilter) => {
    setShopLoading(true);
    try {
      const pUrl = evtFilter && evtFilter !== 'all' ? `/organizer/products?event_id=${evtFilter}` : '/organizer/products';
      const [pRes, oRes, sRes] = await Promise.all([api.get(pUrl), api.get('/organizer/orders'), api.get('/organizer/shop-stats')]);
      setShopProducts(pRes.data.products); setShopOrders(oRes.data.orders); setShopStats(sRes.data);
    } catch { toast.error('Erreur chargement boutique'); }
    finally { setShopLoading(false); }
  };

  const fetchOrgLogo = async () => { try { const res = await api.get('/organizer/logo'); setOrgLogo(res.data.logo_url || ''); } catch {} };
  const fetchProvidersList = async () => { try { const res = await api.get('/providers/list'); setProvidersList(res.data.providers || []); } catch {} };
  const fetchProviderCatalog = async () => { try { const res = await api.get('/providers/catalog'); setProviderCatalog(res.data.products || []); } catch (e) { console.error(e); } };
  const fetchProviderConvos = async () => { try { const res = await api.get('/provider/conversations'); setProviderConvos(res.data.conversations || []); } catch (e) { console.error(e); } };
  const fetchBookings = async () => { setBookingsLoading(true); try { const res = await api.get('/organizer/bookings'); setBookings(res.data.bookings || []); } catch { toast.error('Erreur'); } finally { setBookingsLoading(false); } };

  const fetchVolunteers = async (evtFilter) => {
    setVolunteersLoading(true);
    try {
      const url = evtFilter && evtFilter !== 'all' ? `/organizer/volunteers?event_id=${evtFilter}` : '/organizer/volunteers';
      const res = await api.get(url); setVolunteers(res.data.volunteers || []);
    } catch { toast.error('Erreur chargement benevoles'); }
    finally { setVolunteersLoading(false); }
  };

  const fetchRevenueData = async () => {
    setRevenueLoading(true);
    try {
      const res = await api.get('/organizer/revenue-breakdown');
      setRevenueData(res.data);
    } catch { toast.error('Erreur chargement revenus'); }
    finally { setRevenueLoading(false); }
  };

  // ==================== SECTION NAVIGATION ====================
  const handleSectionChange = (section) => {
    setActiveSection(section);
    if (section === 'participants') fetchParticipants(participantFilter);
    if (section === 'checkin') fetchCheckinParticipants(checkinFilter);
    if (section === 'correspondances') fetchCorrespondances();
    if (section === 'partners') fetchPartners();
    if (section === 'sponsors') fetchSponsors();
    if (section === 'boutique') { fetchShopData(); fetchProviderCatalog(); fetchProviderConvos(); fetchOrgLogo(); fetchProvidersList(); }
    if (section === 'bookings') fetchBookings();
    if (section === 'volunteers') fetchVolunteers();
    if (section === 'finances') fetchRevenueData();
  };

  // ==================== HANDLERS ====================
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setLogoUploading(true);
    try {
      const formData = new FormData(); formData.append('file', file);
      const uploadRes = await api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.post('/organizer/logo', { logo_url: uploadRes.data.url });
      setOrgLogo(uploadRes.data.url); toast.success('Logo enregistre !');
    } catch { toast.error('Erreur lors de l\'upload'); }
    finally { setLogoUploading(false); }
  };

  const openProviderChat = async (userId) => {
    setProviderChat(userId);
    const res = await api.get(`/provider/messages/${userId}`);
    setProviderMessages(res.data.messages || []);
  };

  const sendProviderMsg = async () => {
    if (!providerNewMsg.trim() || !providerChat) return;
    await api.post('/provider/messages', { recipient_id: providerChat, content: providerNewMsg });
    setProviderNewMsg('');
    const res = await api.get(`/provider/messages/${providerChat}`);
    setProviderMessages(res.data.messages || []);
  };

  const handleAddProviderProduct = async (pp) => {
    if (!providerEventId) { toast.error('Selectionnez un evenement'); return; }
    try {
      await api.post('/organizer/add-provider-product', { provider_product_id: pp.product_id, event_id: providerEventId, organizer_commission: providerCommission });
      toast.success(`"${pp.name}" ajoute a l'evenement`); setAddingProviderProduct(null); fetchShopData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const handleSavePartner = async () => {
    if (!partnerForm.company_name) { toast.error('Nom de l\'entreprise requis'); return; }
    setPartnerSaving(true);
    const finalCategory = partnerForm.category === '__custom__' ? customCategory : partnerForm.category;
    const payload = { ...partnerForm, category: finalCategory || 'Autre' };
    try {
      if (editingPartner) { await api.put(`/organizer/partners/${editingPartner.partner_id}`, payload); toast.success('Partenaire mis a jour'); }
      else { await api.post('/organizer/partners', payload); toast.success('Partenaire ajoute'); }
      setShowPartnerDialog(false); setEditingPartner(null);
      setPartnerForm({ company_name: '', contact_name: '', phone: '', email: '', address: '', category: '', notes: '' });
      setCustomCategory(''); fetchPartners(partnerFilter !== 'all' ? partnerFilter : undefined);
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setPartnerSaving(false); }
  };

  const handleDeletePartner = async (partnerId) => {
    if (!confirm('Supprimer ce partenaire ?')) return;
    try { await api.delete(`/organizer/partners/${partnerId}`); toast.success('Partenaire supprime'); fetchPartners(partnerFilter !== 'all' ? partnerFilter : undefined); }
    catch { toast.error('Erreur suppression'); }
  };

  const openEditPartner = (partner) => {
    setEditingPartner(partner);
    setPartnerForm({ company_name: partner.company_name, contact_name: partner.contact_name, phone: partner.phone, email: partner.email, address: partner.address, category: partner.category, notes: partner.notes || '' });
    setShowPartnerDialog(true);
  };

  const openNewPartner = () => {
    setEditingPartner(null);
    setPartnerForm({ company_name: '', contact_name: '', phone: '', email: '', address: '', category: '', notes: '' });
    setCustomCategory(''); setShowPartnerDialog(true);
  };

  const handleSaveSponsor = async () => {
    if (!sponsorForm.name) { toast.error('Nom requis'); return; }
    setSponsorSaving(true);
    const payload = { ...sponsorForm, amount: parseFloat(sponsorForm.amount) || 0 };
    try {
      if (editingSponsor) { await api.put(`/organizer/sponsors/${editingSponsor.sponsor_id}`, payload); toast.success('Sponsor mis a jour'); }
      else { await api.post('/organizer/sponsors', payload); toast.success('Sponsor ajoute'); }
      setShowSponsorDialog(false); setEditingSponsor(null);
      setSponsorForm({ name: '', sponsor_type: 'Sponsor', tier: 'Bronze', contact_name: '', phone: '', email: '', address: '', website: '', logo_url: '', amount: '', currency: 'EUR', contribution_type: 'Financier', contribution_details: '', counterparts: '', contract_start: '', contract_end: '', event_id: '', notes: '', status: 'Actif' });
      fetchSponsors(sponsorFilter !== 'all' ? sponsorFilter : undefined);
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setSponsorSaving(false); }
  };

  const handleDeleteSponsor = async (id) => {
    if (!confirm('Supprimer ce sponsor ?')) return;
    try { await api.delete(`/organizer/sponsors/${id}`); toast.success('Sponsor supprime'); fetchSponsors(sponsorFilter !== 'all' ? sponsorFilter : undefined); }
    catch { toast.error('Erreur suppression'); }
  };

  const handleConfirmPayment = async (sponsorId) => {
    if (!confirm('Confirmer que le paiement a ete recu ? Un recu fiscal sera genere automatiquement.')) return;
    try {
      const res = await api.post(`/payments/confirm-payment/${sponsorId}`);
      toast.success('Paiement confirme ! Recu fiscal genere.');
      fetchSponsors(sponsorFilter !== 'all' ? sponsorFilter : undefined);
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur confirmation'); }
  };

  const handleDownloadReceipt = async (sponsorId) => {
    try {
      const res = await api.get(`/payments/receipt/${sponsorId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a'); link.href = url;
      link.download = `recu_fiscal_${sponsorId}.pdf`; link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Recu fiscal telecharge !');
    } catch { toast.error('Recu fiscal non disponible'); }
  };

  const openEditSponsor = (s) => {
    setEditingSponsor(s);
    setSponsorForm({ name: s.name, sponsor_type: s.sponsor_type, tier: s.tier, contact_name: s.contact_name, phone: s.phone, email: s.email, address: s.address, website: s.website, logo_url: s.logo_url, amount: s.amount || '', currency: s.currency || 'EUR', contribution_type: s.contribution_type, contribution_details: s.contribution_details, counterparts: s.counterparts, contract_start: s.contract_start, contract_end: s.contract_end, event_id: s.event_id, notes: s.notes || '', status: s.status || 'Actif' });
    setShowSponsorDialog(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price) { toast.error('Nom et prix requis'); return; }
    setProductSaving(true);
    const payload = { ...productForm, price: parseFloat(productForm.price), organizer_commission: parseFloat(productForm.organizer_commission), stock: parseInt(productForm.stock), event_id: productForm.event_id === 'none' ? '' : productForm.event_id };
    try {
      if (editingProduct) { await api.put(`/organizer/products/${editingProduct.product_id}`, payload); toast.success('Produit mis a jour'); }
      else { await api.post('/organizer/products', payload); toast.success('Produit ajoute'); }
      setShowProductDialog(false); setEditingProduct(null);
      setProductForm({ name: '', description: '', category: 'Textile', price: '', organizer_commission: 5, image_url: '', sizes: [], colors: [], stock: 100, event_id: '', active: true });
      fetchShopData(shopEventFilter !== 'all' ? shopEventFilter : undefined);
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setProductSaving(false); }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try { await api.delete(`/organizer/products/${id}`); toast.success('Produit supprime'); fetchShopData(); }
    catch { toast.error('Erreur'); }
  };

  const handleSaveBooking = async () => {
    if (!bookingForm.company_name) { toast.error('Nom entreprise requis'); return; }
    try {
      if (editingBooking) { await api.put(`/organizer/bookings/${editingBooking.booking_id}`, bookingForm); toast.success('Reservation modifiee'); }
      else { await api.post('/organizer/bookings', bookingForm); toast.success('Reservation ajoutee'); }
      setShowBookingDialog(false); setEditingBooking(null); fetchBookings();
    } catch { toast.error('Erreur'); }
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm('Supprimer cette reservation ?')) return;
    await api.delete(`/organizer/bookings/${id}`); toast.success('Supprimee'); fetchBookings();
  };

  // Volunteers handlers
  const handleSaveVolunteer = async () => {
    if (!volunteerForm.first_name || !volunteerForm.last_name || !volunteerForm.phone || !volunteerForm.role_assigned || !volunteerForm.event_id) {
      toast.error('Prenom, nom, telephone, fonction et evenement requis'); return;
    }
    setVolunteerSaving(true);
    try {
      if (editingVolunteer) {
        await api.put(`/organizer/volunteers/${editingVolunteer.volunteer_id}`, volunteerForm);
        toast.success('Benevole mis a jour');
      } else {
        await api.post('/organizer/volunteers', volunteerForm);
        toast.success('Benevole ajoute');
      }
      setShowVolunteerDialog(false); setEditingVolunteer(null);
      setVolunteerForm({ first_name: '', last_name: '', phone: '', email: '', role_assigned: '', event_id: '', notes: '' });
      fetchVolunteers(volunteerEventFilter !== 'all' ? volunteerEventFilter : undefined);
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setVolunteerSaving(false); }
  };

  const handleDeleteVolunteer = async (id) => {
    if (!window.confirm('Supprimer ce benevole ?')) return;
    try { await api.delete(`/organizer/volunteers/${id}`); toast.success('Benevole supprime'); fetchVolunteers(volunteerEventFilter !== 'all' ? volunteerEventFilter : undefined); }
    catch { toast.error('Erreur suppression'); }
  };

  const openEditVolunteer = (v) => {
    setEditingVolunteer(v);
    setVolunteerForm({ first_name: v.first_name, last_name: v.last_name, phone: v.phone, email: v.email || '', role_assigned: v.role_assigned, event_id: v.event_id, notes: v.notes || '' });
    setShowVolunteerDialog(true);
  };

  const openNewVolunteer = () => {
    setEditingVolunteer(null);
    setVolunteerForm({ first_name: '', last_name: '', phone: '', email: '', role_assigned: '', event_id: '', notes: '' });
    setShowVolunteerDialog(true);
  };

  const generatePaymentLink = async (type, sourceId, amount, description) => {
    try {
      const res = await api.post('/payments/create-link', { type, source_id: sourceId, amount, description });
      toast.success('Lien de paiement genere !');
      if (type === 'sponsor') fetchSponsors(sponsorFilter !== 'all' ? sponsorFilter : undefined);
      if (type === 'booking') fetchBookings();
      return res.data.payment_url;
    } catch { toast.error('Erreur generation du lien'); return null; }
  };

  const handleMarkCollected = async (registrationId) => {
    try { await api.post('/organizer/checkin/mark-collected', { registration_id: registrationId }); toast.success('Kit recupere !'); fetchCheckinParticipants(checkinFilter); }
    catch { toast.error('Erreur'); }
  };

  const handleSendCorrespondance = async () => {
    if (!corrForm.message) { toast.error('Message requis'); return; }
    setCorrSending(true);
    try {
      const payload = { subject: corrForm.subject, message: corrForm.message, event_id: corrForm.event_id !== 'all' ? corrForm.event_id : events[0]?.event_id, recipient_ids: corrForm.recipient_ids, send_email: corrForm.send_email };
      const res = await api.post('/organizer/correspondances/send', payload);
      toast.success(res.data.message); setShowNewCorr(false);
      setCorrForm({ subject: '', message: '', event_id: 'all', send_email: false, recipient_ids: 'all' }); fetchCorrespondances();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur envoi'); }
    finally { setCorrSending(false); }
  };

  const handleTogglePublish = async (event) => {
    try { await api.put(`/events/${event.event_id}/publish`, { published: !event.published }); fetchEvents(); toast.success(event.published ? 'Evenement depublie' : 'Evenement publie !'); }
    catch { toast.error('Erreur'); }
  };

  // Event CRUD
  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.location) { toast.error('Veuillez remplir tous les champs obligatoires'); return; }
    setCreating(true);
    try {
      let eventDate; try { eventDate = new Date(newEvent.date).toISOString(); } catch { toast.error('Date invalide'); setCreating(false); return; }
      const eventData = { ...newEvent, date: eventDate, distances: (newEvent.distances || '').split(',').map(d => d.trim()).filter(Boolean), elevation_gain: newEvent.elevation_gain ? parseInt(newEvent.elevation_gain) : null, min_age: newEvent.min_age ? parseInt(newEvent.min_age) : null, max_age: newEvent.max_age ? parseInt(newEvent.max_age) : null, provides_tshirt: (newEvent.provided_items || []).includes('tshirt'), provided_items: newEvent.provided_items || [], is_free: newEvent.is_free || false, sponsor_logos: newEvent.sponsor_logos || [] };
      delete eventData.custom_provided_item;
      await eventsApi.create(eventData); toast.success('Evenement cree !');
      setShowCreateDialog(false); setCreateStep(1);
      setNewEvent({ title: '', description: '', sport_type: 'running', location: '', date: '', max_participants: 100, price: 25, distances: '', elevation_gain: '', image_url: '', requires_pps: false, requires_medical_cert: false, allows_teams: false, min_age: '', max_age: '', races: [], route_url: '', exact_address: '', regulations: '', regulations_pdf_url: '', published: false, provided_items: ['tshirt'], custom_provided_item: '', is_free: false, sponsor_logos: [], themes: [], circuit_type: '', has_timer: null, website_url: '', facebook_url: '', instagram_url: '', twitter_url: '', youtube_url: '' });
      setImagePreview(null); fetchEvents();
    } catch (error) { toast.error(error.response?.data?.detail || 'Erreur creation'); }
    finally { setCreating(false); }
  };

  const openEditDialog = (event) => { setEditingEvent(event); setImagePreview(event.image_url || null); setShowEditDialog(true); };

  const handleEditEvent = async () => {
    if (!editingEvent.title || !editingEvent.location) { toast.error('Champs obligatoires'); return; }
    setEditing(true);
    try {
      const updateData = { title: editingEvent.title, description: editingEvent.description, sport_type: editingEvent.sport_type, date: editingEvent.date, location: editingEvent.location, max_participants: editingEvent.max_participants, price: editingEvent.price, distances: editingEvent.distances, elevation_gain: editingEvent.elevation_gain, image_url: editingEvent.image_url, requires_pps: editingEvent.requires_pps, races: editingEvent.races || [], regulations_pdf_url: editingEvent.regulations_pdf_url || '', published: editingEvent.published, provided_items: editingEvent.provided_items || [], provides_tshirt: (editingEvent.provided_items || []).includes('tshirt'), is_free: editingEvent.is_free || false, sponsor_logos: editingEvent.sponsor_logos || [] };
      await eventsApi.update(editingEvent.event_id, updateData); toast.success('Evenement mis a jour !');
      setShowEditDialog(false); setEditingEvent(null); setImagePreview(null); fetchEvents();
    } catch (error) { toast.error(error.response?.data?.detail || 'Erreur mise a jour'); }
    finally { setEditing(false); }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Annuler cet evenement ?')) return;
    try { await eventsApi.delete(eventId); toast.success('Evenement annule'); fetchEvents(); }
    catch { toast.error('Erreur annulation'); }
  };

  const addRace = (isEdit = false) => {
    const nr = { name: '', price: 25, max_participants: 100, distance_km: '', elevation_gain: '', description: '' };
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
  const moveRace = (i, direction, isEdit = false) => {
    const swap = (arr, a, b) => { const copy = [...arr]; [copy[a], copy[b]] = [copy[b], copy[a]]; return copy; };
    const target = direction === 'up' ? i - 1 : i + 1;
    if (isEdit && editingEvent) setEditingEvent(p => ({ ...p, races: swap(p.races, i, target) }));
    else setNewEvent(p => ({ ...p, races: swap(p.races, i, target) }));
  };

  const handleRegulationUpload = async (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) { toast.error('Fichier PDF requis'); return; }
    try {
      const formData = new FormData(); formData.append('file', file);
      const response = await api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = `${process.env.REACT_APP_BACKEND_URL}${response.data.url}`;
      if (isEdit) setEditingEvent(p => ({ ...p, regulations_pdf_url: url }));
      else setNewEvent(p => ({ ...p, regulations_pdf_url: url }));
      toast.success('Reglement PDF telecharge');
    } catch { toast.error('Erreur upload'); }
  };

  const handleImageUpload = async (e, isEdit = false) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) { toast.error('Format non supporte'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return; }
    const reader = new FileReader(); reader.onload = (e) => setImagePreview(e.target.result); reader.readAsDataURL(file);
    setUploadingImage(true);
    try {
      const formData = new FormData(); formData.append('file', file);
      const response = await api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const imageUrl = `${process.env.REACT_APP_BACKEND_URL}${response.data.url}`;
      if (isEdit) setEditingEvent(p => ({ ...p, image_url: imageUrl }));
      else setNewEvent(p => ({ ...p, image_url: imageUrl }));
      toast.success('Image uploadee !');
    } catch { toast.error('Erreur upload'); setImagePreview(isEdit ? editingEvent?.image_url : null); }
    finally { setUploadingImage(false); }
  };

  const handleUpgradeToOrganizer = async () => {
    try { await authApi.upgradeRole({ role: 'organizer', ...upgradeData }); updateUser({ role: 'organizer' }); toast.success('Vous etes maintenant organisateur !'); setShowUpgradeDialog(false); }
    catch { toast.error('Erreur mise a niveau'); }
  };

  const handleExportCSV = async (eventId) => {
    try {
      const params = new URLSearchParams({ format: 'csv' }); if (eventId && eventId !== 'all') params.append('event_id', eventId);
      const res = await api.get(`/organizer/payments/export?${params}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `finances_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); toast.success('CSV telecharge');
    } catch { toast.error('Erreur export'); }
  };

  const handleExportPDF = async (eventId) => {
    try {
      const params = new URLSearchParams({ format: 'pdf' }); if (eventId && eventId !== 'all') params.append('event_id', eventId);
      const res = await api.get(`/organizer/payments/export?${params}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' }); const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `finances_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); toast.success('PDF telecharge');
    } catch { toast.error('Erreur export'); }
  };

  // ==================== COMPUTED VALUES ====================
  const totalParticipants = events.reduce((s, e) => s + e.current_participants, 0);
  const totalRevenue = events.reduce((s, e) => s + (e.current_participants * e.price), 0);

  const filteredParticipants = participants.filter(p => {
    if (!participantSearch) return true;
    const q = participantSearch.toLowerCase();
    return p.user_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.bib_number?.includes(q);
  });

  const filteredCheckin = checkinParticipants.filter(p => {
    if (!checkinSearch) return true;
    const q = checkinSearch.toLowerCase();
    return p.user_name?.toLowerCase().includes(q) || p.bib_number?.includes(q) || p.selected_race?.toLowerCase().includes(q);
  });

  const filteredSponsors = sponsors.filter(s => {
    if (!sponsorSearch) return true;
    const q = sponsorSearch.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.contact_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.contribution_type?.toLowerCase().includes(q);
  });

  const defaultCategories = [
    'Location de tentes & chapiteaux', 'Installation de stands', 'Podium & scene',
    'Barrieres de securite', 'Signaletique', 'Tables et chaises', 'Zones d accueil',
    'Balisage du parcours', 'Installation departs & arrivees', 'Zones de ravitaillement',
    'Chronometrage', 'Zones spectateurs', 'Zones techniques',
    'Societe de securite', 'Nettoyage du site', 'Gestion des dechets',
    'Sanitaires mobiles', 'Sono & eclairage', 'Alimentation electrique',
    'Animation', 'Medical', 'Restauration', 'Transport'
  ];
  const allCategories = [...new Set([...defaultCategories, ...partnerCategories])].sort();

  const filteredPartners = partners.filter(p => {
    if (!partnerSearch) return true;
    const q = partnerSearch.toLowerCase();
    return p.company_name?.toLowerCase().includes(q) || p.contact_name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
  });

  const filteredVolunteers = volunteers.filter(v => {
    if (!volunteerSearch) return true;
    const q = volunteerSearch.toLowerCase();
    return v.last_name?.toLowerCase().includes(q) || v.first_name?.toLowerCase().includes(q) || v.role_assigned?.toLowerCase().includes(q) || v.phone?.includes(q) || v.email?.toLowerCase().includes(q);
  });

  const hubItems = [
    { id: 'events', label: 'Evenements', icon: Calendar, desc: `${events.length} evenement(s)`, color: 'bg-blue-500' },
    { id: 'participants', label: 'Participants', icon: Users, desc: `${totalParticipants} inscrit(s)`, color: 'bg-emerald-500' },
    { id: 'gauges', label: 'Jauges', icon: BarChart3, desc: 'Remplissage temps reel', color: 'bg-orange-500' },
    { id: 'checkin', label: 'Check-in', icon: QrCode, desc: 'Scan QR & dossards', color: 'bg-purple-500' },
    { id: 'finances', label: 'Finances', icon: Euro, desc: `${totalRevenue.toFixed(0)}€ de revenus`, color: 'bg-green-600' },
    { id: 'correspondances', label: 'Correspondances', icon: Mail, desc: 'Messages aux inscrits', color: 'bg-pink-500' },
    { id: 'share', label: 'Partage', icon: Share2, desc: 'Reseaux sociaux', color: 'bg-sky-500' },
    { id: 'contact-admin', label: 'Contact Admin', icon: Shield, desc: 'Support & finances', color: 'bg-red-500' },
    { id: 'chronometrage', label: 'Chronometrage', icon: Timer, desc: 'Import temps & export dossards', color: 'bg-teal-600' },
    { id: 'results', label: 'Resultats', icon: Trophy, desc: 'Classements & performances', color: 'bg-amber-500' },
    { id: 'volunteers', label: 'Benevoles', icon: HeartHandshake, desc: 'Gestion des benevoles', color: 'bg-fuchsia-500' },
    { id: 'partners', label: 'Prestations Externes', icon: Handshake, desc: 'Partenaires evenementiels', color: 'bg-indigo-500' },
    { id: 'bookings', label: 'Reservation Entreprises', icon: Building2, desc: 'Equipes & tarifs groupe', color: 'bg-cyan-600' },
    { id: 'sponsors', label: 'Sponsors & Donateurs', icon: Heart, desc: 'Sponsoring & mecenat', color: 'bg-rose-500' },
    { id: 'boutique', label: 'Boutique Produits', icon: ShoppingBag, desc: 'Catalogue & ventes', color: 'bg-violet-500' },
    { id: 'analytics', label: 'Statistiques', icon: TrendingUp, desc: 'Analytics avances', color: 'bg-slate-600' },
    { id: 'rfid', label: 'Location RFID', icon: Radio, desc: 'Materiel chronometrage', color: 'bg-yellow-600' },
    { id: 'sms', label: 'Notifications SMS', icon: MessageSquare, desc: 'SMS aux participants', color: 'bg-lime-600' },
  ];

  // ==================== RENDER ====================
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="loader" /></div>;

  if (!isOrganizer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" data-testid="organizer-redirect">
        <motion.div className="max-w-md w-full bg-white border border-slate-200 p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Shield className="w-16 h-16 text-slate-300 mx-auto mb-6" />
          <h1 className="font-heading text-2xl font-bold uppercase mb-4">Acces reserve</h1>
          <p className="text-slate-500 mb-6">Cet espace est reserve aux organisateurs.</p>
          <Button className="w-full btn-primary" onClick={() => navigate('/dashboard')}>Retour a mon espace</Button>
        </motion.div>
      </div>
    );
  }

  const productCategories = ['Textile', 'Accessoire', 'Gourde', 'Sac', 'Medaille', 'Nutrition', 'Equipement'];
  const sizeOptions = ['XXS','XS','S','M','L','XL','XXL','3XL','Unique'];
  const toggleSize = (size) => setProductForm(p => ({ ...p, sizes: p.sizes.includes(size) ? p.sizes.filter(s => s !== size) : [...p.sizes, size] }));

  return (
    <div className="min-h-screen bg-slate-50" data-testid="organizer-dashboard">
      {/* Header */}
      <div className="bg-asphalt text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {activeSection !== 'hub' && (
                <button onClick={() => setActiveSection('hub')} className="p-2 hover:bg-white/10 transition-colors" data-testid="back-to-hub"><Home className="w-5 h-5" /></button>
              )}
              <div>
                <h1 className="font-heading text-2xl font-bold">Espace Organisateur</h1>
                <p className="text-slate-400 text-sm">{activeSection === 'hub' ? 'Gerez vos evenements et suivez vos performances' : hubItems.find(h => h.id === activeSection)?.label || ''}</p>
              </div>
            </div>
            <Button className="btn-primary gap-2" onClick={() => setShowCreateDialog(true)} data-testid="create-event-btn"><Plus className="w-4 h-4" /> Nouvel evenement</Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === 'hub' && <HubSection events={events} totalParticipants={totalParticipants} totalRevenue={totalRevenue} hubItems={hubItems} handleSectionChange={handleSectionChange} />}

        {activeSection === 'events' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Mes evenements" onBack={() => setActiveSection('hub')} />
            <EventsSection events={events} onEdit={openEditDialog} onDelete={handleDeleteEvent} onCreateNew={() => setShowCreateDialog(true)} onTogglePublish={handleTogglePublish} />
          </motion.div>
        )}

        {activeSection === 'participants' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Participants" onBack={() => setActiveSection('hub')} />
            <ParticipantsSection events={events} participants={participants} filteredParticipants={filteredParticipants} participantFilter={participantFilter} participantSearch={participantSearch} participantsLoading={participantsLoading} onFilterChange={(v) => { setParticipantFilter(v); fetchParticipants(v); }} onSearchChange={setParticipantSearch} />
          </motion.div>
        )}

        {activeSection === 'gauges' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Jauges de remplissage" onBack={() => setActiveSection('hub')} />
            <GaugesSection events={events} />
          </motion.div>
        )}

        {activeSection === 'checkin' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Check-in & Recuperation" onBack={() => setActiveSection('hub')} />
            <CheckinSection events={events} filteredCheckin={filteredCheckin} checkinFilter={checkinFilter} checkinSearch={checkinSearch} checkinLoading={checkinLoading} onFilterChange={(v) => { setCheckinFilter(v); fetchCheckinParticipants(v); }} onSearchChange={setCheckinSearch} onMarkCollected={handleMarkCollected} />
          </motion.div>
        )}

        {activeSection === 'finances' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Finances & Revenus" onBack={() => setActiveSection('hub')} />
            <FinancesSection revenueData={revenueData} revenueLoading={revenueLoading} onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} />
          </motion.div>
        )}

        {activeSection === 'correspondances' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Correspondances" onBack={() => setActiveSection('hub')} />
            <CorrespondancesSection events={events} correspondances={correspondances} corrLoading={corrLoading} showNewCorr={showNewCorr} setShowNewCorr={setShowNewCorr} corrForm={corrForm} setCorrForm={setCorrForm} corrSending={corrSending} onSend={handleSendCorrespondance} />
          </motion.div>
        )}

        {activeSection === 'share' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Partager vos evenements" onBack={() => setActiveSection('hub')} />
            <ShareSection events={events} />
          </motion.div>
        )}

        {activeSection === 'contact-admin' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Contact Administration" onBack={() => setActiveSection('hub')} />
            <MessagingPage />
          </motion.div>
        )}

        {activeSection === 'chronometrage' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Chronometrage" onBack={() => setActiveSection('hub')} />
            <ChronometrageSection events={events} chronoEventId={chronoEventId} setChronoEventId={setChronoEventId} />
          </motion.div>
        )}

        {activeSection === 'results' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Resultats & Classements" onBack={() => setActiveSection('hub')} />
            <ResultsSection events={events} />
          </motion.div>
        )}

        {activeSection === 'partners' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Prestations Externes" onBack={() => setActiveSection('hub')} />
            <PartnersSection filteredPartners={filteredPartners} partnersLoading={partnersLoading} partnerFilter={partnerFilter} partnerSearch={partnerSearch} allCategories={allCategories} onFilterChange={(v) => { setPartnerFilter(v); fetchPartners(v !== 'all' ? v : undefined); }} onSearchChange={setPartnerSearch} onOpenNew={openNewPartner} onOpenEdit={openEditPartner} onDelete={handleDeletePartner} showPartnerDialog={showPartnerDialog} setShowPartnerDialog={setShowPartnerDialog} editingPartner={editingPartner} setEditingPartner={setEditingPartner} partnerForm={partnerForm} setPartnerForm={setPartnerForm} customCategory={customCategory} setCustomCategory={setCustomCategory} partnerSaving={partnerSaving} onSave={handleSavePartner} />
          </motion.div>
        )}

        {activeSection === 'volunteers' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Gestion des Benevoles" onBack={() => setActiveSection('hub')} />
            <VolunteersSection events={events} volunteers={volunteers} filteredVolunteers={filteredVolunteers} volunteersLoading={volunteersLoading} volunteerEventFilter={volunteerEventFilter} volunteerSearch={volunteerSearch} onEventFilterChange={(v) => { setVolunteerEventFilter(v); fetchVolunteers(v !== 'all' ? v : undefined); }} onSearchChange={setVolunteerSearch} showVolunteerDialog={showVolunteerDialog} setShowVolunteerDialog={setShowVolunteerDialog} editingVolunteer={editingVolunteer} setEditingVolunteer={setEditingVolunteer} volunteerForm={volunteerForm} setVolunteerForm={setVolunteerForm} volunteerSaving={volunteerSaving} onSave={handleSaveVolunteer} onDelete={handleDeleteVolunteer} onOpenEdit={openEditVolunteer} onOpenNew={openNewVolunteer} />
          </motion.div>
        )}

        {activeSection === 'sponsors' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Sponsors & Donateurs" onBack={() => setActiveSection('hub')} />
            <SponsorsSection events={events} sponsors={sponsors} filteredSponsors={filteredSponsors} sponsorsLoading={sponsorsLoading} sponsorFilter={sponsorFilter} sponsorSearch={sponsorSearch} onFilterChange={(v) => { setSponsorFilter(v); fetchSponsors(v !== 'all' ? v : undefined); }} onSearchChange={setSponsorSearch} showSponsorDialog={showSponsorDialog} setShowSponsorDialog={setShowSponsorDialog} editingSponsor={editingSponsor} setEditingSponsor={setEditingSponsor} sponsorForm={sponsorForm} setSponsorForm={setSponsorForm} sponsorSaving={sponsorSaving} onSave={handleSaveSponsor} onDelete={handleDeleteSponsor} onOpenEdit={openEditSponsor} generatePaymentLink={generatePaymentLink} onConfirmPayment={handleConfirmPayment} onDownloadReceipt={handleDownloadReceipt} />
          </motion.div>
        )}

        {activeSection === 'bookings' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <SectionHeader title="Reservation Entreprises" onBack={() => setActiveSection('hub')} />
            <BookingsSection events={events} bookings={bookings} bookingsLoading={bookingsLoading} bookingSearch={bookingSearch} onSearchChange={setBookingSearch} showBookingDialog={showBookingDialog} setShowBookingDialog={setShowBookingDialog} editingBooking={editingBooking} setEditingBooking={setEditingBooking} bookingForm={bookingForm} setBookingForm={setBookingForm} onSave={handleSaveBooking} onDelete={handleDeleteBooking} generatePaymentLink={generatePaymentLink} />
          </motion.div>
        )}

        {activeSection === 'boutique' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Boutique Produits Derives" onBack={() => setActiveSection('hub')} />
            <BoutiqueSection events={events} orgLogo={orgLogo} logoUploading={logoUploading} handleLogoUpload={handleLogoUpload} shopStats={shopStats} shopTab={shopTab} setShopTab={setShopTab} shopLoading={shopLoading} shopProducts={shopProducts} shopOrders={shopOrders} shopEventFilter={shopEventFilter} setShopEventFilter={setShopEventFilter} fetchShopData={fetchShopData} onEditProduct={(p) => { setEditingProduct(p); setProductForm({ name: p.name, description: p.description, category: p.category, price: p.price, organizer_commission: p.organizer_commission, image_url: p.image_url, sizes: p.sizes || [], colors: p.colors || [], stock: p.stock, event_id: p.event_id || '', active: p.active }); setShowProductDialog(true); }} onDeleteProduct={handleDeleteProduct} onAddProduct={() => { setEditingProduct(null); setProductForm({ name: '', description: '', category: 'Textile', price: '', organizer_commission: 5, image_url: '', sizes: [], colors: [], stock: 100, event_id: '', active: true }); setShowProductDialog(true); }} showProductDialog={showProductDialog} setShowProductDialog={setShowProductDialog} editingProduct={editingProduct} productForm={productForm} setProductForm={setProductForm} productSaving={productSaving} handleSaveProduct={handleSaveProduct} providerCatalog={providerCatalog} addingProviderProduct={addingProviderProduct} setAddingProviderProduct={setAddingProviderProduct} providerCommission={providerCommission} setProviderCommission={setProviderCommission} providerEventId={providerEventId} setProviderEventId={setProviderEventId} handleAddProviderProduct={handleAddProviderProduct} providerConvos={providerConvos} providerChat={providerChat} providerMessages={providerMessages} providerNewMsg={providerNewMsg} setProviderNewMsg={setProviderNewMsg} openProviderChat={openProviderChat} sendProviderMsg={sendProviderMsg} providersList={providersList} />
          </motion.div>
        )}

        {activeSection === 'analytics' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Statistiques Avancees" onBack={() => setActiveSection('hub')} />
            <OrganizerAnalyticsSection />
          </motion.div>
        )}

        {activeSection === 'rfid' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Location Materiel RFID" onBack={() => setActiveSection('hub')} />
            <div className="text-center py-8">
              <Radio className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 mb-4">Accedez au catalogue de materiel RFID</p>
              <a href="/rfid"><Button className="btn-primary gap-2"><Radio className="w-4 h-4" /> Ouvrir le catalogue RFID</Button></a>
            </div>
          </motion.div>
        )}

        {activeSection === 'sms' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionHeader title="Notifications SMS" onBack={() => setActiveSection('hub')} />
            <OrganizerSmsSection events={events} />
          </motion.div>
        )}

        {/* Product Dialog (kept here as it's used by Boutique) */}
        <Dialog open={showProductDialog} onOpenChange={(open) => { setShowProductDialog(open); if (!open) setEditingProduct(null); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-heading text-xl uppercase">{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle><DialogDescription className="sr-only">Formulaire produit</DialogDescription></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label className="text-xs font-heading uppercase text-slate-500">Nom du produit *</Label><Input placeholder="T-shirt finisher Marathon Lyon 2026" value={productForm.name} onChange={(e) => setProductForm(p => ({ ...p, name: e.target.value }))} data-testid="product-name-input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs font-heading uppercase text-slate-500">Categorie</Label><Select value={productForm.category} onValueChange={(v) => setProductForm(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{productCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs font-heading uppercase text-slate-500">Evenement</Label><Select value={productForm.event_id || 'none'} onValueChange={(v) => setProductForm(p => ({ ...p, event_id: v }))}><SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger><SelectContent><SelectItem value="none">Tous</SelectItem>{events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div><Label className="text-xs font-heading uppercase text-slate-500">Description</Label><Textarea rows={2} value={productForm.description} onChange={(e) => setProductForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-xs font-heading uppercase text-slate-500">Prix (€) *</Label><Input type="number" value={productForm.price} onChange={(e) => setProductForm(p => ({ ...p, price: e.target.value }))} data-testid="product-price-input" /></div>
                <div><Label className="text-xs font-heading uppercase text-slate-500">Commission orga (€)</Label><Input type="number" value={productForm.organizer_commission} onChange={(e) => setProductForm(p => ({ ...p, organizer_commission: e.target.value }))} /></div>
                <div><Label className="text-xs font-heading uppercase text-slate-500">Stock</Label><Input type="number" value={productForm.stock} onChange={(e) => setProductForm(p => ({ ...p, stock: e.target.value }))} /></div>
              </div>
              <div><Label className="text-xs font-heading uppercase text-slate-500 mb-2 block">Tailles disponibles</Label><div className="flex flex-wrap gap-1.5">{sizeOptions.map(s => (<button key={s} type="button" onClick={() => toggleSize(s)} className={`px-3 py-1.5 text-xs font-bold border transition-colors ${productForm.sizes.includes(s) ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200 text-slate-500 hover:border-brand'}`}>{s}</button>))}</div></div>
              <div><Label className="text-xs font-heading uppercase text-slate-500">URL Image</Label><Input value={productForm.image_url} onChange={(e) => setProductForm(p => ({ ...p, image_url: e.target.value }))} /></div>
              <Button onClick={handleSaveProduct} disabled={productSaving} className="w-full btn-primary gap-2" data-testid="save-product-btn">{productSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {editingProduct ? 'Enregistrer' : 'Ajouter au catalogue'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* CREATE EVENT DIALOG */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) { setCreateStep(1); setNewEvent({ title: '', description: '', sport_type: 'running', location: '', date: '', max_participants: 100, price: 25, distances: '', elevation_gain: '', image_url: '', requires_pps: false, requires_medical_cert: false, allows_teams: false, min_age: '', max_age: '', races: [], route_url: '', exact_address: '', regulations: '', regulations_pdf_url: '', published: false, provided_items: ['tshirt'], custom_provided_item: '', is_free: false, sponsor_logos: [], themes: [], circuit_type: '', has_timer: null, website_url: '', facebook_url: '', instagram_url: '', twitter_url: '', youtube_url: '' }); setImagePreview(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <div className="p-6 pb-0">
            <DialogHeader><DialogTitle className="font-heading text-xl uppercase">Creer un evenement</DialogTitle><DialogDescription className="sr-only">Formulaire de creation</DialogDescription></DialogHeader>
            <div className="flex items-center gap-1 mt-5 mb-2">
              {[{ n: 1, label: 'Sport & Lieu' }, { n: 2, label: 'Configuration' }, { n: 3, label: 'Parcours & Visuels' }, { n: 4, label: 'Epreuves' }].map(s => (
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
                  <div><Label className="text-sm font-heading uppercase text-slate-500 mb-2">Distances</Label><Input placeholder="10km, 21km, 42km" value={newEvent.distances} onChange={(e) => setNewEvent(p => ({ ...p, distances: e.target.value }))} /></div>
                  <div><Label className="text-sm font-heading uppercase text-slate-500 mb-2">Denivele (m)</Label><Input type="number" placeholder="500" value={newEvent.elevation_gain} onChange={(e) => setNewEvent(p => ({ ...p, elevation_gain: e.target.value }))} /></div>
                </div>
                <div className="flex items-center gap-6 p-4 bg-slate-50 border">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={newEvent.requires_pps} onChange={(e) => setNewEvent(p => ({ ...p, requires_pps: e.target.checked }))} className="w-4 h-4 accent-brand" /><span className="text-sm font-medium">PPS obligatoire</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={newEvent.allows_teams} onChange={(e) => setNewEvent(p => ({ ...p, allows_teams: e.target.checked }))} className="w-4 h-4 accent-brand" /><span className="text-sm font-medium">Equipes autorisees</span></label>
                </div>
                {/* Free event toggle */}
                <div className="flex items-center justify-between p-4 border border-emerald-200 bg-emerald-50 rounded" data-testid="is-free-toggle-create">
                  <div>
                    <p className="font-heading font-bold text-sm uppercase text-emerald-800">Evenement gratuit</p>
                    <p className="text-xs text-emerald-600">Desactive le paiement lors de l'inscription</p>
                  </div>
                  <button type="button" onClick={() => setNewEvent(p => ({ ...p, is_free: !p.is_free }))} className="flex items-center">
                    {newEvent.is_free ? <ToggleRight className="w-10 h-10 text-emerald-500" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
                  </button>
                </div>
                {/* Dotation participant */}
                <div className="border border-slate-200 p-4 bg-slate-50 space-y-3" data-testid="provided-items-section">
                  <Label className="text-sm font-heading uppercase text-slate-500">Dotation participant</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'tshirt', label: 'T-shirt', icon: '👕' },
                      { id: 'medal', label: 'Medaille', icon: '🏅' },
                      { id: 'bag', label: 'Sac', icon: '🎒' },
                      { id: 'cap', label: 'Casquette', icon: '🧢' },
                      { id: 'bottle', label: 'Gourde', icon: '🍶' },
                      { id: 'bib', label: 'Dossard', icon: '🏷️' },
                      { id: 'towel', label: 'Serviette', icon: '🧣' },
                      { id: 'food', label: 'Ravitaillement', icon: '🍌' },
                      { id: 'photo', label: 'Photo souvenir', icon: '📸' },
                    ].map(item => {
                      const selected = (newEvent.provided_items || []).includes(item.id);
                      return (
                        <button key={item.id} type="button" onClick={() => setNewEvent(p => ({ ...p, provided_items: selected ? (p.provided_items || []).filter(i => i !== item.id) : [...(p.provided_items || []), item.id] }))}
                          className={`flex items-center gap-2 p-2.5 border rounded text-sm text-left transition-all ${selected ? 'border-brand bg-brand/5 text-brand font-bold' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                          data-testid={`provided-item-${item.id}`}>
                          <span className="text-base">{item.icon}</span> {item.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Autre dotation personnalisee..." value={newEvent.custom_provided_item || ''} onChange={(e) => setNewEvent(p => ({ ...p, custom_provided_item: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter' && newEvent.custom_provided_item?.trim()) { e.preventDefault(); setNewEvent(p => ({ ...p, provided_items: [...(p.provided_items || []), p.custom_provided_item.trim()], custom_provided_item: '' })); } }}
                      className="flex-1" data-testid="custom-provided-item-input" />
                    <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={!newEvent.custom_provided_item?.trim()}
                      onClick={() => setNewEvent(p => ({ ...p, provided_items: [...(p.provided_items || []), p.custom_provided_item.trim()], custom_provided_item: '' }))}
                      data-testid="add-custom-item-btn">Ajouter</Button>
                  </div>
                  {(newEvent.provided_items || []).filter(i => !['tshirt','medal','bag','cap','bottle','bib','towel','food','photo'].includes(i)).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(newEvent.provided_items || []).filter(i => !['tshirt','medal','bag','cap','bottle','bib','towel','food','photo'].includes(i)).map((item, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand/10 text-brand text-xs font-bold rounded">
                          {item}
                          <button type="button" onClick={() => setNewEvent(p => ({ ...p, provided_items: (p.provided_items || []).filter(i => i !== item) }))} className="hover:text-red-500">&times;</button>
                        </span>
                      ))}
                    </div>
                  )}
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
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 hover:border-brand p-6 text-center cursor-pointer group"><Upload className="w-8 h-8 mx-auto mb-2 text-slate-300 group-hover:text-brand" /><p className="font-heading font-bold text-xs uppercase text-slate-500 group-hover:text-brand">{uploadingImage ? 'Upload...' : 'Cliquez pour uploader'}</p></div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(e) => handleImageUpload(e, false)} className="hidden" />
                  <div className="flex items-center gap-2 mt-2"><span className="text-xs text-slate-400">ou</span><Input placeholder="URL de l'image" value={newEvent.image_url} onChange={(e) => { setNewEvent(p => ({ ...p, image_url: e.target.value })); setImagePreview(null); }} className="flex-1 text-sm" /></div>
                </div>
                <div><Label className="text-sm font-heading uppercase text-slate-500 mb-2 block">Description</Label><Textarea placeholder="Decrivez votre evenement..." rows={3} value={newEvent.description} onChange={(e) => setNewEvent(p => ({ ...p, description: e.target.value }))} /></div>
                <div><Label className="text-sm font-heading uppercase text-slate-500 mb-2">Reglement</Label><Textarea rows={3} value={newEvent.regulations} onChange={(e) => setNewEvent(p => ({ ...p, regulations: e.target.value }))} /></div>
                <div>
                  <Label className="text-sm font-heading uppercase text-slate-500 mb-2 block"><FileDown className="w-4 h-4 text-brand inline mr-1" />Reglement PDF</Label>
                  {newEvent.regulations_pdf_url ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded"><FileText className="w-5 h-5 text-green-600" /><span className="text-sm text-green-700 flex-1 truncate">Reglement PDF telecharge</span><Button variant="ghost" size="sm" className="text-red-500 h-7" onClick={() => setNewEvent(p => ({ ...p, regulations_pdf_url: '' }))}><X className="w-4 h-4" /></Button></div>
                  ) : (
                    <label className="block cursor-pointer"><input type="file" accept=".pdf" className="hidden" onChange={(e) => handleRegulationUpload(e, false)} /><div className="border-2 border-dashed border-slate-300 hover:border-brand p-4 text-center rounded transition-colors group"><FileDown className="w-6 h-6 mx-auto mb-1 text-slate-300 group-hover:text-brand" /><p className="text-xs font-heading uppercase text-slate-500 group-hover:text-brand">Telecharger le reglement PDF</p></div></label>
                  )}
                </div>
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setCreateStep(2)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Retour</Button>
                  <div className="flex gap-2">
                    <Button onClick={() => setCreateStep(4)} variant="outline" className="gap-2">Epreuves <ArrowRight className="w-4 h-4" /></Button>
                    <Button onClick={handleCreateEvent} disabled={creating} className="btn-primary gap-2">{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Creer</Button>
                  </div>
                </div>
              </motion.div>
            )}
            {createStep === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div><Label className="text-sm font-heading uppercase text-slate-500 block">Epreuves</Label><p className="text-xs text-slate-400">Definissez les courses, distances et tarifs</p></div>
                  <Button onClick={() => addRace(false)} className="bg-brand hover:bg-brand/90 text-white gap-1.5 font-heading font-bold uppercase text-xs" data-testid="add-race-btn"><Plus className="w-4 h-4" /> Ajouter une epreuve</Button>
                </div>
                {newEvent.races?.length > 0 ? (
                  <div className="space-y-3">{newEvent.races.map((race, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg overflow-hidden bg-white" data-testid={`race-${i}`}>
                      <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 border-b border-slate-100"><GripVertical className="w-4 h-4 text-slate-300" /><span className="font-heading font-bold text-xs uppercase text-brand">Epreuve {i + 1}</span><div className="flex-1" /><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveRace(i, 'up')} disabled={i === 0}><ArrowUp className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveRace(i, 'down')} disabled={i === newEvent.races.length - 1}><ArrowDown className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => removeRace(i)}><X className="w-4 h-4" /></Button></div>
                      <div className="p-4 space-y-3">
                        <Input placeholder="Nom de l'epreuve" value={race.name} onChange={(e) => updateRace(i, 'name', e.target.value)} className="font-heading font-bold text-base" />
                        <div className="grid grid-cols-3 gap-3">
                          <div><Label className="text-[10px] font-heading uppercase text-slate-400 mb-1 block">Prix (€)</Label><Input type="number" value={race.price} onChange={(e) => updateRace(i, 'price', parseFloat(e.target.value))} /></div>
                          <div><Label className="text-[10px] font-heading uppercase text-slate-400 mb-1 block">Places max</Label><Input type="number" value={race.max_participants} onChange={(e) => updateRace(i, 'max_participants', parseInt(e.target.value))} /></div>
                          <div><Label className="text-[10px] font-heading uppercase text-slate-400 mb-1 block">Distance (km)</Label><Input type="number" value={race.distance_km} onChange={(e) => updateRace(i, 'distance_km', e.target.value)} /></div>
                        </div>
                        <div><Label className="text-[10px] font-heading uppercase text-slate-400 mb-1 block">Descriptif (optionnel)</Label><Textarea rows={2} value={race.description || ''} onChange={(e) => updateRace(i, 'description', e.target.value)} className="text-sm" /></div>
                      </div>
                    </div>
                  ))}</div>
                ) : (
                  <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg"><Flag className="w-10 h-10 mx-auto mb-3 text-slate-300" /><p className="font-heading font-bold text-sm uppercase text-slate-500 mb-1">Aucune epreuve</p><p className="text-xs text-slate-400">Cliquez sur "Ajouter une epreuve"</p></div>
                )}
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setCreateStep(3)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Retour</Button>
                  <Button onClick={handleCreateEvent} disabled={creating} className="btn-primary gap-2">{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Creer</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading text-xl uppercase">Modifier l'evenement</DialogTitle><DialogDescription className="sr-only">Modification</DialogDescription></DialogHeader>
          {editingEvent && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Titre *</Label><Input value={editingEvent.title} onChange={(e) => setEditingEvent(p => ({ ...p, title: e.target.value }))} /></div>
                <div><Label>Type</Label><Select value={editingEvent.sport_type} onValueChange={(v) => setEditingEvent(p => ({ ...p, sport_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sportOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Date</Label><DateTimePicker value={editingEvent.date ? new Date(editingEvent.date).toISOString().slice(0, 16) : ''} onChange={(v) => setEditingEvent(p => ({ ...p, date: new Date(v).toISOString() }))} placeholder="Modifier" /></div>
                <div><Label>Participants max</Label><Input type="number" value={editingEvent.max_participants} onChange={(e) => setEditingEvent(p => ({ ...p, max_participants: parseInt(e.target.value) }))} /></div>
                <div><Label>Lieu</Label><Input value={editingEvent.location} onChange={(e) => setEditingEvent(p => ({ ...p, location: e.target.value }))} /></div>
                <div><Label>Prix (€)</Label><Input type="number" value={editingEvent.price} onChange={(e) => setEditingEvent(p => ({ ...p, price: parseFloat(e.target.value) }))} /></div>
                {/* Free event toggle */}
                <div className="col-span-2 flex items-center justify-between p-4 border border-emerald-200 bg-emerald-50 rounded" data-testid="is-free-toggle-edit">
                  <div>
                    <p className="font-heading font-bold text-sm uppercase text-emerald-800">Evenement gratuit</p>
                    <p className="text-xs text-emerald-600">Desactive le paiement lors de l'inscription</p>
                  </div>
                  <button type="button" onClick={() => setEditingEvent(p => ({ ...p, is_free: !p.is_free }))} className="flex items-center">
                    {editingEvent.is_free ? <ToggleRight className="w-10 h-10 text-emerald-500" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
                  </button>
                </div>
                {/* Sponsor logos */}
                <div className="col-span-2 border border-slate-200 p-4 rounded space-y-3" data-testid="sponsor-logos-edit">
                  <Label className="text-sm font-heading uppercase text-slate-500">Logos des sponsors</Label>
                  <div className="flex flex-wrap gap-3">
                    {(editingEvent.sponsor_logos || []).map((logo, idx) => (
                      <div key={idx} className="relative group border border-slate-200 rounded p-2 bg-slate-50">
                        <img src={logo.url} alt={logo.name || `Sponsor ${idx+1}`} className="h-12 w-auto object-contain" />
                        {logo.name && <p className="text-[9px] text-center text-slate-400 mt-1">{logo.name}</p>}
                        <button type="button" onClick={() => setEditingEvent(p => ({ ...p, sponsor_logos: (p.sponsor_logos || []).filter((_, i) => i !== idx) }))} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.append('file', file);
                          try {
                            const res = await api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                            const logoName = prompt('Nom du sponsor (optionnel)') || '';
                            setEditingEvent(p => ({ ...p, sponsor_logos: [...(p.sponsor_logos || []), { url: res.data.url, name: logoName }] }));
                            toast.success('Logo ajoute !');
                          } catch { toast.error('Erreur upload logo'); }
                          e.target.value = '';
                        }} />
                        <div className="border-2 border-dashed border-slate-300 hover:border-brand p-3 text-center rounded transition-colors group cursor-pointer">
                          <Upload className="w-5 h-5 mx-auto mb-1 text-slate-300 group-hover:text-brand" />
                          <p className="text-xs font-heading uppercase text-slate-500 group-hover:text-brand">Ajouter un logo sponsor</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
                <div><Label>Dotation participant</Label>
                  <div className="grid grid-cols-3 gap-1.5 mt-2">
                    {[
                      { id: 'tshirt', label: 'T-shirt', icon: '👕' },
                      { id: 'medal', label: 'Medaille', icon: '🏅' },
                      { id: 'bag', label: 'Sac', icon: '🎒' },
                      { id: 'cap', label: 'Casquette', icon: '🧢' },
                      { id: 'bottle', label: 'Gourde', icon: '🍶' },
                      { id: 'bib', label: 'Dossard', icon: '🏷️' },
                      { id: 'towel', label: 'Serviette', icon: '🧣' },
                      { id: 'food', label: 'Ravitaillement', icon: '🍌' },
                      { id: 'photo', label: 'Photo souvenir', icon: '📸' },
                    ].map(item => {
                      const items = editingEvent.provided_items || (editingEvent.provides_tshirt !== false ? ['tshirt'] : []);
                      const selected = items.includes(item.id);
                      return (
                        <button key={item.id} type="button" onClick={() => setEditingEvent(p => ({ ...p, provided_items: selected ? items.filter(i => i !== item.id) : [...items, item.id] }))}
                          className={`flex items-center gap-1.5 p-2 border rounded text-xs text-left transition-all ${selected ? 'border-brand bg-brand/5 text-brand font-bold' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                          <span>{item.icon}</span> {item.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <Input placeholder="Autre..." value={editingEvent.custom_provided_item || ''} onChange={(e) => setEditingEvent(p => ({ ...p, custom_provided_item: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter' && editingEvent.custom_provided_item?.trim()) { e.preventDefault(); const items = editingEvent.provided_items || []; setEditingEvent(p => ({ ...p, provided_items: [...items, p.custom_provided_item.trim()], custom_provided_item: '' })); } }}
                      className="flex-1 h-8 text-xs" />
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs" disabled={!editingEvent.custom_provided_item?.trim()}
                      onClick={() => { const items = editingEvent.provided_items || []; setEditingEvent(p => ({ ...p, provided_items: [...items, p.custom_provided_item.trim()], custom_provided_item: '' })); }}>+</Button>
                  </div>
                  {(editingEvent.provided_items || []).filter(i => !['tshirt','medal','bag','cap','bottle','bib','towel','food','photo'].includes(i)).map((item, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand/10 text-brand text-[10px] font-bold rounded mt-1 mr-1">{item} <button type="button" onClick={() => setEditingEvent(p => ({ ...p, provided_items: (p.provided_items || []).filter(i => i !== item) }))} className="hover:text-red-500">&times;</button></span>
                  ))}
                </div>
                <div className="col-span-2"><Label>Image</Label><div className="mt-2">{(imagePreview || editingEvent.image_url) && <div className="relative mb-3 inline-block"><img src={imagePreview || editingEvent.image_url} alt="Preview" className="h-32 w-auto object-cover border" /><button onClick={() => { setImagePreview(null); setEditingEvent(p => ({ ...p, image_url: '' })); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X className="w-4 h-4" /></button></div>}<div className="flex gap-2"><input ref={editFileInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="hidden" /><Button variant="outline" onClick={() => editFileInputRef.current?.click()} disabled={uploadingImage}>{uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}Upload</Button><Input placeholder="URL" value={editingEvent.image_url || ''} onChange={(e) => { setEditingEvent(p => ({ ...p, image_url: e.target.value })); setImagePreview(null); }} className="flex-1" /></div></div></div>
                <div className="col-span-2"><Label>Description</Label><Textarea rows={3} value={editingEvent.description} onChange={(e) => setEditingEvent(p => ({ ...p, description: e.target.value }))} /></div>
                <div className="col-span-2">
                  <Label className="mb-2 block"><FileDown className="w-4 h-4 text-brand inline mr-1" />Reglement PDF</Label>
                  {editingEvent.regulations_pdf_url ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded"><FileText className="w-5 h-5 text-green-600" /><span className="text-sm text-green-700 flex-1">PDF telecharge</span><a href={editingEvent.regulations_pdf_url} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">Voir</a><Button variant="ghost" size="sm" className="text-red-500 h-7" onClick={() => setEditingEvent(p => ({ ...p, regulations_pdf_url: '' }))}><X className="w-4 h-4" /></Button></div>
                  ) : (
                    <label className="block cursor-pointer"><input type="file" accept=".pdf" className="hidden" onChange={(e) => handleRegulationUpload(e, true)} /><div className="border-2 border-dashed border-slate-300 hover:border-brand p-3 text-center rounded transition-colors group"><FileDown className="w-5 h-5 mx-auto mb-1 text-slate-300 group-hover:text-brand" /><p className="text-xs text-slate-500 group-hover:text-brand">Telecharger le reglement PDF</p></div></label>
                  )}
                </div>
                <div className="col-span-2 border-t pt-4">
                  <div className="flex items-center justify-between mb-3"><Label className="text-base font-bold">Epreuves</Label><Button onClick={() => addRace(true)} className="bg-brand hover:bg-brand/90 text-white gap-1.5 font-heading font-bold uppercase text-xs"><Plus className="w-4 h-4" />Ajouter</Button></div>
                  {editingEvent.races?.length > 0 ? (
                    <div className="space-y-3">{editingEvent.races.map((race, i) => (
                      <div key={i} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 border-b border-slate-100"><GripVertical className="w-4 h-4 text-slate-300" /><span className="font-heading font-bold text-xs uppercase text-brand">Epreuve {i + 1}</span><div className="flex-1" /><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveRace(i, 'up', true)} disabled={i === 0}><ArrowUp className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveRace(i, 'down', true)} disabled={i === editingEvent.races.length - 1}><ArrowDown className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => removeRace(i, true)}><X className="w-4 h-4" /></Button></div>
                        <div className="p-4 space-y-3">
                          <Input placeholder="Nom de l'epreuve" value={race.name} onChange={(e) => updateRace(i, 'name', e.target.value, true)} className="font-heading font-bold" />
                          <div className="grid grid-cols-3 gap-3">
                            <div><Label className="text-[10px] font-heading uppercase text-slate-400 mb-1 block">Prix (€)</Label><Input type="number" value={race.price} onChange={(e) => updateRace(i, 'price', parseFloat(e.target.value), true)} /></div>
                            <div><Label className="text-[10px] font-heading uppercase text-slate-400 mb-1 block">Places max</Label><Input type="number" value={race.max_participants} onChange={(e) => updateRace(i, 'max_participants', parseInt(e.target.value), true)} /></div>
                            <div><Label className="text-[10px] font-heading uppercase text-slate-400 mb-1 block">Distance (km)</Label><Input type="number" value={race.distance_km || ''} onChange={(e) => updateRace(i, 'distance_km', e.target.value, true)} /></div>
                          </div>
                          <div><Label className="text-[10px] font-heading uppercase text-slate-400 mb-1 block">Descriptif</Label><Textarea rows={2} value={race.description || ''} onChange={(e) => updateRace(i, 'description', e.target.value, true)} className="text-sm" /></div>
                        </div>
                      </div>
                    ))}</div>
                  ) : <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded border-2 border-dashed">Aucune epreuve — cliquez Ajouter</p>}
                </div>
              </div>
              <Button onClick={handleEditEvent} disabled={editing} className="w-full btn-primary">{editing ? 'Mise a jour...' : 'Enregistrer'}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizerDashboard;
