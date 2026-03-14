import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ShoppingBag, Package, Euro, TrendingUp, FileText, Plus, Edit, Trash2,
  MessageSquare, Send, Loader2, X, ChevronRight, PieChart as PieChartIcon, BarChart3, Users, ArrowDownRight, Upload, Check, Search
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
  const [productForm, setProductForm] = useState({ name: '', description: '', category: 'Textile', price: '', suggested_commission: 5, image_url: '', sizes: [], colors: [], stock: 100 });
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
  const [importFilter, setImportFilter] = useState('');
  // TopTex lookup by ref
  const [lookupRef, setLookupRef] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);

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
    setImportProducts([]);
    setImportSelected(new Set());
    try {
      const formData = new FormData();
      formData.append('file', file);
      // Step 1: Upload the PDF
      const uploadRes = await api.post('/provider/import/parse-pdf', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 });
      const taskId = uploadRes.data.task_id;
      if (!taskId) {
        // Legacy response (direct products)
        setImportProducts(uploadRes.data.products || []);
        toast.success(`${uploadRes.data.total} produits trouvés !`);
        setParsing(false);
        return;
      }
      toast.info('PDF uploadé, analyse en cours...');
      // Step 2: Poll for results
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes max polling
      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 2000)); // Poll every 2s
        attempts++;
        try {
          const statusRes = await api.get(`/provider/import/pdf-status/${taskId}`);
          if (statusRes.data.status === 'done') {
            setImportProducts(statusRes.data.products || []);
            toast.success(`${statusRes.data.total} produits trouvés dans le catalogue !`);
            setParsing(false);
            return;
          }
          // Still processing, continue polling
        } catch (pollErr) {
          if (pollErr.response?.status === 500) {
            toast.error(pollErr.response?.data?.detail || 'Erreur analyse PDF');
            setParsing(false);
            return;
          }
        }
      }
      toast.error('Le traitement a pris trop de temps. Essayez avec un fichier plus petit.');
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur upload PDF'); }
    finally { setParsing(false); }
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="loader" /></div>;

  const statCards = [
    { label: 'Produits', value: stats.total_products || 0, icon: Package, color: 'text-violet-500' },
    { label: 'Commandes', value: stats.total_orders || 0, icon: FileText, color: 'text-blue-500' },
    { label: 'Ventes totales', value: `${(stats.total_sales || 0).toFixed(0)}€`, icon: Euro, color: 'text-green-600' },
    { label: 'Revenu net', value: `${(stats.net_revenue || 0).toFixed(0)}€`, icon: TrendingUp, color: 'text-brand' },
  ];

  const navItems = [
    { id: 'catalogue', label: 'Catalogue', icon: ShoppingBag },
    { id: 'import', label: 'Import TopTex', icon: Package },
    { id: 'finances', label: 'Finances', icon: Euro },
    { id: 'ventes', label: 'Ventes', icon: BarChart3 },
    { id: 'logos', label: 'Logos', icon: FileText, badge: organizerLogos.length },
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
          <Button className="bg-brand hover:bg-brand/90 text-white font-heading font-bold uppercase text-xs gap-2" onClick={() => { setEditingProduct(null); setProductForm({ name: '', description: '', category: 'Textile', price: '', suggested_commission: 5, image_url: '', sizes: [], colors: [], stock: 100 }); setShowProductDialog(true); }} data-testid="add-provider-product-btn">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(p => (
              <motion.div key={p.product_id} className="bg-white border border-slate-200 overflow-hidden group hover:border-brand transition-colors" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} data-testid={`provider-product-${p.product_id}`}>
                <div className="relative h-48 bg-slate-50 flex items-center justify-center overflow-hidden">
                  {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <Package className="w-16 h-16 text-slate-200" />}
                  <div className="absolute top-3 left-3"><span className="bg-brand text-white px-2 py-0.5 text-[10px] font-bold uppercase">{p.category}</span></div>
                  <div className="absolute top-3 right-3"><span className="bg-slate-900 text-white px-2.5 py-1 font-heading font-bold text-sm">{p.price}€</span></div>
                </div>
                <div className="p-4">
                  <h4 className="font-heading font-bold text-base mb-1">{p.name}</h4>
                  {p.description && <p className="text-xs text-slate-500 line-clamp-2 mb-2">{p.description}</p>}
                  {p.sizes?.length > 0 && <div className="flex flex-wrap gap-1 mb-2"><span className="text-[10px] text-slate-400 mr-1">Tailles:</span>{p.sizes.map(s => <span key={s} className="bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold">{s}</span>)}</div>}
                  {p.colors?.length > 0 && <div className="flex flex-wrap gap-1 mb-2"><span className="text-[10px] text-slate-400 mr-1">Couleurs:</span>{p.colors.map(c => <span key={c} className="bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold">{c}</span>)}</div>}
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <span>Stock: <strong>{p.stock}</strong></span>
                    <span>Commission suggérée: <strong className="text-green-600">{p.suggested_commission}€</strong>/unité</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => { setEditingProduct(p); setProductForm({ name: p.name, description: p.description, category: p.category, price: p.price, suggested_commission: p.suggested_commission, image_url: p.image_url, sizes: p.sizes || [], colors: p.colors || [], stock: p.stock }); setShowProductDialog(true); }}><Edit className="w-3 h-3" /> Modifier</Button>
                    <Button variant="outline" size="sm" className="h-8 text-red-500" onClick={() => handleDeleteProduct(p.product_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </motion.div>
            ))}
            {products.length === 0 && (
              <div className="col-span-full bg-white border border-slate-200 p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <h3 className="font-heading font-bold text-lg uppercase mb-2">Aucun produit</h3>
                <p className="text-slate-500 mb-4">Créez votre catalogue pour que les organisateurs puissent sélectionner vos produits</p>
              </div>
            )}
          </div>
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

            {/* ---- PDF IMPORT ---- */}

            {importProducts.length === 0 ? (
              <div className="bg-white border border-slate-200 p-8">
                <div className="text-center max-w-md mx-auto">
                  <div className="w-20 h-20 bg-brand/10 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-10 h-10 text-brand" />
                  </div>
                  <h4 className="font-heading font-bold text-lg uppercase mb-2">Import en masse depuis un PDF</h4>
                  <p className="text-sm text-slate-500 mb-6">
                    Uploadez votre catalogue TopTex au format PDF. Le systeme analysera automatiquement toutes les references produits, prix, tailles et couleurs.
                  </p>
                  <label className="cursor-pointer">
                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => handlePdfUpload(e.target.files[0])} disabled={parsing} data-testid="toptex-pdf-input" />
                    <Button className="bg-brand hover:bg-brand/90 text-white font-heading font-bold uppercase gap-2 h-12 px-8" disabled={parsing} asChild>
                      <span>
                        {parsing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours...</> : <><Upload className="w-4 h-4" /> Choisir le fichier PDF</>}
                      </span>
                    </Button>
                  </label>
                  <p className="text-[10px] text-slate-400 mt-3">Fichier PDF du catalogue sport TopTex (European Textile Catalogue)</p>
                </div>
              </div>
            ) : (
              <div>
                {/* Toolbar */}
                <div className="bg-white border border-slate-200 p-4 mb-4 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400" />
                    <Input placeholder="Filtrer par nom, référence ou catégorie..." value={importFilter} onChange={(e) => setImportFilter(e.target.value)} className="h-9 text-sm" data-testid="import-filter" />
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={toggleImportAll} className="text-xs font-heading font-bold text-brand hover:underline" data-testid="import-select-all">
                      {importSelected.size === filteredImportProducts.length ? 'Tout désélectionner' : `Tout sélectionner (${filteredImportProducts.length})`}
                    </button>
                    <span className="text-xs text-slate-400">{importSelected.size} sélectionné(s)</span>
                    <Button className="bg-brand hover:bg-brand/90 text-white font-heading font-bold uppercase text-xs gap-2" onClick={handleImportConfirm} disabled={importing || importSelected.size === 0} data-testid="import-confirm-btn">
                      {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Importer ({importSelected.size})
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => { setImportProducts([]); setImportSelected(new Set()); setImportFilter(''); }}>
                      <X className="w-3 h-3 mr-1" /> Annuler
                    </Button>
                  </div>
                </div>

                {/* Products grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredImportProducts.map(p => {
                    const isSelected = importSelected.has(p.ref);
                    return (
                      <div key={p.ref} onClick={() => toggleImportSelect(p.ref)}
                        className={`bg-white border-2 p-3 cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-brand bg-brand/5' : 'border-slate-200'}`}
                        data-testid={`import-product-${p.ref}`}>
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-mono text-[10px] font-bold text-brand bg-brand/10 px-1.5 py-0.5">{p.ref}</span>
                          <div className={`w-5 h-5 border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-brand bg-brand' : 'border-slate-300'}`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <div className="w-full h-28 bg-slate-100 mb-2 overflow-hidden">
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" onError={(e) => { e.target.style.display='none'; }} />
                        </div>
                        <h4 className="font-heading font-bold text-xs line-clamp-2 mb-1 leading-tight">{p.name}</h4>
                        <p className="text-xs text-slate-400 mb-1">{p.category}</p>
                        <p className="font-heading font-bold text-sm text-brand">{p.price > 0 ? `${p.price.toFixed(2)}€` : 'Prix sur demande'}</p>
                        {p.sizes.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-1">
                            {p.sizes.slice(0, 5).map(s => <span key={s} className="bg-slate-100 px-1 py-0.5 text-[9px] font-bold">{s}</span>)}
                            {p.sizes.length > 5 && <span className="text-[9px] text-slate-400">+{p.sizes.length - 5}</span>}
                          </div>
                        )}
                        {p.colors.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-1">
                            {p.colors.slice(0, 3).map(c => <span key={c} className="text-[9px] text-slate-500">{c}</span>).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, <span key={`s${i}`} className="text-[9px] text-slate-300">·</span>, curr], [])}
                            {p.colors.length > 3 && <span className="text-[9px] text-slate-400"> +{p.colors.length - 3}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}


        {/* ===== FINANCES ===== */}
        {activeSection === 'finances' && financialData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="provider-finances-section">
            <h3 className="font-heading font-bold text-base uppercase mb-4">Bilan Financier & Commissions</h3>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-slate-200 p-5 text-center">
                <Euro className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="font-heading font-black text-3xl">{financialData.total_sales.toFixed(0)}€</p>
                <p className="text-xs text-slate-500 font-heading uppercase mt-1">Ventes totales</p>
              </div>
              <div className="bg-white border border-red-200 p-5 text-center">
                <ArrowDownRight className="w-6 h-6 text-red-500 mx-auto mb-2" />
                <p className="font-heading font-black text-3xl text-red-600">{financialData.total_commission.toFixed(0)}€</p>
                <p className="text-xs text-slate-500 font-heading uppercase mt-1">Commissions dues</p>
              </div>
              <div className="bg-white border border-brand/30 p-5 text-center">
                <TrendingUp className="w-6 h-6 text-brand mx-auto mb-2" />
                <p className="font-heading font-black text-3xl text-brand">{financialData.net_revenue.toFixed(0)}€</p>
                <p className="text-xs text-slate-500 font-heading uppercase mt-1">Revenu net</p>
              </div>
            </div>

            {/* Commission breakdown by organizer */}
            <div className="bg-white border border-slate-200">
              <div className="p-4 border-b flex items-center justify-between">
                <h4 className="font-heading font-bold uppercase text-sm">Commissions par organisateur</h4>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              {financialData.by_organizer.length > 0 ? (
                <div className="divide-y">
                  {financialData.by_organizer.map(org => (
                    <div key={org.organizer_id} className="p-4 hover:bg-slate-50 transition-colors" data-testid={`finance-org-${org.organizer_id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-heading font-bold text-sm">{org.name || 'Organisateur'}</p>
                          <p className="text-xs text-slate-400">{org.orders_count} commande{org.orders_count > 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-heading font-bold text-lg">{org.total_sales.toFixed(2)}€</p>
                          <p className="text-[10px] text-slate-400">ventes</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1 bg-slate-50 p-2">
                          <p className="text-[10px] text-slate-400 font-heading uppercase">Commission à reverser</p>
                          <p className="font-heading font-bold text-red-600">{org.total_commission.toFixed(2)}€</p>
                        </div>
                        <div className="flex-1 bg-slate-50 p-2">
                          <p className="text-[10px] text-slate-400 font-heading uppercase">Revenu net</p>
                          <p className="font-heading font-bold text-green-600">{org.net_revenue.toFixed(2)}€</p>
                        </div>
                      </div>
                      {/* Progress bar: commission/total */}
                      <div className="mt-2 h-2 bg-slate-100 overflow-hidden">
                        <div className="h-full bg-brand" style={{ width: `${org.total_sales > 0 ? ((org.net_revenue / org.total_sales) * 100) : 0}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{org.total_sales > 0 ? ((org.net_revenue / org.total_sales) * 100).toFixed(1) : 0}% de marge nette</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">Aucune commission pour le moment</div>
              )}
            </div>
          </motion.div>
        )}

        {/* ===== VENTES ===== */}
        {activeSection === 'ventes' && salesData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="provider-sales-section">
            <h3 className="font-heading font-bold text-base uppercase mb-4">Répartition des Ventes</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Top products bar chart */}
              <div className="bg-white border border-slate-200 p-6">
                <h4 className="font-heading font-bold uppercase text-xs mb-4">Top produits vendus</h4>
                {salesData.top_products.length > 0 ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesData.top_products} layout="vertical" margin={{ left: 0, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ fontFamily: 'var(--font-heading)', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 0 }}
                          formatter={(v, name) => [name === 'quantity' ? `${v} unités` : `${v}€`, name === 'quantity' ? 'Quantité' : 'Chiffre d\'affaires']} />
                        <Bar dataKey="quantity" fill="#ff4500" radius={[0, 3, 3, 0]} name="quantity" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-56 flex items-center justify-center text-slate-400 text-xs">Pas de données</div>
                )}
              </div>

              {/* Category breakdown pie chart */}
              <div className="bg-white border border-slate-200 p-6">
                <h4 className="font-heading font-bold uppercase text-xs mb-4">Ventes par catégorie</h4>
                {salesData.by_category.length > 0 ? (
                  <div className="flex items-center gap-4 h-56">
                    <div className="w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={salesData.by_category} cx="50%" cy="50%" innerRadius={40} outerRadius={75}
                            paddingAngle={3} dataKey="value" strokeWidth={0}>
                            {salesData.by_category.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => [`${v} unités`, 'Vendu']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-1/2 space-y-2">
                      {salesData.by_category.map((c, i) => (
                        <div key={c.name} className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="flex-1 font-medium truncate">{c.name}</span>
                          <span className="font-heading font-bold">{c.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-56 flex items-center justify-center text-slate-400 text-xs">Pas de données</div>
                )}
              </div>
            </div>

            {/* Size distribution */}
            {salesData.by_size.length > 0 && (
              <div className="bg-white border border-slate-200 p-6">
                <h4 className="font-heading font-bold uppercase text-xs mb-4">Distribution par taille</h4>
                <div className="flex gap-3 flex-wrap">
                  {salesData.by_size.map((s, i) => {
                    const max = Math.max(...salesData.by_size.map(x => x.value));
                    const pct = max > 0 ? (s.value / max) * 100 : 0;
                    return (
                      <div key={s.name} className="flex flex-col items-center" data-testid={`size-${s.name}`}>
                        <div className="w-14 bg-slate-100 relative flex items-end justify-center" style={{ height: '80px' }}>
                          <div className="w-full bg-brand absolute bottom-0" style={{ height: `${pct}%` }} />
                        </div>
                        <p className="font-heading font-bold text-xs mt-2">{s.name}</p>
                        <p className="text-[10px] text-slate-400">{s.value} unités</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Revenue table */}
            {salesData.top_products.length > 0 && (
              <div className="bg-white border border-slate-200 mt-6">
                <div className="p-4 border-b"><h4 className="font-heading font-bold uppercase text-xs">Détail chiffre d'affaires</h4></div>
                <table className="w-full">
                  <thead className="bg-slate-50 text-[10px] font-heading uppercase text-slate-400">
                    <tr>
                      <th className="text-left p-3">Produit</th>
                      <th className="text-right p-3">Quantité</th>
                      <th className="text-right p-3">CA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {salesData.top_products.map(p => (
                      <tr key={p.product_id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium">{p.name}</td>
                        <td className="p-3 text-right font-heading font-bold">{p.quantity}</td>
                        <td className="p-3 text-right font-heading font-bold text-brand">{p.revenue.toFixed(2)}€</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-heading font-bold text-sm">
                    <tr>
                      <td className="p-3">Total</td>
                      <td className="p-3 text-right">{salesData.top_products.reduce((a, p) => a + p.quantity, 0)}</td>
                      <td className="p-3 text-right text-brand">{salesData.top_products.reduce((a, p) => a + p.revenue, 0).toFixed(2)}€</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </motion.div>
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
          <div className="bg-white border border-slate-200 grid grid-cols-3 min-h-[500px]">
            {/* Conversation list — merged organizers + existing convos */}
            <div className="border-r border-slate-200 overflow-y-auto">
              <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase text-sm">Organisateurs</h3></div>
              {(() => {
                const convoMap = {};
                conversations.filter(c => c.role === 'organizer').forEach(c => { convoMap[c.user_id] = c; });
                const allOrgs = organizersList.map(o => ({
                  user_id: o.user_id,
                  name: o.company_name || o.name,
                  email: o.email,
                  last_message: convoMap[o.user_id]?.last_message || '',
                  unread: convoMap[o.user_id]?.unread || 0,
                }));
                conversations.filter(c => c.role === 'organizer' && !allOrgs.find(o => o.user_id === c.user_id)).forEach(c => {
                  allOrgs.push({ user_id: c.user_id, name: c.name, email: '', last_message: c.last_message, unread: c.unread });
                });
                return allOrgs.length > 0 ? allOrgs.map(o => (
                  <button key={o.user_id} onClick={() => openChat(o.user_id)} className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${activeChat === o.user_id ? 'bg-brand/5 border-l-2 border-l-brand' : ''}`} data-testid={`chat-org-${o.user_id}`}>
                    <div className="flex items-center justify-between">
                      <p className="font-heading font-bold text-sm truncate">{o.name}</p>
                      {o.unread > 0 && <span className="bg-brand text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{o.unread}</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase">Organisateur</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{o.last_message || 'Aucun message — Démarrer la conversation'}</p>
                  </button>
                )) : (
                  <div className="p-8 text-center text-slate-400 text-sm">Aucun organisateur inscrit sur la plateforme</div>
                );
              })()}
            </div>
            {/* Chat */}
            <div className="col-span-2 flex flex-col">
              {activeChat ? (
                <>
                  <div className="p-4 border-b bg-slate-50">
                    <p className="font-heading font-bold text-sm">{organizersList.find(o => o.user_id === activeChat)?.name || conversations.find(c => c.user_id === activeChat)?.name || 'Conversation'}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Organisateur</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[380px]">
                    {messages.length > 0 ? messages.map(m => (
                      <div key={m.message_id} className={`flex ${m.sender_id === user?.user_id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-3 py-2 text-sm ${m.sender_id === user?.user_id ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700'}`}>
                          <p>{m.content}</p>
                          <p className={`text-[10px] mt-1 ${m.sender_id === user?.user_id ? 'text-white/60' : 'text-slate-400'}`}>{m.created_at && format(new Date(m.created_at), 'HH:mm', { locale: fr })}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-slate-400 text-xs py-8">Aucun message. Envoyez le premier message pour entamer la discussion.</div>
                    )}
                  </div>
                  <div className="p-4 border-t flex gap-2">
                    <Input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Votre message..." onKeyDown={(e) => e.key === 'Enter' && sendMessage()} className="flex-1" data-testid="provider-msg-input" />
                    <Button className="bg-brand hover:bg-brand/90 text-white" onClick={sendMessage} data-testid="provider-msg-send"><Send className="w-4 h-4" /></Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Sélectionnez un organisateur pour démarrer une conversation</div>
              )}
            </div>
          </div>
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
            <div><Label className="text-xs font-heading uppercase text-slate-500">URL Image</Label><Input value={productForm.image_url} onChange={(e) => setProductForm(p => ({ ...p, image_url: e.target.value }))} /></div>
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
