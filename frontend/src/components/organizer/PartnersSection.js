import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Edit, Trash2, Loader2, Search, Users, Phone, Mail, MapPinned, Check, X,
  Tent, TrafficCone, Flag, Sparkles, Timer, Shield, Megaphone,
  Utensils, HeartPulse, Truck, Zap, Speaker, Trash, Droplets,
  ShoppingBag, ExternalLink, Package
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import api from '../../services/api';

const WIDGET_CATEGORIES = [
  {
    id: 'infrastructures', label: 'Infrastructures', icon: Tent, color: 'bg-blue-500', border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-600',
    subcats: ['Location de tentes & chapiteaux', 'Installation de stands', 'Podium & scene', 'Tables et chaises', 'Zones d accueil']
  },
  {
    id: 'securite', label: 'Securite & Balisage', icon: Shield, color: 'bg-red-500', border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-600',
    subcats: ['Barrieres de securite', 'Signaletique', 'Balisage du parcours', 'Zones spectateurs', 'Societe de securite']
  },
  {
    id: 'course', label: 'Course & Technique', icon: Flag, color: 'bg-amber-500', border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-600',
    subcats: ['Installation departs & arrivees', 'Zones de ravitaillement', 'Chronometrage', 'Zones techniques']
  },
  {
    id: 'logistique', label: 'Services & Logistique', icon: Sparkles, color: 'bg-emerald-500', border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600',
    subcats: ['Nettoyage du site', 'Gestion des dechets', 'Sanitaires mobiles', 'Sono & eclairage', 'Alimentation electrique']
  },
  {
    id: 'autres', label: 'Autres Services', icon: Megaphone, color: 'bg-violet-500', border: 'border-violet-500', bg: 'bg-violet-50', text: 'text-violet-600',
    subcats: ['Animation', 'Medical', 'Restauration', 'Transport']
  }
];

function getWidgetForCategory(category) {
  for (const w of WIDGET_CATEGORIES) {
    if (w.subcats.some(s => s.toLowerCase() === (category || '').toLowerCase())) return w;
  }
  return WIDGET_CATEGORIES[4]; // default "Autres"
}

export const PartnersSection = ({
  filteredPartners, partnersLoading, partnerFilter, partnerSearch,
  allCategories, onFilterChange, onSearchChange,
  onOpenNew, onOpenEdit, onDelete,
  showPartnerDialog, setShowPartnerDialog, editingPartner, setEditingPartner,
  partnerForm, setPartnerForm, customCategory, setCustomCategory,
  partnerSaving, onSave
}) => {
  const [activeWidget, setActiveWidget] = useState(null);
  const [viewMode, setViewMode] = useState('prestataires'); // 'prestataires' | 'produits-externes'
  const [externalProducts, setExternalProducts] = useState([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalSearch, setExternalSearch] = useState('');

  const fetchExternalProducts = useCallback(async () => {
    setExternalLoading(true);
    try {
      const res = await api.get('/provider-products/external');
      setExternalProducts(res.data.products || []);
    } catch (e) { console.error('Error fetching external products', e); }
    finally { setExternalLoading(false); }
  }, []);

  useEffect(() => {
    if (viewMode === 'produits-externes' && externalProducts.length === 0) {
      fetchExternalProducts();
    }
  }, [viewMode, fetchExternalProducts, externalProducts.length]);

  const filteredExternalProducts = externalProducts.filter(p =>
    !externalSearch ||
    (p.name || '').toLowerCase().includes(externalSearch.toLowerCase()) ||
    (p.provider_name || '').toLowerCase().includes(externalSearch.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(externalSearch.toLowerCase())
  );

  // Group partners by widget category
  const groupedPartners = {};
  for (const w of WIDGET_CATEGORIES) {
    groupedPartners[w.id] = filteredPartners.filter(p => w.subcats.some(s => s.toLowerCase() === (p.category || '').toLowerCase()));
  }
  // Unclassified
  const classifiedIds = Object.values(groupedPartners).flat().map(p => p.partner_id);
  const unclassified = filteredPartners.filter(p => !classifiedIds.includes(p.partner_id));
  if (unclassified.length > 0) {
    groupedPartners['autres'] = [...(groupedPartners['autres'] || []), ...unclassified];
  }

  const displayedPartners = activeWidget ? (groupedPartners[activeWidget] || []) : filteredPartners;

  return (
    <div>
      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <Button variant={viewMode === 'prestataires' ? 'default' : 'outline'} className={`gap-2 text-xs ${viewMode === 'prestataires' ? 'bg-brand' : ''}`} onClick={() => setViewMode('prestataires')} data-testid="view-prestataires-btn">
          <Users className="w-4 h-4" /> Mes prestataires
        </Button>
        <Button variant={viewMode === 'produits-externes' ? 'default' : 'outline'} className={`gap-2 text-xs ${viewMode === 'produits-externes' ? 'bg-brand' : ''}`} onClick={() => setViewMode('produits-externes')} data-testid="view-external-products-btn">
          <ShoppingBag className="w-4 h-4" /> Produits & services partenaires
        </Button>
      </div>

      {viewMode === 'prestataires' && (
        <>
      {/* Actions bar */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <Input placeholder="Rechercher un prestataire..." value={partnerSearch} onChange={(e) => onSearchChange(e.target.value)} className="w-64" data-testid="partner-search" />
          <span className="text-xs text-slate-400">{filteredPartners.length} prestataire(s)</span>
        </div>
        <Button className="btn-primary gap-2" onClick={onOpenNew} data-testid="add-partner-btn">
          <Plus className="w-4 h-4" /> Ajouter un prestataire
        </Button>
      </div>

      {/* Widget Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {WIDGET_CATEGORIES.map((w) => {
          const count = (groupedPartners[w.id] || []).length;
          const isActive = activeWidget === w.id;
          const Icon = w.icon;
          return (
            <motion.button
              key={w.id}
              className={`text-left p-4 border-l-4 transition-all ${w.border} ${isActive ? 'bg-slate-50 ring-2 ring-brand/30' : 'bg-white hover:bg-slate-50'} border border-slate-200`}
              onClick={() => setActiveWidget(isActive ? null : w.id)}
              whileHover={{ y: -2 }}
              data-testid={`widget-${w.id}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 ${w.bg} flex items-center justify-center rounded`}>
                  <Icon className={`w-4 h-4 ${w.text}`} />
                </div>
                {isActive && <span className="ml-auto text-brand"><Check className="w-4 h-4" /></span>}
              </div>
              <p className="font-heading font-bold text-xs uppercase tracking-wide">{w.label}</p>
              <p className="text-lg font-heading font-extrabold mt-1">{count} <span className="text-xs font-normal text-slate-400">prestataire(s)</span></p>
            </motion.button>
          );
        })}
      </div>

      {/* Active filter tag */}
      {activeWidget && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-heading uppercase text-slate-500">Filtre actif :</span>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold uppercase ${WIDGET_CATEGORIES.find(w => w.id === activeWidget)?.bg} ${WIDGET_CATEGORIES.find(w => w.id === activeWidget)?.text}`}>
            {WIDGET_CATEGORIES.find(w => w.id === activeWidget)?.label}
          </span>
          <button onClick={() => setActiveWidget(null)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Partners List */}
      <div className="bg-white border border-slate-200">
        {partnersLoading ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
        ) : displayedPartners.length > 0 ? (
          <div className="divide-y">
            {displayedPartners.map(p => {
              const w = getWidgetForCategory(p.category);
              const Icon = w.icon;
              return (
                <motion.div key={p.partner_id} className="p-4 hover:bg-slate-50 transition-colors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid={`partner-row-${p.partner_id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 ${w.bg} ${w.text} flex items-center justify-center flex-shrink-0 rounded`}><Icon className="w-5 h-5" /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading font-bold text-base">{p.company_name}</h4>
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase ${w.bg} ${w.text}`}>{p.category}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                          {p.contact_name && <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-400" /> {p.contact_name}</span>}
                          {p.phone && <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 hover:text-brand"><Phone className="w-3.5 h-3.5 text-slate-400" /> {p.phone}</a>}
                          {p.email && <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 hover:text-brand"><Mail className="w-3.5 h-3.5 text-slate-400" /> {p.email}</a>}
                          {p.address && <span className="flex items-center gap-1.5"><MapPinned className="w-3.5 h-3.5 text-slate-400" /> {p.address}</span>}
                        </div>
                        {p.notes && <p className="text-xs text-slate-400 mt-1.5 italic">{p.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 ml-3">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => onOpenEdit(p)} data-testid={`edit-partner-${p.partner_id}`}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" size="sm" className="h-8 text-red-500 hover:text-red-600" onClick={() => onDelete(p.partner_id)} data-testid={`delete-partner-${p.partner_id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Tent className="w-16 h-16 mx-auto mb-4 text-slate-200" />
            <h3 className="font-heading font-bold text-lg uppercase mb-2">{activeWidget ? 'Aucun prestataire dans cette categorie' : 'Aucun prestataire'}</h3>
            <p className="text-slate-500 mb-4">Ajoutez vos prestataires pour organiser vos evenements</p>
            <Button className="btn-primary gap-2" onClick={onOpenNew}><Plus className="w-4 h-4" /> Ajouter un prestataire</Button>
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={showPartnerDialog} onOpenChange={(open) => { setShowPartnerDialog(open); if (!open) { setEditingPartner(null); setCustomCategory(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl uppercase">{editingPartner ? 'Modifier le prestataire' : 'Nouveau prestataire'}</DialogTitle>
            <DialogDescription className="sr-only">Formulaire prestataire</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label className="text-xs font-heading uppercase text-slate-500">Nom de l entreprise *</Label><Input placeholder="Ex: SecuriSport Lyon" value={partnerForm.company_name} onChange={(e) => setPartnerForm(p => ({ ...p, company_name: e.target.value }))} data-testid="partner-company-input" /></div>
            <div>
              <Label className="text-xs font-heading uppercase text-slate-500">Activite / Prestation *</Label>
              <Select value={allCategories.includes(partnerForm.category) ? partnerForm.category : '__custom__'} onValueChange={(v) => setPartnerForm(p => ({ ...p, category: v === '__custom__' ? '' : v }))}>
                <SelectTrigger data-testid="partner-category-select"><SelectValue placeholder="Choisir une prestation" /></SelectTrigger>
                <SelectContent>
                  {WIDGET_CATEGORIES.map(w => (
                    <React.Fragment key={w.id}>
                      <div className="px-2 py-1 text-[10px] font-heading uppercase text-slate-400 font-bold mt-1">{w.label}</div>
                      {w.subcats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </React.Fragment>
                  ))}
                  <SelectItem value="__custom__">+ Autre prestation...</SelectItem>
                </SelectContent>
              </Select>
              {!allCategories.includes(partnerForm.category) && (
                <Input placeholder="Saisissez la prestation..." value={partnerForm.category} onChange={(e) => setPartnerForm(p => ({ ...p, category: e.target.value }))} className="mt-2" data-testid="partner-custom-category" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs font-heading uppercase text-slate-500">Responsable</Label><Input placeholder="Jean Dupont" value={partnerForm.contact_name} onChange={(e) => setPartnerForm(p => ({ ...p, contact_name: e.target.value }))} data-testid="partner-contact-input" /></div>
              <div><Label className="text-xs font-heading uppercase text-slate-500">Telephone</Label><Input placeholder="06 12 34 56 78" value={partnerForm.phone} onChange={(e) => setPartnerForm(p => ({ ...p, phone: e.target.value }))} data-testid="partner-phone-input" /></div>
            </div>
            <div><Label className="text-xs font-heading uppercase text-slate-500">Email</Label><Input placeholder="contact@entreprise.fr" value={partnerForm.email} onChange={(e) => setPartnerForm(p => ({ ...p, email: e.target.value }))} data-testid="partner-email-input" /></div>
            <div><Label className="text-xs font-heading uppercase text-slate-500">Adresse</Label><Input placeholder="12 Rue de la Republique, 69001 Lyon" value={partnerForm.address} onChange={(e) => setPartnerForm(p => ({ ...p, address: e.target.value }))} data-testid="partner-address-input" /></div>
            <div><Label className="text-xs font-heading uppercase text-slate-500">Notes</Label><Textarea placeholder="Informations complementaires..." rows={2} value={partnerForm.notes} onChange={(e) => setPartnerForm(p => ({ ...p, notes: e.target.value }))} data-testid="partner-notes-input" /></div>
            <Button onClick={onSave} disabled={partnerSaving} className="w-full btn-primary gap-2" data-testid="save-partner-btn">
              {partnerSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editingPartner ? 'Enregistrer' : 'Ajouter le prestataire'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}

      {/* External Products View */}
      {viewMode === 'produits-externes' && (
        <div data-testid="external-products-section">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <Input placeholder="Rechercher un produit ou service..." value={externalSearch} onChange={(e) => setExternalSearch(e.target.value)} className="w-64" data-testid="external-product-search" />
              <span className="text-xs text-slate-400">{filteredExternalProducts.length} produit(s) / service(s)</span>
            </div>
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={fetchExternalProducts} data-testid="refresh-external-btn">
              <Loader2 className={`w-3.5 h-3.5 ${externalLoading ? 'animate-spin' : ''}`} /> Actualiser
            </Button>
          </div>

          {externalLoading ? (
            <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
          ) : filteredExternalProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExternalProducts.map(product => (
                <motion.div key={product.product_id} className="bg-white border border-slate-200 overflow-hidden hover:shadow-md transition-shadow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} data-testid={`external-product-${product.product_id}`}>
                  <div className="flex gap-4 p-4">
                    <div className="w-20 h-20 bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; }} />
                      ) : (
                        <Package className="w-8 h-8 text-slate-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-heading font-bold text-sm leading-tight line-clamp-2">{product.name}</h4>
                        {product.price > 0 && <span className="font-heading font-black text-brand text-sm shrink-0">{product.price.toFixed(2)}€</span>}
                        {(!product.price || product.price === 0) && <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Sur devis</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{product.description}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-600">{product.category}</span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {product.provider_name}
                        </span>
                      </div>
                      {(product.provider_email || product.provider_phone) && (
                        <div className="flex gap-3 mt-2">
                          {product.provider_email && (
                            <a href={`mailto:${product.provider_email}`} className="text-[10px] text-brand hover:underline flex items-center gap-1">
                              <Mail className="w-3 h-3" /> Contacter
                            </a>
                          )}
                          {product.provider_phone && (
                            <a href={`tel:${product.provider_phone}`} className="text-[10px] text-brand hover:underline flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {product.provider_phone}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 p-12 text-center">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-slate-200" />
              <h3 className="font-heading font-bold text-lg uppercase mb-2">Aucun produit ou service externe</h3>
              <p className="text-slate-500 text-sm">Les partenaires proposeront bientot leurs produits et services ici.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
