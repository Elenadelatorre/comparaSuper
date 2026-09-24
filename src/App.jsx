import React, { useState, useEffect } from 'react';
import {
  Store,
  Tag,
  PlusCircle,
  Search,
  RefreshCw,
  Trash2,
  ShoppingBasket,
  CheckCircle2,
  Trophy,
  Globe,
  DownloadCloud
} from 'lucide-react';
import { supabase } from './supabase';

export default function App() {
  const [tab, setTab] = useState('compare'); // 'compare' | 'basket' | 'add'
  const [supermarkets, setSupermarkets] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Formulario manual
  const [productName, setProductName] = useState('');
  const [selectedSuper, setSelectedSuper] = useState('Mercadona');
  const [brand, setBrand] = useState('');
  const [packagePrice, setPackagePrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('kg');

  // Búsqueda y consulta online bajo demanda
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineResults, setOnlineResults] = useState([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  // Cesta de la compra
  const [basketItems, setBasketItems] = useState([]);

  // 1. Cargar datos de Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: supersData } = await supabase
        .from('supermarkets')
        .select('*')
        .order('name');
      if (supersData && supersData.length > 0) {
        setSupermarkets(supersData);
      }

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

  // 2. Consulta de precios online BAJO DEMANDA al buscar un alimento
  const searchOnlinePrices = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingOnline(true);
    setOnlineResults([]);

    try {
      const res = await fetch(
        `/api/search-prices?q=${encodeURIComponent(searchQuery.trim())}`
      );
      const data = await res.json();
      if (data.results) {
        setOnlineResults(data.results);
      }
    } catch (err) {
      console.error('Error en búsqueda online:', err);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // Guardar un resultado online encontrado directamente a Supabase
  const saveOnlinePrice = async (item) => {
    const newRecord = {
      product: item.product,
      supermarket: item.supermarket,
      brand: item.brand,
      package_price: item.package_price,
      quantity: item.quantity,
      unit: item.unit,
      date_recorded: new Date().toISOString().split('T')[0]
    };

    const { error } = await supabase.from('price_entries').insert([newRecord]);
    if (!error) {
      await fetchData();
      setOnlineResults(onlineResults.filter((o) => o !== item));
    }
  };

  // 3. Guardar precio manual
  const calculatedUnitPrice =
    packagePrice && quantity && Number(quantity) > 0
      ? (Number(packagePrice) / Number(quantity)).toFixed(2)
      : '0.00';

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
        alert('Error: ' + error.message);
      } else {
        setProductName('');
        setBrand('');
        setPackagePrice('');
        setQuantity('1');
        await fetchData();
        setSearchQuery(newRecord.product);
        setTab('compare');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    const { error } = await supabase
      .from('price_entries')
      .delete()
      .eq('id', id);
    if (!error) {
      setEntries(entries.filter((item) => item.id !== id));
    }
  };

  // Filtrado de tus registros guardados
  const filteredEntries = entries.filter(
    (item) =>
      item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supermarket.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.brand &&
        item.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Lógica cesta
  const uniqueProducts = Array.from(
    new Set(entries.map((e) => e.product))
  ).sort();

  const toggleBasketItem = (prod) => {
    if (basketItems.includes(prod)) {
      setBasketItems(basketItems.filter((p) => p !== prod));
    } else {
      setBasketItems([...basketItems, prod]);
    }
  };

  const calculateBasketTotals = () => {
    if (basketItems.length === 0) return [];
    const supers = ['Mercadona', 'Carrefour', 'Lidl'];

    const results = supers.map((sName) => {
      let total = 0;
      let matchedCount = 0;
      basketItems.forEach((item) => {
        const matches = entries
          .filter(
            (e) =>
              e.supermarket === sName &&
              e.product.toLowerCase() === item.toLowerCase()
          )
          .sort(
            (a, b) => new Date(b.date_recorded) - new Date(a.date_recorded)
          );
        if (matches.length > 0) {
          matchedCount += 1;
          total += Number(matches[0].package_price);
        }
      });
      return {
        supermarket: sName,
        total: Number(total.toFixed(2)),
        matchedCount,
        isComplete: matchedCount === basketItems.length
      };
    });

    return results.sort((a, b) => {
      if (a.isComplete && !b.isComplete) return -1;
      if (!a.isComplete && b.isComplete) return 1;
      return a.total - b.total;
    });
  };

  const basketResults = calculateBasketTotals();

  return (
    <div className='flex flex-col justify-between max-w-md min-h-screen mx-auto shadow-md bg-slate-50 text-slate-800 border-x border-slate-200'>
      {/* Cabecera */}
      <header className='sticky top-0 z-10 flex items-center justify-between p-4 text-white shadow-sm bg-emerald-600'>
        <h1 className='flex items-center gap-2 text-lg font-bold'>
          <Store className='w-5 h-5' /> ComparaSuper
        </h1>
        <button
          onClick={fetchData}
          className='text-white transition hover:text-emerald-200'
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Contenido */}
      <main className='flex-1 p-4'>
        {/* PESTAÑA 1: COMPARAR Y BUSCAR ON-DEMAND */}
        {tab === 'compare' && (
          <div className='space-y-4'>
            {/* Buscador */}
            <div className='space-y-2'>
              <div className='relative'>
                <Search className='absolute w-4 h-4 left-3 top-3 text-slate-400' />
                <input
                  type='text'
                  placeholder="Buscar ej. 'leche', 'pechuga', 'arroz'..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='w-full py-2 pr-3 text-sm bg-white border rounded-lg outline-none border-slate-300 pl-9 focus:ring-2 focus:ring-emerald-500'
                />
              </div>

              {searchQuery.trim().length > 1 && (
                <button
                  onClick={searchOnlinePrices}
                  disabled={isSearchingOnline}
                  className='flex items-center justify-center w-full gap-2 px-3 py-2 text-xs font-semibold text-white transition rounded-lg bg-slate-800 hover:bg-slate-900 disabled:opacity-50'
                >
                  <Globe className='w-3.5 h-3.5' />
                  {isSearchingOnline
                    ? 'Consultando en Mercadona, Carrefour y Lidl...'
                    : `Consultar precios online de "${searchQuery}"`}
                </button>
              )}
            </div>

            {/* Resultados Online en Vivo */}
            {onlineResults.length > 0 && (
              <div className='bg-sky-50 border border-sky-200 rounded-xl p-3 space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-xs font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5'>
                    <Globe className='w-3.5 h-3.5' /> Encontrado en internet
                    ahora:
                  </h3>
                  <button
                    onClick={() => setOnlineResults([])}
                    className='text-[10px] text-sky-600 underline'
                  >
                    Cerrar
                  </button>
                </div>

                <div className='space-y-2'>
                  {onlineResults.map((item, idx) => (
                    <div
                      key={idx}
                      className='bg-white p-2.5 rounded-lg border border-sky-100 flex items-center justify-between shadow-xs'
                    >
                      <div className='pr-2'>
                        <p className='text-xs font-semibold text-slate-800'>
                          {item.product}
                        </p>
                        <p className='text-[10px] text-slate-500'>
                          {item.supermarket} •{' '}
                          <span className='italic'>{item.brand}</span>
                        </p>
                      </div>
                      <div className='flex items-center gap-2'>
                        <div className='text-right'>
                          <span className='text-sm font-bold text-slate-900'>
                            {item.unit_price} €/{item.unit}
                          </span>
                          <p className='text-[10px] text-slate-400'>
                            {item.package_price}€
                          </p>
                        </div>
                        <button
                          onClick={() => saveOnlinePrice(item)}
                          className='bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-md shadow-xs'
                          title='Guardar en mis registros'
                        >
                          <DownloadCloud className='w-3.5 h-3.5' />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Listado de tus registros locales */}
            <div className='space-y-2.5'>
              <h3 className='text-xs font-bold tracking-wider uppercase text-slate-400'>
                Mis precios guardados
              </h3>
              {filteredEntries.length === 0 ? (
                <div className='py-6 text-sm text-center text-slate-400'>
                  No hay registros guardados con ese nombre.
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
                    <div className='flex items-start justify-between'>
                      <div>
                        <h3 className='text-sm font-semibold text-slate-800'>
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
                        className='p-1 text-red-400 hover:text-red-600'
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

        {/* PESTAÑA 2: CESTA DE LA COMPRA */}
        {tab === 'basket' && (
          <div className='space-y-4'>
            <div>
              <h2 className='mb-2 text-xs font-bold tracking-wider uppercase text-slate-500'>
                Selecciona qué vas a comprar hoy:
              </h2>
              <div className='flex flex-wrap gap-1.5'>
                {uniqueProducts.map((p) => {
                  const isSelected = basketItems.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => toggleBasketItem(p)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className='w-3.5 h-3.5' />}
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {basketItems.length > 0 && (
              <div className='pt-2 space-y-2'>
                <h3 className='text-xs font-bold tracking-wider uppercase text-slate-500'>
                  ¿A qué supermercado ir?
                </h3>
                {basketResults.map((res, idx) => (
                  <div
                    key={res.supermarket}
                    className={`p-3.5 rounded-xl border bg-white shadow-sm flex items-center justify-between ${
                      idx === 0 && res.isComplete
                        ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/10'
                        : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-bold text-slate-800'>
                          {res.supermarket}
                        </span>
                        {idx === 0 && res.isComplete && (
                          <span className='bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full'>
                            Ganador
                          </span>
                        )}
                      </div>
                      <span className='text-[11px] text-slate-400'>
                        {res.matchedCount}/{basketItems.length} productos con
                        precio
                      </span>
                    </div>
                    <span className='text-base font-extrabold text-slate-900'>
                      {res.matchedCount > 0
                        ? `${res.total.toFixed(2)} €`
                        : 'Sin datos'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: AÑADIR MANUAL (EN PASILLO) */}
        {tab === 'add' && (
          <form onSubmit={handleAddEntry} className='space-y-4'>
            <h2 className='text-sm font-semibold tracking-wider uppercase text-slate-500'>
              Registrar precio a mano
            </h2>

            <div>
              <label className='block mb-1 text-xs font-semibold text-slate-600'>
                Supermercado
              </label>
              <select
                value={selectedSuper}
                onChange={(e) => setSelectedSuper(e.target.value)}
                className='w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none'
              >
                {['Mercadona', 'Carrefour', 'Lidl', 'Dia', 'Aldi'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='block mb-1 text-xs font-semibold text-slate-600'>
                Producto
              </label>
              <input
                type='text'
                placeholder='Ej. Pechuga de pollo, Leche...'
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className='w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none'
                required
              />
            </div>

            <div>
              <label className='block mb-1 text-xs font-semibold text-slate-600'>
                Marca (opcional)
              </label>
              <input
                type='text'
                placeholder='Ej. Hacendado, Milbona'
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className='w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none'
              />
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block mb-1 text-xs font-semibold text-slate-600'>
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
                <label className='block mb-1 text-xs font-semibold text-slate-600'>
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

            <div className='p-3 text-center border rounded-lg bg-emerald-50 border-emerald-200'>
              <span className='text-xs font-medium text-emerald-700'>
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
              {saving ? 'Guardando...' : 'Guardar Precio'}
            </button>
          </form>
        )}
      </main>

      {/* Navegación inferior */}
      <nav className='sticky bottom-0 grid grid-cols-3 p-2 bg-white border-t border-slate-200'>
        <button
          onClick={() => setTab('compare')}
          className={`flex flex-col items-center py-1 text-xs font-medium ${tab === 'compare' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <Tag className='w-5 h-5 mb-0.5' />
          Comparar
        </button>
        <button
          onClick={() => setTab('basket')}
          className={`flex flex-col items-center py-1 text-xs font-medium ${tab === 'basket' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <ShoppingBasket className='w-5 h-5 mb-0.5' />
          Cesta
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
