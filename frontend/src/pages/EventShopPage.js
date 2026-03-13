import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShoppingBag, Tag, Package, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../services/api';

const EventShopPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

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
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
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
                    activeCategory === cat
                      ? 'border-brand text-brand'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
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
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.06 } }
            }}
            data-testid="shop-product-grid"
          >
            {filtered.map((product) => (
              <ProductCard key={product.product_id} product={product} />
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
    </div>
  );
};

const ProductCard = ({ product }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      className="group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-testid={`shop-product-${product.product_id}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/5] bg-slate-100 rounded-lg overflow-hidden mb-4">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-slate-200" />
          </div>
        )}
        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm text-[10px] font-heading font-bold uppercase tracking-wider text-slate-600 px-2.5 py-1 rounded-full">
            {product.category}
          </span>
        </div>
        {/* Stock indicator */}
        {product.stock <= 10 && product.stock > 0 && (
          <div className="absolute top-3 right-3">
            <span className="bg-amber-500 text-white text-[10px] font-bold uppercase px-2 py-1 rounded-full">
              Plus que {product.stock}
            </span>
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-slate-900 text-xs font-heading font-bold uppercase px-4 py-2 rounded-full">
              Épuisé
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1.5">
        <h3 className="font-heading font-bold text-sm uppercase tracking-wide text-slate-900 group-hover:text-brand transition-colors">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}
        <div className="flex items-center gap-3 pt-1">
          <span className="font-heading font-black text-lg text-slate-900">
            {product.price}€
          </span>
          {product.sizes && product.sizes.length > 0 && product.sizes[0] !== 'Unique' && (
            <span className="text-[10px] text-slate-400 uppercase font-medium">
              {product.sizes.join(' / ')}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default EventShopPage;
