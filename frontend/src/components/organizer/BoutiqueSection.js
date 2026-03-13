import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit, Trash2, Loader2, Upload, ShoppingBag, Package, Euro, FileText,
  TrendingUp, Send, Link2, Copy
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { toast } from 'sonner';

export const BoutiqueSection = ({
  events, orgLogo, logoUploading, handleLogoUpload, shopStats, shopTab, setShopTab, shopLoading,
  shopProducts, shopOrders, shopEventFilter, setShopEventFilter, fetchShopData,
  onEditProduct, onDeleteProduct, onAddProduct, showProductDialog, setShowProductDialog,
  editingProduct, productForm, setProductForm, productSaving, handleSaveProduct,
  providerCatalog, addingProviderProduct, setAddingProviderProduct, providerCommission,
  setProviderCommission, providerEventId, setProviderEventId, handleAddProviderProduct,
  providerConvos, providerChat, providerMessages, providerNewMsg, setProviderNewMsg,
  openProviderChat, sendProviderMsg, providersList
}) => {
  const productCategories = ['Textile', 'Accessoire', 'Gourde', 'Sac', 'Médaille', 'Nutrition', 'Équipement'];
  const sizeOptions = ['XXS','XS','S','M','L','XL','XXL','3XL','Unique'];
  const toggleSize = (size) => setProductForm(p => ({ ...p, sizes: p.sizes.includes(size) ? p.sizes.filter(s => s !== size) : [...p.sizes, size] }));

  return (
    <div>
      {/* Logo Upload */}
      <div className={`border p-5 mb-6 ${orgLogo ? 'bg-white border-slate-200' : 'bg-amber-50 border-amber-200'}`} data-testid="logo-upload-section">
        <div className="flex items-start gap-4">
          {orgLogo ? (
            <div className="w-20 h-20 border border-slate-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0"><img src={orgLogo} alt="Logo" className="max-w-full max-h-full object-contain" /></div>
          ) : (
            <div className="w-20 h-20 border-2 border-dashed border-amber-300 flex items-center justify-center flex-shrink-0"><Upload className="w-8 h-8 text-amber-400" /></div>
          )}
          <div className="flex-1">
            <h3 className="font-heading font-bold text-sm uppercase mb-1">{orgLogo ? 'Logo de personnalisation' : 'Étape 1 : Importez votre logo'}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {orgLogo ? 'Votre logo a été transmis au prestataire.' : 'Importez votre logo en HD pour personnaliser vos produits.'}
            </p>
            <div className="mt-2">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-heading font-bold uppercase text-brand hover:text-brand/80">
                <Upload className="w-3.5 h-3.5" /> {orgLogo ? 'Changer le logo' : 'Importer mon logo HD'}
                <input type="file" accept="image/*,.svg,.pdf" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} data-testid="logo-upload-input" />
              </label>
              {logoUploading && <Loader2 className="w-4 h-4 animate-spin inline ml-2 text-brand" />}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Produits', value: shopStats.total_products || 0, icon: ShoppingBag, color: 'text-violet-500' },
          { label: 'Commandes', value: shopStats.total_orders || 0, icon: FileText, color: 'text-blue-500' },
          { label: 'Articles vendus', value: shopStats.total_items_sold || 0, icon: Package, color: 'text-emerald-500' },
          { label: 'Ventes totales', value: `${(shopStats.total_sales || 0).toFixed(0)}€`, icon: Euro, color: 'text-green-600' },
          { label: 'Commission', value: `${(shopStats.total_commission || 0).toFixed(0)}€`, icon: TrendingUp, color: 'text-brand' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 p-4">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className="text-2xl font-heading font-bold">{s.value}</p>
            <p className="text-[10px] text-slate-500 font-heading uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['catalogue', 'prestataire', 'commandes', 'messagerie'].map(t => (
          <Button key={t} variant={shopTab === t ? 'default' : 'outline'} className={shopTab === t ? 'bg-brand' : ''} onClick={() => setShopTab(t)} data-testid={`shop-tab-${t}`}>
            {t === 'catalogue' ? 'Mes produits' : t === 'commandes' ? 'Commandes & Acheteurs' : t === 'prestataire' ? 'Catalogue prestataire' : 'Messagerie prestataire'}
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
            <Button className="btn-primary gap-2" onClick={onAddProduct} data-testid="add-product-btn"><Plus className="w-4 h-4" /> Ajouter un produit</Button>
          </div>
          {shopProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shopProducts.map(p => (
                <motion.div key={p.product_id} className="bg-white border border-slate-200 overflow-hidden group hover:border-brand transition-colors" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} data-testid={`product-card-${p.product_id}`}>
                  <div className="relative h-48 bg-gradient-to-br from-violet-50 to-slate-50 flex items-center justify-center overflow-hidden">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <ShoppingBag className="w-16 h-16 text-violet-200" />}
                    <div className="absolute top-3 left-3 flex gap-1"><span className="bg-violet-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase">{p.category}</span>{!p.active && <span className="bg-red-500 text-white px-2 py-0.5 text-[10px] font-bold uppercase">Inactif</span>}</div>
                    <div className="absolute top-3 right-3"><span className="bg-brand text-white px-2.5 py-1 font-heading font-bold text-sm">{p.price}€</span></div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-heading font-bold text-base mb-1">{p.name}</h4>
                    {p.description && <p className="text-xs text-slate-500 line-clamp-2 mb-2">{p.description}</p>}
                    {p.sizes?.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{p.sizes.map(s => <span key={s} className="bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold">{s}</span>)}</div>}
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <span>Stock: <strong className={p.stock <= 5 ? 'text-red-500' : ''}>{p.stock}</strong></span>
                      <span>Vendus: <strong className="text-brand">{p.sold || 0}</strong></span>
                      <span>Commission: <strong className="text-green-600">{p.organizer_commission}€</strong>/unité</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => onEditProduct(p)}><Edit className="w-3 h-3" /> Modifier</Button>
                      <Button variant="outline" size="sm" className="h-8 text-red-500" onClick={() => onDeleteProduct(p.product_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 p-12 text-center">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-slate-200" />
              <h3 className="font-heading font-bold text-lg uppercase mb-2">Aucun produit</h3>
              <p className="text-slate-500 mb-4">Créez votre catalogue de produits dérivés</p>
              <Button className="btn-primary gap-2" onClick={onAddProduct}><Plus className="w-4 h-4" /> Ajouter</Button>
            </div>
          )}
        </>
      ) : shopTab === 'commandes' ? (
        <div className="bg-white border border-slate-200">
          <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase text-sm">Commandes ({shopOrders.length})</h3></div>
          {shopOrders.length > 0 ? (
            <div className="divide-y">
              {shopOrders.map(o => (
                <div key={o.order_id} className="p-4 hover:bg-slate-50" data-testid={`order-row-${o.order_id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-brand font-bold">{o.order_id}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${o.status === 'confirmée' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{o.status}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${o.delivery_method === 'Livraison à domicile' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{o.delivery_method || 'Retrait sur place'}</span>
                      </div>
                      <p className="font-heading font-bold text-sm mt-1">{o.user_name}</p>
                      <p className="text-xs text-slate-500">{o.user_email} {o.phone && `— ${o.phone}`}</p>
                      {o.shipping_address && <p className="text-xs text-slate-400 mt-0.5">{o.shipping_address}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-heading font-bold text-lg">{o.total?.toFixed(2)}€</p>
                      {o.delivery_fee > 0 && <p className="text-[10px] text-slate-400">dont {o.delivery_fee?.toFixed(2)}€ livraison</p>}
                      <p className="text-xs text-green-600 font-bold">+{o.organizer_commission_total?.toFixed(2)}€ commission</p>
                      <p className="text-[10px] text-slate-400 mt-1">{o.created_at && format(new Date(o.created_at), 'd MMM yyyy HH:mm', { locale: fr })}</p>
                    </div>
                  </div>
                  <div className="mt-2 bg-slate-50 p-2">
                    {o.items?.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1">
                        <span className="font-medium">{item.product_name}{item.size && <span className="ml-1 text-slate-400">Taille: {item.size}</span>}{item.color && <span className="ml-1 text-slate-400">Couleur: {item.color}</span>} x{item.quantity}</span>
                        <span className="font-heading font-bold">{item.line_total?.toFixed(2)}€</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="p-8 text-center text-slate-400">Aucune commande</div>}
        </div>
      ) : shopTab === 'prestataire' ? (
        <div data-testid="provider-catalog-tab">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-base uppercase">Catalogue des prestataires</h3>
            <p className="text-xs text-slate-500">Sélectionnez des produits pour vos événements</p>
          </div>
          {providerCatalog.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providerCatalog.map(pp => (
                <div key={pp.product_id} className="bg-white border border-slate-200 overflow-hidden group hover:border-brand transition-colors" data-testid={`provider-catalog-${pp.product_id}`}>
                  <div className="relative h-44 bg-slate-50 flex items-center justify-center overflow-hidden">
                    {pp.image_url ? <img src={pp.image_url} alt={pp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <Package className="w-12 h-12 text-slate-200" />}
                    <div className="absolute top-3 left-3"><span className="bg-violet-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase">{pp.category}</span></div>
                    <div className="absolute top-3 right-3"><span className="bg-slate-900 text-white px-2.5 py-1 font-heading font-bold text-sm">{pp.price}€</span></div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-heading font-bold text-sm">{pp.name}</h4>
                    <p className="text-[10px] text-violet-500 font-bold uppercase mb-1">Par {pp.provider_name}</p>
                    {pp.description && <p className="text-xs text-slate-500 line-clamp-2 mb-2">{pp.description}</p>}
                    {pp.sizes?.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{pp.sizes.map(s => <span key={s} className="bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold">{s}</span>)}</div>}
                    <div className="text-xs text-slate-500 mb-3"><span>Stock: <strong>{pp.stock}</strong></span><span className="ml-3">Commission: <strong className="text-green-600">{pp.suggested_commission}€</strong></span></div>
                    {addingProviderProduct?.product_id === pp.product_id ? (
                      <div className="space-y-2 p-3 bg-slate-50 border border-slate-200">
                        <div><Label className="text-[10px] font-heading uppercase text-slate-400">Événement *</Label>
                          <Select value={providerEventId} onValueChange={setProviderEventId}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choisir..." /></SelectTrigger><SelectContent>{events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div><Label className="text-[10px] font-heading uppercase text-slate-400">Votre commission (€)</Label><Input type="number" className="h-8 text-xs" value={providerCommission} onChange={(e) => setProviderCommission(parseFloat(e.target.value) || 0)} /></div>
                        <div className="flex gap-1">
                          <Button size="sm" className="flex-1 h-8 text-xs bg-brand hover:bg-brand/90 text-white" onClick={() => handleAddProviderProduct(pp)} data-testid={`confirm-add-${pp.product_id}`}>Confirmer</Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAddingProviderProduct(null)}>Annuler</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" className="w-full h-8 text-xs bg-brand hover:bg-brand/90 text-white font-heading font-bold uppercase gap-1" onClick={() => { setAddingProviderProduct(pp); setProviderCommission(pp.suggested_commission || 5); setProviderEventId(''); }} data-testid={`add-provider-${pp.product_id}`}>
                        <Plus className="w-3 h-3" /> Ajouter à un événement
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 p-12 text-center"><Package className="w-16 h-16 mx-auto mb-4 text-slate-200" /><h3 className="font-heading font-bold text-lg uppercase mb-2">Aucun produit prestataire</h3><p className="text-slate-500">Aucun prestataire n'a encore ajouté de produits.</p></div>
          )}
        </div>
      ) : shopTab === 'messagerie' ? (
        <div className="bg-white border border-slate-200 grid grid-cols-3 min-h-[400px]" data-testid="provider-messaging-tab">
          <div className="border-r border-slate-200 overflow-y-auto">
            <div className="p-4 border-b"><h3 className="font-heading font-bold uppercase text-xs">Prestataires</h3></div>
            {(() => {
              const convoMap = {}; providerConvos.filter(c => c.role === 'provider').forEach(c => { convoMap[c.user_id] = c; });
              const allProviders = [...providersList.map(p => ({ user_id: p.user_id, name: p.company_name || p.name, last_message: convoMap[p.user_id]?.last_message || '', unread: convoMap[p.user_id]?.unread || 0, hasConvo: !!convoMap[p.user_id] }))];
              providerConvos.filter(c => c.role === 'provider' && !allProviders.find(p => p.user_id === c.user_id)).forEach(c => { allProviders.push({ user_id: c.user_id, name: c.name, last_message: c.last_message, unread: c.unread, hasConvo: true }); });
              return allProviders.length > 0 ? allProviders.map(p => (
                <button key={p.user_id} onClick={() => openProviderChat(p.user_id)} className={`w-full text-left p-3 border-b border-slate-100 hover:bg-slate-50 ${providerChat === p.user_id ? 'bg-brand/5 border-l-2 border-l-brand' : ''}`} data-testid={`msg-provider-${p.user_id}`}>
                  <div className="flex items-center justify-between"><p className="font-heading font-bold text-xs truncate">{p.name}</p>{p.unread > 0 && <span className="bg-brand text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{p.unread}</span>}</div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{p.last_message || 'Aucun message — Démarrer la conversation'}</p>
                </button>
              )) : <div className="p-6 text-center text-slate-400 text-xs">Aucun prestataire disponible.</div>;
            })()}
          </div>
          <div className="col-span-2 flex flex-col">
            {providerChat ? (
              <>
                <div className="p-3 border-b bg-slate-50"><p className="font-heading font-bold text-sm">{providersList.find(p => p.user_id === providerChat)?.company_name || providerConvos.find(c => c.user_id === providerChat)?.name || ''}</p></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[300px]">
                  {providerMessages.length > 0 ? providerMessages.map(m => (
                    <div key={m.message_id} className={`flex ${m.sender_role === 'organizer' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-3 py-2 text-sm ${m.sender_role === 'organizer' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700'}`}>
                        <p>{m.content}</p>
                        <p className={`text-[10px] mt-1 ${m.sender_role === 'organizer' ? 'text-white/60' : 'text-slate-400'}`}>{m.created_at && format(new Date(m.created_at), 'HH:mm', { locale: fr })}</p>
                      </div>
                    </div>
                  )) : <div className="text-center text-slate-400 text-xs py-8">Aucun message. Envoyez le premier !</div>}
                </div>
                <div className="p-3 border-t flex gap-2">
                  <Input value={providerNewMsg} onChange={(e) => setProviderNewMsg(e.target.value)} placeholder="Message..." onKeyDown={(e) => e.key === 'Enter' && sendProviderMsg()} className="flex-1 h-9 text-xs" data-testid="org-provider-msg-input" />
                  <Button className="bg-brand hover:bg-brand/90 text-white h-9" onClick={sendProviderMsg} data-testid="org-provider-msg-send"><Send className="w-4 h-4" /></Button>
                </div>
              </>
            ) : <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Sélectionnez un prestataire</div>}
          </div>
        </div>
      ) : null}

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={(open) => setShowProductDialog(open)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading text-xl uppercase">{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle><DialogDescription className="sr-only">Formulaire produit</DialogDescription></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label className="text-xs font-heading uppercase text-slate-500">Nom *</Label><Input placeholder="T-shirt finisher..." value={productForm.name} onChange={(e) => setProductForm(p => ({ ...p, name: e.target.value }))} data-testid="product-name-input" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs font-heading uppercase text-slate-500">Catégorie</Label>
                <Select value={productForm.category} onValueChange={(v) => setProductForm(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{productCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label className="text-xs font-heading uppercase text-slate-500">Événement</Label>
                <Select value={productForm.event_id || 'none'} onValueChange={(v) => setProductForm(p => ({ ...p, event_id: v }))}><SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Tous</SelectItem>{events.map(e => <SelectItem key={e.event_id} value={e.event_id}>{e.title}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label className="text-xs font-heading uppercase text-slate-500">Prix (€) *</Label><Input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm(p => ({ ...p, price: e.target.value }))} data-testid="product-price-input" /></div>
              <div><Label className="text-xs font-heading uppercase text-slate-500">Commission (€)</Label><Input type="number" step="0.01" value={productForm.organizer_commission} onChange={(e) => setProductForm(p => ({ ...p, organizer_commission: e.target.value }))} /></div>
              <div><Label className="text-xs font-heading uppercase text-slate-500">Stock</Label><Input type="number" value={productForm.stock} onChange={(e) => setProductForm(p => ({ ...p, stock: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs font-heading uppercase text-slate-500">Tailles</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">{sizeOptions.map(s => (<button key={s} type="button" onClick={() => toggleSize(s)} className={`px-3 py-1.5 text-xs font-bold border transition-all ${productForm.sizes.includes(s) ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:border-brand'}`}>{s}</button>))}</div>
            </div>
            <div><Label className="text-xs font-heading uppercase text-slate-500">Image URL</Label><Input placeholder="https://..." value={productForm.image_url} onChange={(e) => setProductForm(p => ({ ...p, image_url: e.target.value }))} /></div>
            <div><Label className="text-xs font-heading uppercase text-slate-500">Description</Label><Input placeholder="Description du produit..." value={productForm.description} onChange={(e) => setProductForm(p => ({ ...p, description: e.target.value }))} /></div>
            <Button onClick={handleSaveProduct} disabled={productSaving} className="w-full btn-primary gap-2" data-testid="save-product-btn">
              {productSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {editingProduct ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
