import React, { useState, useEffect } from 'react';
import {
  Store,
  Tag,
  PlusCircle,
  Search,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { supabase } from './supabase';

export default function App() {
  const [tab, setTab] = useState('compare'); // 'compare' | 'add'
  const [supermarkets, setSupermarkets] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Campos del formulario
  const [productName, setProductName] = useState('');
  const [selectedSuper, setSelectedSuper] = useState('');
  const [brand, setBrand] = useState('');
  const [packagePrice, setPackagePrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('kg');

  // Filtro de búsqueda
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Cargar datos desde Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      // Cargar supermercados
      const { data: supersData } = await supabase
        .from('supermarkets')
        .select('*')
        .order('name');

      if (supersData && supersData.length > 0) {
        setSupermarkets(supersData);
        if (!selectedSuper) setSelectedSuper(supersData[0].name);
      }

      // Cargar precios registrados
      const { data: priceData, error } = await supabase
        .from('price_entries')
        .select('*')
        .order('unit_price', { ascending: true });

      if (!error && priceData) {
        setEntries(priceData);
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Cálculo en vivo del precio unitario
  const calculatedUnitPrice =
    packagePrice && quantity && Number(quantity) > 0
      ? (Number(packagePrice) / Number(quantity)).toFixed(2)
      : '0.00';

  // 2. Guardar un nuevo precio en Supabase
  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!productName || !packagePrice || !quantity || !selectedSuper) return;

    setSaving(true);
    try {
      const newRecord = {
        product: productName.trim(),
        supermarket: selectedSuper,
        brand: brand.trim() || 'Marca blanca',
        package_price: parseFloat(packagePrice),
        quantity: parseFloat(quantity),
        unit: unit,
        date_recorded: new Date().toISOString().split('T')[0]
      };

      const { error } = await supabase
        .from('price_entries')
        .insert([newRecord]);

      if (error) {
        alert('Error al guardar: ' + error.message);
      } else {
        // Limpiar formulario y refrescar
        setProductName('');
        setBrand('');
        setPackagePrice('');
        setQuantity('1');
        await fetchData();
        setSearchQuery(newRecord.product);
        setTab('compare');
      }
    } catch (err) {
      console.error('Error al insertar:', err);
    } finally {
      setSaving(false);
    }
  };

  // 3. Eliminar un registro
  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que quieres borrar este registro?')) return;
    const { error } = await supabase
      .from('price_entries')
      .delete()
      .eq('id', id);
    if (!error) {
      setEntries(entries.filter((item) => item.id !== id));
    }
  };

  // Filtrar productos por búsqueda
  const filteredEntries = entries.filter(
    (item) =>
      item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supermarket.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.brand &&
        item.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className='min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between max-w-md mx-auto shadow-md border-x border-slate-200'>
      {/* Cabecera */}
      <header className='bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between'>
        <h1 className='font-bold text-lg flex items-center gap-2'>
          <Store className='w-5 h-5' /> ComparaSuper
        </h1>
        <button
          onClick={fetchData}
          className='text-white hover:text-emerald-200 transition'
          title='Recargar datos'
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Contenido principal */}
      <main className='p-4 flex-1'>
        {tab === 'add' ? (
          <form onSubmit={handleAddEntry} className='space-y-4'>
            <h2 className='text-sm font-semibold uppercase tracking-wider text-slate-500'>
              Registrar precio
            </h2>

            <div>
              <label className='block text-xs font-semibold text-slate-600 mb-1'>
                Supermercado
              </label>
              <select
                value={selectedSuper}
                onChange={(e) => setSelectedSuper(e.target.value)}
                className='w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none'
              >
                {supermarkets.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='block text-xs font-semibold text-slate-600 mb-1'>
                Producto
              </label>
              <input
                type='text'
                placeholder='Ej. Pechuga de pollo, Arroz...'
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className='w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none'
                required
              />
            </div>

            <div>
              <label className='block text-xs font-semibold text-slate-600 mb-1'>
                Marca (opcional)
              </label>
              <input
                type='text'
                placeholder='Ej. Hacendado, Pascual'
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className='w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none'
              />
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block text-xs font-semibold text-slate-600 mb-1'>
                  Precio total (€)
                </label>
                <input
                  type='number'
                  step='0.01'
                  placeholder='2.45'
                  value={packagePrice}
                  onChange={(e) => setPackagePrice(e.target.value)}
                  className='w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none'
                  required
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-slate-600 mb-1'>
                  Cantidad / Unidad
                </label>
                <div className='flex gap-1'>
                  <input
                    type='number'
                    step='0.01'
                    placeholder='1'
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className='w-2/3 bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none'
                    required
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className='w-1/3 bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none'
                  >
                    <option value='kg'>kg</option>
                    <option value='L'>L</option>
                    <option value='ud'>ud</option>
                  </select>
                </div>
              </div>
            </div>

            <div className='bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center'>
              <span className='text-xs text-emerald-700 font-medium'>
                Precio por unidad de medida:
              </span>
              <p className='text-lg font-bold text-emerald-800'>
                {calculatedUnitPrice} €/{unit}
              </p>
            </div>

            <button
              type='submit'
              disabled={saving}
              className='w-full bg-emerald-600 text-white font-semibold py-3 rounded-lg shadow-sm hover:bg-emerald-700 transition active:scale-[0.98] disabled:opacity-50'
            >
              {saving ? 'Guardando en la nube...' : 'Guardar Precio'}
            </button>
          </form>
        ) : (
          <div className='space-y-4'>
            {/* Buscador */}
            <div className='relative'>
              <Search className='w-4 h-4 absolute left-3 top-3 text-slate-400' />
              <input
                type='text'
                placeholder='Buscar por producto, marca o súper...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none'
              />
            </div>

            {/* Listado */}
            <div className='space-y-2.5'>
              {loading ? (
                <p className='text-center text-sm text-slate-400 py-8'>
                  Cargando precios...
                </p>
              ) : filteredEntries.length === 0 ? (
                <div className='text-center py-8'>
                  <p className='text-sm text-slate-400'>
                    No hay precios registrados todavía.
                  </p>
                  <button
                    onClick={() => setTab('add')}
                    className='mt-3 text-xs bg-emerald-100 text-emerald-800 font-semibold px-3 py-1.5 rounded-md hover:bg-emerald-200 transition'
                  >
                    + Registrar el primero
                  </button>
                </div>
              ) : (
                filteredEntries.map((item, index) => (
                  <div
                    key={item.id}
                    className={`p-3 bg-white rounded-xl border ${index === 0 && searchQuery ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/20' : 'border-slate-200'} shadow-sm relative`}
                  >
                    {index === 0 && searchQuery && (
                      <span className='absolute -top-2.5 right-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider'>
                        Más barato
                      </span>
                    )}
                    <div className='flex justify-between items-start'>
                      <div>
                        <h3 className='font-semibold text-sm text-slate-800'>
                          {item.product}
                        </h3>
                        <p className='text-xs text-slate-500'>
                          {item.supermarket} •{' '}
                          <span className='italic'>{item.brand}</span>
                        </p>
                      </div>
                      <div className='text-right'>
                        <span className='text-base font-extrabold text-slate-900'>
                          {item.unit_price} €/{item.unit}
                        </span>
                        <p className='text-[11px] text-slate-400'>
                          {item.package_price}€ envase ({item.quantity}
                          {item.unit})
                        </p>
                      </div>
                    </div>
                    <div className='mt-2 text-[10px] text-slate-400 border-t border-slate-100 pt-1.5 flex justify-between items-center'>
                      <span>Registrado: {item.date_recorded}</span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className='text-red-400 hover:text-red-600 p-1'
                        title='Eliminar registro'
                      >
                        <Trash2 className='w-3.5 h-3.5' />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Navegación inferior */}
      <nav className='bg-white border-t border-slate-200 grid grid-cols-2 p-2 sticky bottom-0'>
        <button
          onClick={() => setTab('compare')}
          className={`flex flex-col items-center py-1 text-xs font-medium ${tab === 'compare' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <Tag className='w-5 h-5 mb-0.5' />
          Comparar
        </button>
        <button
          onClick={() => setTab('add')}
          className={`flex flex-col items-center py-1 text-xs font-medium ${tab === 'add' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <PlusCircle className='w-5 h-5 mb-0.5' />
          Añadir
        </button>
      </nav>
    </div>
  );
}
