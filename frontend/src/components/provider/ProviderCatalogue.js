import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';

const ProviderCatalogue = ({ products, getProductImages, cardImageIndex, setCardImageIndex, onEdit, onDelete }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
    {products.map(p => {
      const imgs = getProductImages(p);
      const currentIdx = cardImageIndex[p.product_id] || 0;
      return (
        <motion.div key={p.product_id} className="bg-white border border-slate-200 rounded-lg overflow-hidden group hover:shadow-lg hover:border-brand/50 transition-all duration-300" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} data-testid={`provider-product-${p.product_id}`}>
          <div className="relative aspect-[3/4] bg-slate-50 flex items-center justify-center overflow-hidden">
            {imgs.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.img key={currentIdx} src={imgs[currentIdx]} alt={p.name} className="w-full h-full object-cover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
              </AnimatePresence>
            ) : (
              <Package className="w-20 h-20 text-slate-200" />
            )}
            {imgs.length > 1 && (
              <>
                <button className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white" onClick={(e) => { e.stopPropagation(); setCardImageIndex(prev => ({ ...prev, [p.product_id]: (currentIdx - 1 + imgs.length) % imgs.length })); }}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white" onClick={(e) => { e.stopPropagation(); setCardImageIndex(prev => ({ ...prev, [p.product_id]: (currentIdx + 1) % imgs.length })); }}>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                  {imgs.map((_, i) => (
                    <button key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIdx ? 'bg-white w-4' : 'bg-white/50'}`} onClick={(e) => { e.stopPropagation(); setCardImageIndex(prev => ({ ...prev, [p.product_id]: i })); }} />
                  ))}
                </div>
              </>
            )}
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              <span className="bg-brand text-white px-2 py-0.5 text-[10px] font-bold uppercase rounded">{p.category}</span>
              {imgs.length > 1 && <span className="bg-black/60 text-white px-2 py-0.5 text-[10px] font-bold rounded">{imgs.length} photos</span>}
            </div>
            <div className="absolute top-3 right-3">
              <span className="bg-slate-900 text-white px-3 py-1.5 font-heading font-bold text-sm rounded">{p.price}€</span>
            </div>
          </div>
          <div className="p-4">
            <h4 className="font-heading font-bold text-sm leading-tight mb-1.5 line-clamp-2">{p.name}</h4>
            {p.description && <p className="text-[11px] text-slate-500 line-clamp-2 mb-3">{p.description}</p>}
            {p.sizes?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {p.sizes.slice(0, 6).map(s => <span key={s} className="bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold rounded">{s}</span>)}
                {p.sizes.length > 6 && <span className="text-[10px] text-slate-400">+{p.sizes.length - 6}</span>}
              </div>
            )}
            {p.colors?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {p.colors.slice(0, 4).map(c => <span key={c} className="bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold rounded">{c}</span>)}
                {p.colors.length > 4 && <span className="text-[10px] text-slate-400">+{p.colors.length - 4}</span>}
              </div>
            )}
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3 pt-2 border-t border-slate-100">
              <span>Stock: <strong>{p.stock}</strong></span>
              <span>Commission: <strong className="text-green-600">{p.suggested_commission}€</strong></span>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1 rounded" onClick={() => onEdit(p)}><Edit className="w-3 h-3" /> Modifier</Button>
              <Button variant="outline" size="sm" className="h-8 text-red-500 rounded" onClick={() => onDelete(p.product_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        </motion.div>
      );
    })}
    {products.length === 0 && (
      <div className="col-span-full bg-white border border-slate-200 p-12 text-center rounded-lg">
        <Package className="w-16 h-16 mx-auto mb-4 text-slate-200" />
        <h3 className="font-heading font-bold text-lg uppercase mb-2">Aucun produit</h3>
        <p className="text-slate-500 mb-4">Creez votre catalogue pour que les organisateurs puissent selectionner vos produits</p>
      </div>
    )}
  </div>
);

export default ProviderCatalogue;
