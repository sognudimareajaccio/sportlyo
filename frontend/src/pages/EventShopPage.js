import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingBag, Package, ChevronRight, Minus, Plus, Truck, MapPin, Check, Loader2, X, CreditCard } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import api from '../services/api';

const EventShopPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [orderProduct, setOrderProduct] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shopRes, eventRes] = await Promise.all([
          api.get(`/events/${eventId}/shop`),
          api.get(`/events/${eventId}`)
        ]);
        setProducts(shopRes.data.products || []);
        setEvent(eventRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  const handleOrder = (product) => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour commander');
      navigate('/login', { state: { from: `/events/${eventId}/shop` } });
      return;
    }
    setOrderProduct(product);
  };

  const handleOrderSuccess = (updatedProduct) => {
    setProducts(prev => prev.map(p => p.product_id === updatedProduct.product_id ? { ...p, stock: p.stock - updatedProduct.qty, sold: (p.sold || 0) + updatedProduct.qty } : p));
    setOrderProduct(null);
  };

  const categories = ['all', ...new Set(products.map(p => p.category))];
  const filtered = activeCategory === 'all' ? products : products.filter(p => p.category === activeCategory);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="event-shop-page">
      {/* Breadcrumb */}
      <div className="border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Link to={`/events/${eventId}`} className="hover:text-brand transition-colors" data-testid="back-to-event-link">
              {event?.title || 'Événement'}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700 font-medium">Boutique</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-tight text-slate-900" data-testid="shop-title">
            Boutique
          </h1>
          <p className="text-slate-500 mt-2 text-sm max-w-lg">
            Retrouvez les produits officiels de l'événement. Soutenez l'organisateur en vous équipant aux couleurs de la course.
          </p>
        </motion.div>
      </div>

      {/* Category Tabs */}
      {categories.length > 2 && (
        <div className="border-b border-slate-100 sticky top-0 bg-white z-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-6 overflow-x-auto no-scrollbar" data-testid="shop-category-tabs">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`py-3 text-xs font-heading font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                    activeCategory === cat ? 'border-brand text-brand' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                  data-testid={`shop-tab-${cat}`}
                >
                  {cat === 'all' ? 'Tous les produits' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Aucun produit disponible pour le moment.</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
            initial="hidden" animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            data-testid="shop-product-grid"
          >
            {filtered.map((product) => (
              <ProductCard key={product.product_id} product={product} onOrder={handleOrder} />
            ))}
          </motion.div>
        )}
      </div>

      {/* Back button */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <Button
          variant="ghost"
          className="text-slate-400 hover:text-slate-600 gap-2 text-xs uppercase font-heading font-bold tracking-wider"
          onClick={() => navigate(`/events/${eventId}`)}
          data-testid="shop-back-btn"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à l'événement
        </Button>
      </div>

      {/* Order Dialog */}
      {orderProduct && (
        <OrderDialog
          product={orderProduct}
          eventId={eventId}
          eventTitle={event?.title}
          onClose={() => setOrderProduct(null)}
          onSuccess={handleOrderSuccess}
        />
      )}
    </div>
  );
};

const ProductCard = ({ product, onOrder }) => {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
      className="group"
      data-testid={`shop-product-${product.product_id}`}
    >
      <div className="relative aspect-[4/5] bg-slate-100 rounded-lg overflow-hidden mb-4">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Package className="w-16 h-16 text-slate-200" /></div>
        )}
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm text-[10px] font-heading font-bold uppercase tracking-wider text-slate-600 px-2.5 py-1 rounded-full">{product.category}</span>
        </div>
        {product.stock <= 10 && product.stock > 0 && (
          <div className="absolute top-3 right-3">
            <span className="bg-amber-500 text-white text-[10px] font-bold uppercase px-2 py-1 rounded-full">Plus que {product.stock}</span>
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-slate-900 text-xs font-heading font-bold uppercase px-4 py-2 rounded-full">Épuisé</span>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <h3 className="font-heading font-bold text-sm uppercase tracking-wide text-slate-900 group-hover:text-brand transition-colors">{product.name}</h3>
        {product.description && <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{product.description}</p>}
        {product.colors?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] text-slate-400">Couleurs:</span>
            {product.colors.map(c => <span key={c} className="text-[10px] font-bold text-slate-600">{c}</span>).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, <span key={`sep-${i}`} className="text-[10px] text-slate-300">·</span>, curr], [])}
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <span className="font-heading font-black text-lg text-slate-900">{product.price}€</span>
            {product.sizes?.length > 0 && product.sizes[0] !== 'Unique' && (
              <span className="text-[10px] text-slate-400 uppercase font-medium">{product.sizes.join(' / ')}</span>
            )}
          </div>
          <Button
            size="sm"
            className="bg-brand hover:bg-brand/90 text-white font-heading font-bold text-xs uppercase tracking-wider h-8 px-4"
            onClick={() => onOrder(product)}
            disabled={product.stock === 0}
            data-testid={`order-btn-${product.product_id}`}
          >
            Commander
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

const OrderDialog = ({ product, eventId, eventTitle, onClose, onSuccess }) => {
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || '');
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [delivery, setDelivery] = useState('event');
  const [address, setAddress] = useState({ street: '', city: '', postal: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [orderDone, setOrderDone] = useState(null);
  const [paymentStep, setPaymentStep] = useState(null); // null | 'widget' | 'verifying'
  const [pendingOrder, setPendingOrder] = useState(null);
  const sumupRef = useRef(null);

  const hasSizes = product.sizes?.length > 0 && product.sizes[0] !== 'Unique';
  const hasColors = product.colors?.length > 0;
  const total = product.price * quantity;
  const deliveryFee = delivery === 'home' ? 5.90 : 0;
  const grandTotal = total + deliveryFee;

  const canSubmit = () => {
    if (hasSizes && !selectedSize) return false;
    if (delivery === 'home' && (!address.street || !address.city || !address.postal || !address.phone)) return false;
    return true;
  };

  const mountSumUpWidget = useCallback((checkoutId) => {
    if (!checkoutId || !window.SumUpCard) return;
    // Unmount previous widget if any
    if (sumupRef.current) {
      try { sumupRef.current.unmount(); } catch {}
    }
    setTimeout(() => {
      const el = document.getElementById('sumup-card');
      if (!el) return;
      sumupRef.current = window.SumUpCard.mount({
        id: 'sumup-card',
        checkoutId: checkoutId,
        locale: 'fr-FR',
        country: 'FR',
        currency: 'EUR',
        amount: grandTotal.toFixed(2),
        showEmail: true,
        onResponse: async (type, body) => {
          if (type === 'success') {
            setPaymentStep('verifying');
            try {
              const verifyRes = await api.post(`/shop/verify-payment/${pendingOrder?.order_id || ''}`);
              if (verifyRes.data.status === 'completed') {
                setOrderDone(pendingOrder);
                onSuccess({ product_id: product.product_id, qty: quantity });
                toast.success('Paiement confirmé !');
              } else {
                toast.info('Paiement en cours de vérification...');
                setOrderDone(pendingOrder);
                onSuccess({ product_id: product.product_id, qty: quantity });
              }
            } catch {
              setOrderDone(pendingOrder);
              onSuccess({ product_id: product.product_id, qty: quantity });
            }
          } else if (type === 'error' || type === 'fail') {
            toast.error('Le paiement a échoué. Veuillez réessayer.');
            setPaymentStep(null);
            setPendingOrder(null);
          }
        }
      });
    }, 300);
  }, [grandTotal, pendingOrder, onSuccess, product.product_id, quantity]);

  // Load SumUp SDK script
  useEffect(() => {
    if (!document.getElementById('sumup-sdk')) {
      const script = document.createElement('script');
      script.id = 'sumup-sdk';
      script.src = 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Mount widget when payment step changes
  useEffect(() => {
    if (paymentStep === 'widget' && pendingOrder?.sumup_checkout_id) {
      mountSumUpWidget(pendingOrder.sumup_checkout_id);
    }
  }, [paymentStep, pendingOrder, mountSumUpWidget]);

  const handleSubmit = async () => {
    if (!canSubmit()) { toast.error('Remplissez tous les champs obligatoires'); return; }
    setSubmitting(true);
    try {
      const payload = {
        event_id: eventId,
        items: [{
          product_id: product.product_id,
          quantity,
          size: selectedSize,
          color: selectedColor
        }],
        delivery_method: delivery === 'event' ? 'Retrait sur place' : 'Livraison à domicile',
        shipping_address: delivery === 'home' ? `${address.street}, ${address.postal} ${address.city}` : `Retrait le jour de l'événement — ${eventTitle || ''}`,
        phone: address.phone,
        delivery_fee: deliveryFee
      };
      const res = await api.post('/shop/order', payload);
      const order = res.data.order;
      const checkoutId = res.data.sumup_checkout_id;

      if (checkoutId) {
        // Real SumUp payment — show payment widget
        setPendingOrder({ ...order, sumup_checkout_id: checkoutId, invoice_id: res.data.invoice_id });
        setPaymentStep('widget');
      } else {
        // Simulated payment — show success
        setOrderDone({ ...order, invoice_id: res.data.invoice_id });
        onSuccess({ product_id: product.product_id, qty: quantity });
        toast.success('Commande confirmée !');
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de la commande');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) { if (sumupRef.current) try { sumupRef.current.unmount(); } catch {} onClose(); } }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0" data-testid="order-dialog">
        {orderDone ? (
          /* Success state */
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-heading font-bold text-xl uppercase mb-2">Commande confirmée</h3>
            <p className="text-sm text-slate-500 mb-1">Référence : <span className="font-mono font-bold text-brand">{orderDone.order_id}</span></p>
            <p className="text-sm text-slate-500 mb-4">
              {orderDone.delivery_method === 'Retrait sur place'
                ? 'Votre commande sera disponible le jour de l\'événement.'
                : 'Vous recevrez votre commande à l\'adresse indiquée.'}
            </p>
            <p className="font-heading font-black text-2xl mb-6">{orderDone.total?.toFixed(2)}€</p>
            <Button className="bg-brand hover:bg-brand/90 text-white font-heading font-bold uppercase w-full" onClick={onClose} data-testid="order-done-close">
              Fermer
            </Button>
          </div>
        ) : paymentStep === 'widget' ? (
          /* SumUp Payment Widget */
          <div className="p-6" data-testid="sumup-payment-step">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-brand" />
              <div>
                <h3 className="font-heading font-bold text-lg uppercase">Paiement sécurisé</h3>
                <p className="text-xs text-slate-500">Montant : <span className="font-bold text-brand">{grandTotal.toFixed(2)}€</span></p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-1 mb-4">
              <div className="flex items-center justify-between text-xs text-slate-500 px-3 py-2">
                <span>{product.name} x{quantity}</span>
                <span className="font-bold">{total.toFixed(2)}€</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex items-center justify-between text-xs text-slate-500 px-3 py-1">
                  <span>Livraison</span>
                  <span className="font-bold">{deliveryFee.toFixed(2)}€</span>
                </div>
              )}
            </div>
            <div id="sumup-card" className="min-h-[200px]" data-testid="sumup-card-widget" />
            <p className="text-[10px] text-slate-400 text-center mt-3">Paiement sécurisé par SumUp — Vos données bancaires ne sont jamais stockées</p>
          </div>
        ) : paymentStep === 'verifying' ? (
          /* Verifying payment */
          <div className="p-8 text-center">
            <Loader2 className="w-10 h-10 text-brand animate-spin mx-auto mb-4" />
            <h3 className="font-heading font-bold text-lg uppercase mb-2">Vérification du paiement...</h3>
            <p className="text-sm text-slate-500">Veuillez patienter quelques instants</p>
          </div>
        ) : (
          /* Order form */
          <>
            {/* Product header */}
            <div className="flex gap-4 p-5 border-b border-slate-100">
              <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-slate-200" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-bold text-sm uppercase truncate">{product.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{product.category}</p>
                <p className="font-heading font-black text-lg mt-1">{product.price}€</p>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Size */}
              {hasSizes && (
                <div>
                  <Label className="text-xs font-heading uppercase text-slate-500 mb-2 block">Taille *</Label>
                  <div className="flex flex-wrap gap-2" data-testid="size-selector">
                    {product.sizes.map(s => (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        className={`h-9 min-w-[3rem] px-3 text-xs font-heading font-bold uppercase border-2 transition-all ${
                          selectedSize === s ? 'border-brand bg-brand/5 text-brand' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                        data-testid={`size-${s}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color */}
              {hasColors && (
                <div>
                  <Label className="text-xs font-heading uppercase text-slate-500 mb-2 block">Couleur</Label>
                  <div className="flex flex-wrap gap-2" data-testid="color-selector">
                    {product.colors.map(c => (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className={`h-9 px-4 text-xs font-heading font-bold border-2 transition-all ${
                          selectedColor === c ? 'border-brand bg-brand/5 text-brand' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                        data-testid={`color-${c}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <Label className="text-xs font-heading uppercase text-slate-500 mb-2 block">Quantité</Label>
                <div className="flex items-center gap-3" data-testid="quantity-selector">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 border border-slate-200 flex items-center justify-center hover:border-slate-300 transition-colors"
                    data-testid="qty-minus"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-heading font-bold text-lg w-8 text-center" data-testid="qty-value">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-9 h-9 border border-slate-200 flex items-center justify-center hover:border-slate-300 transition-colors"
                    data-testid="qty-plus"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-400 ml-2">{product.stock} en stock</span>
                </div>
              </div>

              {/* Delivery Method */}
              <div>
                <Label className="text-xs font-heading uppercase text-slate-500 mb-2 block">Mode de livraison *</Label>
                <div className="grid grid-cols-2 gap-3" data-testid="delivery-selector">
                  <button
                    onClick={() => setDelivery('event')}
                    className={`p-3 border-2 text-left transition-all ${
                      delivery === 'event' ? 'border-brand bg-brand/5' : 'border-slate-200 hover:border-slate-300'
                    }`}
                    data-testid="delivery-event"
                  >
                    <MapPin className={`w-5 h-5 mb-1.5 ${delivery === 'event' ? 'text-brand' : 'text-slate-400'}`} />
                    <p className={`text-xs font-heading font-bold uppercase ${delivery === 'event' ? 'text-brand' : 'text-slate-700'}`}>Sur place</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Retrait le jour J</p>
                    <p className="text-xs font-heading font-bold text-green-600 mt-1">Gratuit</p>
                  </button>
                  <button
                    onClick={() => setDelivery('home')}
                    className={`p-3 border-2 text-left transition-all ${
                      delivery === 'home' ? 'border-brand bg-brand/5' : 'border-slate-200 hover:border-slate-300'
                    }`}
                    data-testid="delivery-home"
                  >
                    <Truck className={`w-5 h-5 mb-1.5 ${delivery === 'home' ? 'text-brand' : 'text-slate-400'}`} />
                    <p className={`text-xs font-heading font-bold uppercase ${delivery === 'home' ? 'text-brand' : 'text-slate-700'}`}>Domicile</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Livraison sous 5-7j</p>
                    <p className="text-xs font-heading font-bold text-slate-700 mt-1">+5.90€</p>
                  </button>
                </div>
              </div>

              {/* Address fields for home delivery */}
              {delivery === 'home' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3 border-t border-slate-100 pt-4"
                  data-testid="address-fields"
                >
                  <div>
                    <Label className="text-xs font-heading uppercase text-slate-500">Adresse *</Label>
                    <Input placeholder="12 rue de la Liberté" value={address.street} onChange={(e) => setAddress(a => ({ ...a, street: e.target.value }))} data-testid="address-street" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-heading uppercase text-slate-500">Code postal *</Label>
                      <Input placeholder="69007" value={address.postal} onChange={(e) => setAddress(a => ({ ...a, postal: e.target.value }))} data-testid="address-postal" />
                    </div>
                    <div>
                      <Label className="text-xs font-heading uppercase text-slate-500">Ville *</Label>
                      <Input placeholder="Lyon" value={address.city} onChange={(e) => setAddress(a => ({ ...a, city: e.target.value }))} data-testid="address-city" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-heading uppercase text-slate-500">Téléphone *</Label>
                    <Input placeholder="06 12 34 56 78" value={address.phone} onChange={(e) => setAddress(a => ({ ...a, phone: e.target.value }))} data-testid="address-phone" />
                  </div>
                </motion.div>
              )}

              {/* Summary */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{product.name} x{quantity}</span>
                  <span className="font-heading font-bold">{total.toFixed(2)}€</span>
                </div>
                {delivery === 'home' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Frais de livraison</span>
                    <span className="font-heading font-bold">{deliveryFee.toFixed(2)}€</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-heading font-black pt-2 border-t border-slate-100">
                  <span>Total</span>
                  <span className="text-brand">{grandTotal.toFixed(2)}€</span>
                </div>
              </div>

              {/* Submit */}
              <Button
                className="w-full bg-brand hover:bg-brand/90 text-white font-heading font-bold uppercase tracking-wider h-12 gap-2"
                onClick={handleSubmit}
                disabled={submitting || !canSubmit()}
                data-testid="confirm-order-btn"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {submitting ? 'Traitement...' : `Payer — ${grandTotal.toFixed(2)}€`}
              </Button>
              <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Paiement sécurisé par SumUp
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EventShopPage;
