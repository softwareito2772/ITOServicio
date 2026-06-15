'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Loader2, X, Upload, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { productsAPI, categoriesAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency, getStockStatus } from '@/lib/utils';

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  stock_min: number;
  category?: { id: number; name: string };
  image_url?: string;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  type: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '0',
    stock_min: '5',
    category_id: '',
    image_url: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prodsRes, catsRes] = await Promise.all([
        productsAPI.getAll(0, 100, search || undefined),
        categoriesAPI.getAll('product'),
      ]);
      setProducts(prodsRes.data);
      setCategories(catsRes.data);
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: formData.name,
      description: formData.description || undefined,
      price: parseFloat(formData.price) || 0,
      stock: parseInt(formData.stock) || 0,
      stock_min: parseInt(formData.stock_min) || 5,
      category_id: formData.category_id ? parseInt(formData.category_id) : undefined,
    };

    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, payload);
        if (imageFile) {
          await productsAPI.uploadImage(editingProduct.id, imageFile);
        }
        toast.success('Producto actualizado');
      } else {
        const res = await productsAPI.create(payload);
        if (imageFile && res.data?.id) {
          await productsAPI.uploadImage(res.data.id, imageFile);
        }
        toast.success('Producto creado');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Product save error:', error);
      console.error('Error response:', error.response?.data);
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail.forEach((d: any) => toast.error(`${d.loc?.slice(-1)}: ${d.msg}`));
      } else if (typeof detail === 'string') {
        toast.error(detail);
      } else {
        toast.error(error.message || 'Error al guardar');
      }
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      stock_min: product.stock_min.toString(),
      category_id: product.category?.id?.toString() || '',
      image_url: product.image_url || '',
    });
    setImagePreview(product.image_url || null);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await productsAPI.delete(id);
      toast.success('Producto eliminado');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: '', stock: '0', stock_min: '5', category_id: '', image_url: '' });
    setImagePreview(null);
    setImageFile(null);
  };

  const getStockBadge = (product: Product) => {
    const status = getStockStatus(product.stock, product.stock_min);
    if (status === 'critical') {
      return { bg: 'bg-danger/20', text: 'text-dangerDark', label: 'Crítico' };
    }
    if (status === 'low') {
      return { bg: 'bg-warning/20', text: 'text-warningDark', label: 'Bajo' };
    }
    return { bg: 'bg-success/20', text: 'text-successDark', label: 'Normal' };
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
          <p className="text-gray-500">Catálogo de productos y repuestos</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Buscar productos..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadData()} className="input-field pl-10" />
          </div>
          <button onClick={loadData} className="btn-outline">Buscar</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="mx-auto mb-4 text-gray-300" size={48} />
            <p className="text-gray-500">No hay productos registrados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => {
              const badge = getStockBadge(product);
              return (
                <div key={product.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="text-gray-300" size={48} />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800">{product.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>
                    {product.category && <p className="text-xs text-gray-500 mb-2">{product.category.name}</p>}
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-bold text-primary">{formatCurrency(product.price)}</span>
                      <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                    </div>
                    {product.stock <= product.stock_min && (
                      <div className="flex items-center gap-1 text-xs text-warningDark mb-3">
                        <AlertTriangle size={14} />
                        <span>Mínimo: {product.stock_min}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(product)} className="flex-1 btn-outline text-sm py-1">
                        <Edit size={14} className="inline mr-1" /> Editar
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="px-3 py-1 text-danger hover:bg-danger/10 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
                <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="input-field" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
                  <input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                  <input type="number" value={formData.stock_min} onChange={(e) => setFormData({ ...formData, stock_min: e.target.value })} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="input-field">
                  <option value="">Sin categoría</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imagen</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="input-field" />
                {imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 w-full h-40 object-cover rounded-lg" />}
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">{editingProduct ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
