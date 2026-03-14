import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ShoppingBag, Package, Euro, TrendingUp, FileText, Plus, Edit, Trash2,
  MessageSquare, Send, Loader2, X, ChevronRight, ChevronLeft, PieChart as PieChartIcon, BarChart3, Users, ArrowDownRight, Upload, Check, Search, ImagePlus, ClipboardList, Eye, Clock, CheckCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'sonner';
import NotificationBell from '../components/NotificationBell';
import ProviderCatalogue from '../components/provider/ProviderCatalogue';
import ProviderFinances from '../components/provider/ProviderFinances';
import ProviderSales from '../components/provider/ProviderSales';
import ProviderMessages from '../components/provider/ProviderMessages';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = ['#ff4500', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const ProviderDashboard = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('catalogue');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', description: '', category: 'Textile', price: '', suggested_commission: 5, image_url: '', images: [], sizes: [], colors: [], stock: 100 });
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [organizerLogos, setOrganizerLogos] = useState([]);
  const [organizersList, setOrganizersList] = useState([]);
  const [financialData, setFinancialData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  // TopTex import
  const [importProducts, setImportProducts] = useState([]);
  const [importSelected, setImportSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState('');
  const [importFilter, setImportFilter] = useState('');
  // TopTex lookup by ref
  const [lookupRef, setLookupRef] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  // XDConnects lookup
  const [xdLookupRef, setXdLookupRef] = useState('');
  const [xdLookupLoading, setXdLookupLoading] = useState(false);
  const [xdLookupResult, setXdLookupResult] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [cardImageIndex, setCardImageIndex] = useState({});
  const imageInputRef = useRef(null);
  const [selections, setSelections] = useState([]);
  const [activeSelection, setActiveSelection] = useState(null);
  const [customizeImages, setCustomizeImages] = useState([]);
  const [uploadingCustomize, setUploadingCustomize] = useState(false);
  const customizeInputRef = useRef(null);

  const categories = ['Textile', 'Accessoire', 'Gourde', 'Sac', 'Nutrition', 'Équipement'];

  const fetchData = useCallback(async () => {
    try {
      const [catRes, ordRes, statsRes, convRes, logosRes, orgRes, finRes, salesRes] = await Promise.all([
        api.get('/provider/catalog'),
        api.get('/provider/orders'),
        api.get('/provider/stats'),
        api.get('/provider/conversations'),
        api.get('/provider/organizer-logos'),
        api.get('/provider/organizers'),
        api.get('/provider/financial-breakdown'),
        api.get('/provider/sales-breakdown')
      ]);
      setProducts(catRes.data.products || []);
      setOrders(ordRes.data.orders || []);
      setStats(statsRes.data || {});
      setConversations(convRes.data.conversations || []);
      setOrganizerLogos(logosRes.data.organizers || []);
      setOrganizersList(orgRes.data.organizers || []);
      setFinancialData(finRes.data || null);
      setSalesData(salesRes.data || null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price) { toast.error('Nom et prix requis'); return; }
    try {
      if (editingProduct) {
        await api.put(`/provider/catalog/${editingProduct.product_id}`, { ...productForm, price: parseFloat(productForm.price), suggested_commission: parseFloat(productForm.suggested_commission) });
        toast.success('Produit modifié');
      } else {
        await api.post('/provider/catalog', { ...productForm, price: parseFloat(productForm.price), suggested_commission: parseFloat(productForm.suggested_commission) });
        toast.success('Produit ajouté');
      }
      setShowProductDialog(false);
      setEditingProduct(null);
      fetchData();
    } catch (e) { toast.error('Erreur'); }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Supprimer ce produit ?')) return;
    await api.delete(`/provider/catalog/${id}`);
    toast.success('Supprimé');
    fetchData();
  };

  const openChat = async (userId) => {
    setActiveChat(userId);
    const res = await api.get(`/provider/messages/${userId}`);
    setMessages(res.data.messages || []);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeChat) return;
    await api.post('/provider/messages', { recipient_id: activeChat, content: newMsg });
    setNewMsg('');
    const res = await api.get(`/provider/messages/${activeChat}`);
    setMessages(res.data.messages || []);
  };


  const handlePdfUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) { toast.error('Fichier PDF requis'); return; }
    setParsing(true);
    setParsingProgress('Upload du fichier...');
    setImportProducts([]);
    setImportSelected(new Set());
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/provider/import/parse-pdf', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 600000 });
      const taskId = uploadRes.data.task_id;
      if (!taskId) {
        setImportProducts(uploadRes.data.products || []);
        toast.success(`${uploadRes.data.total} produits trouvés !`);
        setParsing(false); setParsingProgress('');
        return;
      }
      setParsingProgress('Analyse du PDF...');
      let attempts = 0;
      const maxAttempts = 600;
      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 1000));
        attempts++;
        try {
          const statusRes = await api.get(`/provider/import/pdf-status/${taskId}`);
          if (statusRes.data.status === 'done') {
            setImportProducts(statusRes.data.products || []);
            toast.success(`${statusRes.data.total} produits trouvés dans le catalogue !`);
            setParsing(false); setParsingProgress('');
            return;
          }
          if (statusRes.data.total_pages > 0) {
            setParsingProgress(`Page ${statusRes.data.current_page} / ${statusRes.data.total_pages}`);
          }
        } catch (pollErr) {
          if (pollErr.response?.status === 500) {
            toast.error(pollErr.response?.data?.detail || 'Erreur analyse PDF');
            setParsing(false); setParsingProgress('');
            return;
          }
        }
      }
      toast.error('Le traitement a pris trop de temps.');
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur upload PDF'); }
    finally { setParsing(false); setParsingProgress(''); }
  };

  const handleImportConfirm = async () => {
    const selected = importProducts.filter(p => importSelected.has(p.ref));
    if (selected.length === 0) { toast.error('Sélectionnez au moins un produit'); return; }
    setImporting(true);
    try {
      const res = await api.post('/provider/import/confirm', { products: selected });
      toast.success(res.data.message);
      setImportProducts([]);
      setImportSelected(new Set());
      fetchData();
      setActiveSection('catalogue');
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur import'); }
    finally { setImporting(false); }
  };

  const toggleImportSelect = (ref) => {
    setImportSelected(prev => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref); else next.add(ref);
      return next;
    });
  };

  const toggleImportAll = () => {
    const filtered = filteredImportProducts;
    if (importSelected.size === filtered.length) {
      setImportSelected(new Set());
    } else {
      setImportSelected(new Set(filtered.map(p => p.ref)));
    }
  };

  const filteredImportProducts = importProducts.filter(p =>
    !importFilter || p.name.toLowerCase().includes(importFilter.toLowerCase()) ||
    p.ref.toLowerCase().includes(importFilter.toLowerCase()) ||
    p.category.toLowerCase().includes(importFilter.toLowerCase())
  );

  const handleLookup = async () => {
    if (!lookupRef.trim()) { toast.error('Entrez une reference TopTex'); return; }
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const res = await api.get(`/provider/import/lookup/${lookupRef.trim()}`);
      setLookupResult(res.data.product);
      toast.success('Produit trouve !');
    } catch (e) {
      const msg = e.response?.data?.detail || 'Erreur recherche';
      toast.error(msg);
    } finally { setLookupLoading(false); }
  };

  const handleAddSingle = async () => {
    if (!lookupResult) return;
    try {
      await api.post('/provider/import/add-single', { product: lookupResult });
      toast.success(`${lookupResult.ref} ajouté au catalogue !`);
      setLookupResult(null);
      setLookupRef('');
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur import'); }
  };

  // XDConnects handlers
  const handleXdLookup = async () => {
    if (!xdLookupRef.trim()) { toast.error('Entrez une reference XD Connects'); return; }
    setXdLookupLoading(true);
    setXdLookupResult(null);
    try {
      const res = await api.get(`/provider/import/xdconnects/lookup/${xdLookupRef.trim()}`);
      setXdLookupResult(res.data.product);
      toast.success('Produit trouve !');
    } catch (e) {
      const msg = e.response?.data?.detail || 'Erreur recherche';
      toast.error(msg);
    } finally { setXdLookupLoading(false); }
  };

  const handleXdAddSingle = async () => {
    if (!xdLookupResult) return;
    try {
      await api.post('/provider/import/xdconnects/add-single', { product: xdLookupResult });
      toast.success(`${xdLookupResult.ref} ajouté au catalogue !`);
      setXdLookupResult(null);
      setXdLookupRef('');
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur import'); }
  };

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;
    const currentImages = productForm.images || [];
    const remaining = 10 - currentImages.length;
    if (remaining <= 0) { toast.error('Maximum 10 images atteint'); return; }
    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploadingImages(true);
    try {
      const uploaded = [];
      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        uploaded.push(res.data.url);
      }
      setProductForm(p => ({ ...p, images: [...(p.images || []), ...uploaded] }));
      toast.success(`${uploaded.length} image(s) ajoutée(s)`);
    } catch (e) { toast.error('Erreur upload image'); }
    finally { setUploadingImages(false); }
  };

  const removeFormImage = (index) => {
    setProductForm(p => ({ ...p, images: (p.images || []).filter((_, i) => i !== index) }));
  };

  const getProductImages = (p) => {
    const imgs = [];
    if (p.images && p.images.length > 0) imgs.push(...p.images);
    else if (p.image_url) imgs.push(p.image_url);
    return imgs.map(url => url ? url.replace(/ /g, '%20') : '').filter(Boolean);
  };

  const fetchSelections = useCallback(async () => {
    try {
      const res = await api.get('/provider/selections');
      setSelections(res.data.selections || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (activeSection === 'selections') fetchSelections();
  }, [activeSection, fetchSelections]);

  const handleCustomizeUpload = async (files, selectionId, productIndex) => {
    if (!files || files.length === 0) return;
    setUploadingCustomize(true);
    try {
      const uploaded = [...customizeImages];
      for (const file of Array.from(files).slice(0, 10 - uploaded.length)) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        uploaded.push(res.data.url);
      }
      setCustomizeImages(uploaded);
    } catch { toast.error('Erreur upload'); }
    finally { setUploadingCustomize(false); }
  };

  const handleSaveCustomization = async (selectionId, productIndex) => {
    if (customizeImages.length === 0) { toast.error('Ajoutez au moins une photo'); return; }
    try {
      await api.put(`/provider/selections/${selectionId}/customize/${productIndex}`, { images: customizeImages });
      toast.success('Produit personnalise ! Les photos sont synchronisees chez l\'organisateur.');
      setCustomizeImages([]);
      setActiveSelection(null);
      fetchSelections();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const handleSelectionStatus = async (selectionId, status) => {
    try {
      await api.put(`/provider/selections/${selectionId}/status`, { status });
      toast.success('Statut mis a jour');
      fetchSelections();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="loader" /></div>;

  const statCards = [
    { label: 'Produits', value: stats.total_products || 0, icon: Package, color: 'text-violet-500' },
    { label: 'Commandes', value: stats.total_orders || 0, icon: FileText, color: 'text-blue-500' },
    { label: 'Ventes totales', value: `${(stats.total_sales || 0).toFixed(0)}€`, icon: Euro, color: 'text-green-600' },
    { label: 'Revenu net', value: `${(stats.net_revenue || 0).toFixed(0)}€`, icon: TrendingUp, color: 'text-brand' },
  ];

  const pendingSelections = selections.filter(s => s.status === 'pending').length;
  const navItems = [
    { id: 'catalogue', label: 'Catalogue', icon: ShoppingBag },
    { id: 'selections', label: 'Selections', icon: ClipboardList, badge: pendingSelections },
    { id: 'import', label: 'Import TopTex', icon: Package },
    { id: 'import-xd', label: 'Import XD Connects', icon: Package },
    { id: 'finances', label: 'Finances', icon: Euro },
    { id: 'ventes', label: 'Ventes', icon: BarChart3 },
    { id: 'commandes', label: 'Commandes', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: conversations.reduce((a, c) => a + (c.unread || 0), 0) },
  ];

  const chatPartner = conversations.find(c => c.user_id === activeChat);

  return (
    <div className="min-h-screen bg-slate-50" data-testid="provider-dashboard">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight">Espace Prestataire</h1>
            <p className="text-sm text-slate-500">{user?.company_name || user?.name}</p>
          </div>
          <Button className="bg-brand hover:bg-brand/90 text-white font-heading font-bold uppercase text-xs gap-2" onClick={() => { setEditingProduct(null); setProductForm({ name: '', description: '', category: 'Textile', price: '', suggested_commission: 5, image_url: '', images: [], sizes: [], colors: [], stock: 100 }); setShowProductDialog(true); }} data-testid="add-provider-product-btn">
            <Plus className="w-4 h-4" /> Nouveau produit
          </Button>
          <NotificationBell onNavigate={setActiveSection} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statCards.map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 p-4">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="font-heading font-black text-2xl">{s.value}</p>
              <p className="text-xs text-slate-500 uppercase font-heading">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Nav tabs */}
        <div className="flex gap-2 mb-6">
          {navItems.map(n => (
            <Button key={n.id} variant={activeSection === n.id ? 'default' : 'outline'} className={`gap-2 ${activeSection === n.id ? 'bg-brand' : ''}`} onClick={() => { setActiveSection(n.id); setActiveChat(null); }} data-testid={`provider-tab-${n.id}`}>
              <n.icon className="w-4 h-4" /> {n.label}
              {n.badge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{n.badge}</span>}
            </Button>
          ))}
        </div>

        {/* Catalogue */}
        {activeSection === 'catalogue' && (
          <ProviderCatalogue
            products={products}
            getProductImages={getProductImages}
            cardImageIndex={cardImageIndex}
            setCardImageIndex={setCardImageIndex}
            onEdit={(p) => { setEditingProduct(p); setProductForm({ name: p.name, description: p.description, category: p.category, price: p.price, suggested_commission: p.suggested_commission, image_url: p.image_url, images: p.images || [], sizes: p.sizes || [], colors: p.colors || [], stock: p.stock }); setShowProductDialog(true); }}
            onDelete={handleDeleteProduct}
          />
        )}




        {/* ===== SELECTIONS (Workflow Organisateur) ===== */}
        {activeSection === 'selections' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="provider-selections-section">
            <h3 className="font-heading font-bold text-base uppercase mb-4">Selections par Organisateur</h3>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'En attente', count: selections.filter(s => s.status === 'pending').length, color: 'text-amber-500', bg: 'bg-amber-50', icon: Clock },
                { label: 'En cours', count: selections.filter(s => s.status === 'in_progress').length, color: 'text-blue-500', bg: 'bg-blue-50', icon: Edit },
                { label: 'Prets', count: selections.filter(s => s.status === 'ready').length, color: 'text-green-500', bg: 'bg-green-50', icon: CheckCircle },
              ].map(st => (
                <div key={st.label} className={`${st.bg} border border-slate-200 p-4 rounded-lg flex items-center gap-3`}>
                  <st.icon className={`w-6 h-6 ${st.color}`} />
                  <div>
                    <p className="font-heading font-black text-2xl">{st.count}</p>
                    <p className="text-[11px] text-slate-500 uppercase font-heading">{st.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {selections.length === 0 ? (
              <div className="bg-white border border-slate-200 p-12 text-center rounded-lg">
                <ClipboardList className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <h4 className="font-heading font-bold text-lg uppercase mb-2">Aucune selection</h4>
                <p className="text-slate-500 text-sm">Les organisateurs verront votre catalogue et feront leurs selections ici.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {selections.map(sel => {
                  const statusConfig = {
                    pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: Clock },
                    in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-700', icon: Edit },
                    ready: { label: 'Pret a publier', color: 'bg-green-100 text-green-700', icon: CheckCircle },
                  };
                  const sc = statusConfig[sel.status] || statusConfig.pending;
                  const customizedCount = (sel.products || []).filter(p => p.customized).length;
                  return (
                    <div key={sel.selection_id} className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid={`selection-${sel.selection_id}`}>
                      {/* Selection header */}
                      <div className="p-5 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                          {sel.organizer_logo ? (
                            <img src={sel.organizer_logo} alt="" className="w-full h-full object-contain p-1" />
                          ) : (
                            <Users className="w-7 h-7 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-heading font-bold text-base uppercase">{sel.organizer_name}</h4>
                          <p className="text-[11px] text-slate-500">{sel.products?.length || 0} produit(s) selectionne(s) — {customizedCount} personnalise(s)</p>
                          <p className="text-[10px] text-slate-400">{sel.updated_at ? format(new Date(sel.updated_at), 'dd MMM yyyy HH:mm', { locale: fr }) : ''}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${sc.color}`}>
                            <sc.icon className="w-3 h-3 inline mr-1" />{sc.label}
                          </span>
                          {sel.status === 'pending' && (
                            <Button size="sm" className="h-8 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded gap-1" onClick={() => handleSelectionStatus(sel.selection_id, 'in_progress')}>
                              <Edit className="w-3 h-3" /> Demarrer
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Products grid */}
                      <div className="p-5">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {(sel.products || []).map((prod, idx) => {
                            const prodImgs = prod.customized_images?.length > 0 ? prod.customized_images : (prod.images?.length > 0 ? prod.images : (prod.image_url ? [prod.image_url] : []));
                            return (
                              <div key={idx} className={`border rounded-lg overflow-hidden ${prod.customized ? 'border-green-300 bg-green-50/30' : 'border-slate-200'}`} data-testid={`sel-product-${idx}`}>
                                <div className="relative aspect-[3/4] bg-slate-50 flex items-center justify-center overflow-hidden">
                                  {prodImgs.length > 0 ? (
                                    <img src={prodImgs[0]} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <Package className="w-12 h-12 text-slate-200" />
                                  )}
                                  {prod.customized && (
                                    <div className="absolute top-2 right-2">
                                      <CheckCircle className="w-5 h-5 text-green-500 bg-white rounded-full" />
                                    </div>
                                  )}
                                  {prod.customized_images?.length > 1 && (
                                    <span className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-0.5 text-[10px] font-bold rounded">{prod.customized_images.length} photos</span>
                                  )}
                                </div>
                                <div className="p-3">
                                  <h5 className="font-heading font-bold text-xs leading-tight line-clamp-2 mb-2">{prod.name}</h5>
                                  {prod.customized ? (
                                    <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Personnalise</span>
                                  ) : (
                                    <Button size="sm" className="w-full h-7 text-[11px] bg-brand hover:bg-brand/90 text-white rounded gap-1" onClick={() => { setActiveSelection({ selectionId: sel.selection_id, productIndex: idx, product: prod }); setCustomizeImages([]); }}>
                                      <ImagePlus className="w-3 h-3" /> Personnaliser
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Customize dialog */}
            <Dialog open={!!activeSelection} onOpenChange={(open) => { if (!open) { setActiveSelection(null); setCustomizeImages([]); } }}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-heading text-xl uppercase">Personnaliser le produit</DialogTitle>
                  <DialogDescription className="sr-only">Ajouter les photos personnalisees avec le logo de l'organisateur</DialogDescription>
                </DialogHeader>
                {activeSelection && (
                  <div className="space-y-4 pt-4">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <p className="font-heading font-bold text-sm">{activeSelection.product?.name}</p>
                      <p className="text-[11px] text-slate-500 mt-1">Ajoutez les photos du produit personnalise avec le logo de l'organisateur.</p>
                    </div>

                    {/* Current images */}
                    {customizeImages.length > 0 && (
                      <div className="grid grid-cols-5 gap-2">
                        {customizeImages.map((img, i) => (
                          <div key={i} className="relative aspect-square bg-slate-50 rounded-lg overflow-hidden border border-slate-200 group">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <button onClick={() => setCustomizeImages(prev => prev.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {customizeImages.length < 10 && (
                      <div>
                        <input ref={customizeInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleCustomizeUpload(e.target.files, activeSelection.selectionId, activeSelection.productIndex)} />
                        <Button type="button" variant="outline" className="w-full h-12 text-xs gap-2 border-dashed rounded" onClick={() => customizeInputRef.current?.click()} disabled={uploadingCustomize}>
                          {uploadingCustomize ? <><Loader2 className="w-4 h-4 animate-spin" /> Upload en cours...</> : <><ImagePlus className="w-5 h-5" /> Ajouter les photos personnalisees ({customizeImages.length}/10)</>}
                        </Button>
                      </div>
                    )}

                    <Button className="w-full bg-brand hover:bg-brand/90 text-white font-heading font-bold uppercase rounded" onClick={() => handleSaveCustomization(activeSelection.selectionId, activeSelection.productIndex)} disabled={customizeImages.length === 0}>
                      Enregistrer la personnalisation
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </motion.div>
        )}


        {/* ===== IMPORT TOPTEX ===== */}
        {activeSection === 'import' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="provider-import-section">
            <h3 className="font-heading font-bold text-base uppercase mb-4">Import Catalogue TopTex</h3>

            {/* ---- LOOKUP BY REFERENCE ---- */}
            <div className="bg-white border border-slate-200 p-6 mb-6">
              <h4 className="font-heading font-bold uppercase text-xs mb-3">Recherche par reference</h4>
              <p className="text-xs text-slate-500 mb-4">Tapez une reference TopTex et le systeme recupere automatiquement toutes les infos du produit.</p>
              <div className="flex gap-3 items-end">
                <div className="flex-1 max-w-xs">
                  <Label className="text-[10px] font-heading uppercase text-slate-400">Reference TopTex</Label>
                  <Input value={lookupRef} onChange={(e) => setLookupRef(e.target.value.toUpperCase())} placeholder="Ex: PA4045, K356, KP111..."
                    onKeyDown={(e) => e.key === 'Enter' && handleLookup()} className="font-mono text-sm h-10" data-testid="lookup-ref-input" />
                </div>
                <Button className="bg-brand hover:bg-brand/90 text-white font-heading font-bold uppercase text-xs gap-2 h-10" onClick={handleLookup} disabled={lookupLoading} data-testid="lookup-btn">
                  {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {lookupLoading ? 'Recherche...' : 'Rechercher'}
                </Button>
              </div>

              {/* Lookup result */}
              {lookupResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 border border-brand/30 bg-brand/5 p-4" data-testid="lookup-result">
                  <div className="flex gap-4">
                    <div className="w-32 h-32 bg-white border overflow-hidden flex-shrink-0">
                      <img src={lookupResult.image_url} alt={lookupResult.name} className="w-full h-full object-contain" onError={(e) => { e.target.style.display='none'; }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-xs font-bold text-brand bg-brand/10 px-2 py-0.5">{lookupResult.ref}</span>
                          {lookupResult.brand && <span className="ml-2 text-xs font-bold text-slate-500">{lookupResult.brand}</span>}
                        </div>
                        <span className="font-heading font-black text-xl text-brand">{lookupResult.price > 0 ? `${lookupResult.price.toFixed(2)}€` : 'Prix sur demande'}</span>
                      </div>
                      <h4 className="font-heading font-bold text-sm mt-1">{lookupResult.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{lookupResult.description}</p>
                      {lookupResult.sizes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="text-[10px] text-slate-400">Tailles:</span>
                          {lookupResult.sizes.map(s => <span key={s} className="bg-white px-1.5 py-0.5 text-[10px] font-bold border">{s}</span>)}
                        </div>
                      )}
                      {lookupResult.colors.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-[10px] text-slate-400">Couleurs:</span>
                          {lookupResult.colors.map(c => <span key={c} className="bg-white px-1.5 py-0.5 text-[10px] font-bold border">{c}</span>)}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-3">
                        <Button className="bg-brand hover:bg-brand/90 text-white font-heading font-bold uppercase text-xs gap-2" onClick={handleAddSingle} data-testid="add-single-btn">
                          <Plus className="w-3 h-3" /> Ajouter au catalogue
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setLookupResult(null)}>Annuler</Button>
                        {lookupResult.source_url && (
                          <a href={lookupResult.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand hover:underline">Voir sur TopTex</a>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}


        {/* ===== IMPORT XD CONNECTS ===== */}
        {activeSection === 'import-xd' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="provider-import-xd-section">
            <h3 className="font-heading font-bold text-base uppercase mb-4">Import Catalogue XD Connects / Xindao</h3>

            {/* LOOKUP BY REFERENCE */}
            <div className="bg-white border border-slate-200 p-6 mb-6">
              <h4 className="font-heading font-bold uppercase text-xs mb-3">Recherche par reference</h4>
              <p className="text-xs text-slate-500 mb-4">Tapez une reference XD Connects (Xindao, IQONIQ, XD Design, VINGA, Urban Vitamin...) et le systeme recupere automatiquement toutes les infos du produit.</p>
              <div className="flex gap-3 items-end">
                <div className="flex-1 max-w-xs">
                  <Label className="text-[10px] font-heading uppercase text-slate-400">Reference XD Connects</Label>
                  <Input value={xdLookupRef} onChange={(e) => setXdLookupRef(e.target.value.toUpperCase())} placeholder="Ex: T9101, P706.33, V43009..."
                    onKeyDown={(e) => e.key === 'Enter' && handleXdLookup()} className="font-mono text-sm h-10" data-testid="xd-lookup-ref-input" />
                </div>
                <Button className="bg-brand hover:bg-brand/90 text-white font-heading font-bold uppercase text-xs gap-2 h-10" onClick={handleXdLookup} disabled={xdLookupLoading} data-testid="xd-lookup-btn">
                  {xdLookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {xdLookupLoading ? 'Recherche...' : 'Rechercher'}
                </Button>
              </div>

              {/* XD Lookup result */}
              {xdLookupResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 border border-brand/30 bg-brand/5 p-4" data-testid="xd-lookup-result">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-white border overflow-hidden flex-shrink-0">
                      <img src={xdLookupResult.image_url} alt={xdLookupResult.name} className="w-full h-full object-contain" onError={(e) => { e.target.style.display='none'; }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-xs font-bold text-brand bg-brand/10 px-2 py-0.5">{xdLookupResult.ref}</span>
                          {xdLookupResult.brand && <span className="ml-2 text-xs font-bold text-slate-500">{xdLookupResult.brand}</span>}
                          {xdLookupResult.category && <span className="ml-2 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 uppercase">{xdLookupResult.category}</span>}
                        </div>
                        <span className="font-heading font-black text-xl text-brand">{xdLookupResult.price > 0 ? `${xdLookupResult.price.toFixed(2)}€` : 'Prix sur demande'}</span>
                      </div>
                      <h4 className="font-heading font-bold text-sm mt-1">{xdLookupResult.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{xdLookupResult.short_description || xdLookupResult.description}</p>
                      {xdLookupResult.material && (
                        <p className="text-[10px] text-slate-500 mt-1">Matiere: {xdLookupResult.material}{xdLookupResult.grammage ? ` — ${xdLookupResult.grammage}` : ''}</p>
                      )}
                      {xdLookupResult.sizes?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="text-[10px] text-slate-400">Tailles:</span>
                          {xdLookupResult.sizes.map(s => <span key={s} className="bg-white px-1.5 py-0.5 text-[10px] font-bold border">{s}</span>)}
                        </div>
                      )}
                      {xdLookupResult.colors?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-[10px] text-slate-400">Couleurs:</span>
                          {xdLookupResult.colors.map(c => <span key={c} className="bg-white px-1.5 py-0.5 text-[10px] font-bold border">{c}</span>)}
                        </div>
                      )}
                      {xdLookupResult.usps?.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {xdLookupResult.usps.slice(0, 3).map((usp, i) => (
                            <p key={i} className="text-[10px] text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3 flex-shrink-0" />{usp}</p>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-3">
                        <Button className="bg-brand hover:bg-brand/90 text-white font-heading font-bold uppercase text-xs gap-2" onClick={handleXdAddSingle} data-testid="xd-add-single-btn">
                          <Plus className="w-3 h-3" /> Ajouter au catalogue
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setXdLookupResult(null)}>Annuler</Button>
                        {xdLookupResult.source_url && (
                          <a href={xdLookupResult.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand hover:underline">Voir sur XD Connects</a>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}


        {/* Finances */}
        {activeSection === 'finances' && financialData && (
          <ProviderFinances financialData={financialData} />
        )}

        {/* Ventes */}
        {activeSection === 'ventes' && salesData && (
          <ProviderSales salesData={salesData} />
        )}


        {/* Logos organisateurs */}
        {activeSection === 'logos' && (
          <div data-testid="logos-section">
            <div className="mb-4">
              <h3 className="font-heading font-bold text-base uppercase">Logos des organisateurs</h3>
              <p className="text-xs text-slate-500">Logos HD transmis par les organisateurs pour la personnalisation de leurs produits</p>
            </div>
            {organizerLogos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizerLogos.map(org => (
                  <div key={org.user_id} className="bg-white border border-slate-200 p-4" data-testid={`logo-${org.user_id}`}>
                    <div className="h-32 border border-slate-100 bg-slate-50 flex items-center justify-center mb-3 overflow-hidden">
                      <img src={org.logo_url} alt={org.name} className="max-w-full max-h-full object-contain" />
                    </div>
                    <h4 className="font-heading font-bold text-sm">{org.name}</h4>
                    <p className="text-xs text-slate-400">{org.email}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Reçu le {org.logo_uploaded_at && format(new Date(org.logo_uploaded_at), 'd MMM yyyy', { locale: fr })}</p>
                    <a href={org.logo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand font-bold mt-2 hover:underline">
                      Télécharger HD <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <p className="text-slate-400">Aucun logo reçu pour le moment. Les organisateurs doivent importer leur logo depuis leur espace Boutique.</p>
              </div>
            )}
          </div>
        )}

        {/* Orders */}
        {activeSection === 'commandes' && (
          <div className="bg-white border border-slate-200">
            <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase text-sm">Commandes ({orders.length})</h3></div>
            {orders.length > 0 ? (
              <div className="divide-y">
                {orders.map(o => (
                  <div key={o.order_id} className="p-4 hover:bg-slate-50" data-testid={`provider-order-${o.order_id}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-brand font-bold">{o.order_id}</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-green-100 text-green-700">{o.status}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${o.delivery_method === 'Livraison à domicile' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{o.delivery_method || 'Sur place'}</span>
                        </div>
                        <p className="font-heading font-bold text-sm mt-1">{o.user_name}</p>
                        <p className="text-xs text-slate-500">{o.user_email}</p>
                        {o.shipping_address && <p className="text-xs text-slate-400 mt-0.5">{o.shipping_address}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-heading font-bold text-lg">{o.total?.toFixed(2)}€</p>
                        <p className="text-[10px] text-slate-400 mt-1">{o.created_at && format(new Date(o.created_at), 'd MMM yyyy HH:mm', { locale: fr })}</p>
                      </div>
                    </div>
                    <div className="mt-2 bg-slate-50 p-2">
                      {o.items?.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1">
                          <span className="font-medium">{item.product_name} {item.size && <span className="text-slate-400">Taille: {item.size}</span>} {item.color && <span className="text-slate-400">Couleur: {item.color}</span>} x{item.quantity}</span>
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

        {/* Messages */}
        {activeSection === 'messages' && (
          <ProviderMessages
            user={user}
            conversations={conversations}
            organizersList={organizersList}
            activeChat={activeChat}
            messages={messages}
            newMsg={newMsg}
            setNewMsg={setNewMsg}
            openChat={openChat}
            sendMessage={sendMessage}
          />
        )}
      </div>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={(open) => { setShowProductDialog(open); if (!open) setEditingProduct(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl uppercase">{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
            <DialogDescription className="sr-only">Formulaire produit prestataire</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label className="text-xs font-heading uppercase text-slate-500">Nom du produit *</Label><Input value={productForm.name} onChange={(e) => setProductForm(p => ({ ...p, name: e.target.value }))} data-testid="provider-product-name" /></div>
            <div><Label className="text-xs font-heading uppercase text-slate-500">Description</Label><Input value={productForm.description} onChange={(e) => setProductForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-heading uppercase text-slate-500">Catégorie</Label>
                <Select value={productForm.category} onValueChange={(v) => setProductForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-heading uppercase text-slate-500">Prix (€) *</Label><Input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm(p => ({ ...p, price: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs font-heading uppercase text-slate-500">Commission suggérée (€)</Label><Input type="number" step="0.5" value={productForm.suggested_commission} onChange={(e) => setProductForm(p => ({ ...p, suggested_commission: e.target.value }))} /></div>
              <div><Label className="text-xs font-heading uppercase text-slate-500">Stock</Label><Input type="number" value={productForm.stock} onChange={(e) => setProductForm(p => ({ ...p, stock: parseInt(e.target.value) || 0 }))} /></div>
            </div>

            {/* Multi-image gallery upload */}
            <div>
              <Label className="text-xs font-heading uppercase text-slate-500 mb-2 block">Photos du produit ({(productForm.images || []).length}/10)</Label>
              {(productForm.images || []).length > 0 && (
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {(productForm.images || []).map((img, i) => (
                    <div key={i} className="relative aspect-square bg-slate-50 rounded-lg overflow-hidden border border-slate-200 group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeFormImage(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                      {i === 0 && <span className="absolute bottom-1 left-1 bg-brand text-white text-[8px] font-bold px-1 rounded">Principal</span>}
                    </div>
                  ))}
                </div>
              )}
              {(productForm.images || []).length < 10 && (
                <div className="flex gap-2">
                  <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(e.target.files)} />
                  <Button type="button" variant="outline" className="flex-1 h-10 text-xs gap-2 border-dashed" onClick={() => imageInputRef.current?.click()} disabled={uploadingImages}>
                    {uploadingImages ? <><Loader2 className="w-4 h-4 animate-spin" /> Upload...</> : <><ImagePlus className="w-4 h-4" /> Ajouter des photos</>}
                  </Button>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1">Jusqu'à 10 photos. La première sera l'image principale.</p>
            </div>

            <div><Label className="text-xs font-heading uppercase text-slate-500">Ou URL image externe</Label><Input value={productForm.image_url} onChange={(e) => setProductForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." /></div>
            <div><Label className="text-xs font-heading uppercase text-slate-500">Tailles (séparées par des virgules)</Label><Input value={(productForm.sizes || []).join(', ')} onChange={(e) => setProductForm(p => ({ ...p, sizes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="S, M, L, XL" /></div>
            <div><Label className="text-xs font-heading uppercase text-slate-500">Couleurs (séparées par des virgules)</Label><Input value={(productForm.colors || []).join(', ')} onChange={(e) => setProductForm(p => ({ ...p, colors: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="Noir, Blanc, Bleu" /></div>
            <Button className="w-full bg-brand hover:bg-brand/90 text-white font-heading font-bold uppercase" onClick={handleSaveProduct} data-testid="save-provider-product">{editingProduct ? 'Enregistrer' : 'Ajouter au catalogue'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderDashboard;
