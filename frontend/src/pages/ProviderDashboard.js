import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ShoppingBag, Package, Euro, TrendingUp, FileText, Plus, Edit, Trash2,
  MessageSquare, Send, Loader2, X, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'sonner';

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

  const categories = ['Textile', 'Accessoire', 'Gourde', 'Sac', 'Nutrition', 'Équipement'];

  const fetchData = useCallback(async () => {
    try {
      const [catRes, ordRes, statsRes, convRes, logosRes] = await Promise.all([
        api.get('/provider/catalog'),
        api.get('/provider/orders'),
        api.get('/provider/stats'),
        api.get('/provider/conversations'),
        api.get('/provider/organizer-logos')
      ]);
      setProducts(catRes.data.products || []);
      setOrders(ordRes.data.orders || []);
      setStats(statsRes.data || {});
      setConversations(convRes.data.conversations || []);
      setOrganizerLogos(logosRes.data.organizers || []);
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="loader" /></div>;

  const statCards = [
    { label: 'Produits', value: stats.total_products || 0, icon: Package, color: 'text-violet-500' },
    { label: 'Commandes', value: stats.total_orders || 0, icon: FileText, color: 'text-blue-500' },
    { label: 'Ventes totales', value: `${(stats.total_sales || 0).toFixed(0)}€`, icon: Euro, color: 'text-green-600' },
    { label: 'Revenu net', value: `${(stats.net_revenue || 0).toFixed(0)}€`, icon: TrendingUp, color: 'text-brand' },
  ];

  const navItems = [
    { id: 'catalogue', label: 'Catalogue', icon: ShoppingBag },
    { id: 'logos', label: 'Logos organisateurs', icon: FileText, badge: organizerLogos.length },
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
                  {p.sizes?.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{p.sizes.map(s => <span key={s} className="bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold">{s}</span>)}</div>}
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
            {/* Conversation list */}
            <div className="border-r border-slate-200">
              <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase text-sm">Conversations</h3></div>
              {conversations.length > 0 ? conversations.map(c => (
                <button key={c.user_id} onClick={() => openChat(c.user_id)} className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${activeChat === c.user_id ? 'bg-brand/5 border-l-2 border-l-brand' : ''}`} data-testid={`chat-${c.user_id}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-heading font-bold text-sm truncate">{c.name}</p>
                    {c.unread > 0 && <span className="bg-brand text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{c.unread}</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase">{c.role === 'organizer' ? 'Organisateur' : c.role}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{c.last_message}</p>
                </button>
              )) : (
                <div className="p-8 text-center text-slate-400 text-sm">Aucune conversation</div>
              )}
            </div>
            {/* Chat */}
            <div className="col-span-2 flex flex-col">
              {activeChat ? (
                <>
                  <div className="p-4 border-b bg-slate-50">
                    <p className="font-heading font-bold text-sm">{chatPartner?.name || 'Conversation'}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{chatPartner?.role === 'organizer' ? 'Organisateur' : chatPartner?.role}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[380px]">
                    {messages.map(m => (
                      <div key={m.message_id} className={`flex ${m.sender_id === user?.user_id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-3 py-2 text-sm ${m.sender_id === user?.user_id ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700'}`}>
                          <p>{m.content}</p>
                          <p className={`text-[10px] mt-1 ${m.sender_id === user?.user_id ? 'text-white/60' : 'text-slate-400'}`}>{m.created_at && format(new Date(m.created_at), 'HH:mm', { locale: fr })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t flex gap-2">
                    <Input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Votre message..." onKeyDown={(e) => e.key === 'Enter' && sendMessage()} className="flex-1" data-testid="provider-msg-input" />
                    <Button className="bg-brand hover:bg-brand/90 text-white" onClick={sendMessage} data-testid="provider-msg-send"><Send className="w-4 h-4" /></Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Sélectionnez une conversation</div>
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
