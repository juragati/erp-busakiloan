import { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusCircle, Trash2, Save, ShoppingCart, Truck, FileText, CreditCard, Loader2, TrendingUp } from 'lucide-react';
import CreatableSelect from 'react-select/creatable';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const formatRibuan = (val) => { if (!val) return ''; return val.toString().replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
const unformatRibuan = (val) => parseInt(val.toString().replace(/\./g, ''), 10) || 0;
const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

const OrderCart = ({ selectedCustomer }) => {
  const [products, setProducts] = useState([]);
  const [sopirs, setSopirs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [items, setItems] = useState([]);
  const [sopirId, setSopirId] = useState(null);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = useState('');
  const [ongkir, setOngkir] = useState('');
  const [ongkirModal, setOngkirModal] = useState(''); 
  const [dp, setDp] = useState('');
  const [status, setStatus] = useState('MENUNGGU');
  const [metodeBayar, setMetodeBayar] = useState('TF');
  const [buktiLunas, setBuktiLunas] = useState(''); 
  const [keterangan, setKeterangan] = useState('');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [hargaSatuan, setHargaSatuan] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    fetchProducts(); fetchSopirs();
    const today = new Date();
    const jtDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    setTanggalJatuhTempo(`${jtDate.getFullYear()}-${String(jtDate.getMonth()+1).padStart(2,'0')}-${String(jtDate.getDate()).padStart(2,'0')}`);
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      setOngkir(selectedCustomer.dataAsli?.ongkirDefault || '');
      setOngkirModal(selectedCustomer.dataAsli?.ongkirPerusahaanDefault || '');
    } else { setOngkir(''); setOngkirModal(''); }
  }, [selectedCustomer]);

  const fetchProducts = () => { setIsLoading(true); axios.get(`${baseURL}/api/products`).then(res => setProducts(res.data.map(p => ({ value: p.id, label: `${p.nama} (#${p.id})`, dataAsli: p })))).finally(()=>setIsLoading(false)); };
  const fetchSopirs = () => axios.get(`${baseURL}/api/sopir`).then(res => setSopirs(res.data.map(s => ({ value: s.id, label: `${s.nama} (#${s.id})`, dataAsli: s }))));

  const handleProductChange = (selectedProd) => {
    setSelectedProduct(selectedProd);
    if (selectedProd) {
      const prodId = selectedProd.dataAsli?.id;
      if (selectedCustomer?.dataAsli?.hargaKhusus) {
        const hk = selectedCustomer.dataAsli.hargaKhusus.find(h => h.productId === prodId);
        if (hk) return setHargaSatuan(hk.harga);
      }
      setHargaSatuan(selectedProd.dataAsli?.hargaJual || 0);
    } else setHargaSatuan('');
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    const qtyNum = parseFloat(qty);
    const hargaNum = parseFloat(unformatRibuan(hargaSatuan));
    if (!selectedProduct) return alert("Silakan pilih produk terlebih dahulu!");
    if (isNaN(qtyNum) || qtyNum <= 0) return alert("Jumlah (Qty) harus lebih dari 0!");
    if (isNaN(hargaNum)) return alert("Harga satuan tidak valid!");

    setItems([...items, {
      productId: selectedProduct.value, nama: selectedProduct.label, satuanJual: selectedProduct.dataAsli?.satuanJual || '-',
      qty: qtyNum, hargaJual: hargaNum, hppSatuan: selectedProduct.dataAsli?.hpp || 0, subtotal: hargaNum * qtyNum
    }]);
    setSelectedProduct(null); setHargaSatuan(''); setQty(1);
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const totalBarang = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalModalBarang = items.reduce((sum, item) => sum + (item.hppSatuan * item.qty), 0);
  const ongkirNum = unformatRibuan(ongkir);
  const ongkirModalNum = unformatRibuan(ongkirModal);
  const grandTotal = totalBarang + ongkirNum;
  const dpNum = unformatRibuan(dp);
  const sisaBayar = grandTotal - dpNum;
  
  const estimasiProfit = (totalBarang - totalModalBarang) + (ongkirNum - ongkirModalNum);

  useEffect(() => {
    if (items.length > 0) {
      setStatus(prev => {
        if (sisaBayar <= 0 && ['MENUNGGU', 'DP'].includes(prev)) return 'SELESAI';
        if (dpNum > 0 && sisaBayar > 0 && prev === 'MENUNGGU') return 'DP';
        if (dpNum === 0 && prev === 'DP') return 'MENUNGGU';
        return prev;
      });
    }
  }, [sisaBayar, dpNum, items.length]);

  const handleSaveOrder = async () => {
    if (!selectedCustomer) return alert("Pilih pelanggan!");
    if (items.length === 0) return alert("Keranjang kosong!");
    if (!window.confirm("Simpan transaksi pesanan ini?")) return;

    setIsProcessing(true);
    try {
      await axios.post(`${baseURL}/api/orders`, {
        customerId: selectedCustomer.value, sopirId: sopirId ? sopirId.value : null,
        tanggal: tanggal, tanggalJatuhTempo: tanggalJatuhTempo, items: items, dp: dpNum,
        totalHarga: totalBarang, ongkosKirim: ongkirNum, ongkosKirimModal: ongkirModalNum,
        metodeBayar: metodeBayar, status: status, keterangan: keterangan, buktiLunas: buktiLunas
      });
      alert("Transaksi berhasil disimpan!");
      setItems([]); setSopirId(null); setOngkir(''); setOngkirModal(''); setDp(''); setKeterangan(''); setStatus('MENUNGGU'); setBuktiLunas('');
    } catch (e) { alert("Gagal menyimpan transaksi."); }
    finally { setIsProcessing(false); }
  };

  if (!selectedCustomer) return ( <div className="h-full flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl"><div className="text-center text-gray-400 space-y-2"><ShoppingCart size={40} className="mx-auto text-gray-300" /><p className="font-semibold text-sm">Pilih Pelanggan terlebih dahulu.</p></div></div> );

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border overflow-hidden relative">
      {isLoading && <div className="absolute inset-0 z-50 bg-white/60 flex justify-center items-center backdrop-blur-sm"><Loader2 className="animate-spin text-blue-600" size={32}/></div>}
      
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
        <h3 className="font-bold text-gray-800 flex items-center gap-2"><ShoppingCart size={18} className="text-blue-600"/> Buat Order Baru</h3>
        <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-lg">Pelanggan: {selectedCustomer.label}</span>
      </div>

      <div className="p-4 overflow-y-auto flex-1 space-y-5">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3 items-end">
            <div className="w-full lg:flex-1">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Cari Produk</label>
              <CreatableSelect options={products} value={selectedProduct} onChange={handleProductChange} placeholder="Ketik nama barang / ID..." />
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
              <div className="flex-1 lg:w-36">
                 <label className="text-[10px] font-semibold text-gray-600 mb-1 block uppercase">Harga/{selectedProduct ? (selectedProduct.dataAsli?.satuanJual || '-') : '-'}</label>
                 <input type="text" className="w-full border-2 p-2 rounded-lg text-sm font-semibold outline-none focus:border-blue-500 text-blue-700" value={formatRibuan(hargaSatuan)} onChange={e=>setHargaSatuan(unformatRibuan(e.target.value))} placeholder="0" />
              </div>
              <div className="w-24">
                <label className="text-[10px] font-semibold text-gray-600 mb-1 block uppercase">Qty Jual</label>
                <div className="flex bg-white border-2 rounded-lg focus-within:border-blue-500 overflow-hidden">
                  <input type="number" className="w-full p-2 text-sm font-bold text-center outline-none" value={qty} onChange={e=>setQty(e.target.value)} placeholder="1" />
                  <span className="bg-gray-100 text-[10px] font-bold text-gray-500 flex items-center px-1.5 border-l uppercase truncate max-w-[40px]">{selectedProduct ? (selectedProduct.dataAsli?.satuanJual || '-') : '-'}</span>
                </div>
              </div>
              <button type="button" onClick={handleAddItem} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><PlusCircle size={16}/> Add</button>
            </div>
          </div>

          <div className="mt-4 border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left"><thead className="bg-gray-50 border-b text-gray-700 font-semibold text-xs uppercase"><tr><th className="p-3">Nama Barang</th><th className="p-3 text-right">Harga Satuan</th><th className="p-3 text-center">Qty Jual</th><th className="p-3 text-right">Subtotal</th><th className="p-3 text-center">Aksi</th></tr></thead>
              <tbody className="divide-y">
                {items.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-gray-400 italic text-xs">Belum ada barang di keranjang.</td></tr>}
                {items.map((i, idx) => (<tr key={idx} className="hover:bg-gray-50"><td className="p-3 font-bold text-gray-900">{i.nama}</td><td className="p-3 text-right text-gray-600">{formatRp(i.hargaJual)}</td><td className="p-3 text-center font-black text-blue-800 bg-blue-50/30">{i.qty} <span className="text-[9px] font-normal text-gray-500 uppercase">{i.satuanJual}</span></td><td className="p-3 text-right font-bold text-gray-900">{formatRp(i.subtotal)}</td><td className="p-3 text-center"><button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"><Trash2 size={16}/></button></td></tr>))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
              <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2 border-b pb-2"><Truck size={16} className="text-blue-500"/> Pengiriman & Pembayaran</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Sopir (Hanya Referensi)</label>
                  <CreatableSelect isClearable options={sopirs} value={sopirId} onChange={setSopirId} placeholder="Pilih Sopir..." />
                </div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">Tgl Transaksi</label><input type="date" className="w-full border-2 p-2 rounded-lg text-sm outline-none" value={tanggal} onChange={e=>setTanggal(e.target.value)} /></div>
                <div><label className="text-xs font-semibold text-red-600 block mb-1">Jatuh Tempo</label><input type="date" className="w-full border-2 p-2 rounded-lg text-sm outline-none bg-red-50 border-red-200 text-red-700 font-medium" value={tanggalJatuhTempo} onChange={e=>setTanggalJatuhTempo(e.target.value)} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-orange-800 uppercase block mb-1">Ongkir dr Customer</label>
                  <input type="text" className="w-full border-2 p-2 rounded-lg text-sm outline-none bg-orange-50 font-bold text-orange-700" value={formatRibuan(ongkir)} onChange={e=>setOngkir(unformatRibuan(e.target.value))} placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-red-800 uppercase block mb-1">Ongkir ke Sopir</label>
                  <input type="text" className="w-full border-2 p-2 rounded-lg text-sm outline-none bg-red-50 font-bold text-red-700" value={formatRibuan(ongkirModal)} onChange={e=>setOngkirModal(unformatRibuan(e.target.value))} placeholder="0" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-green-800 uppercase block mb-1">Sudah Bayar (DP)</label>
                  <input type="text" className="w-full border-2 p-2 rounded-lg text-sm outline-none bg-green-50 font-bold text-green-700" value={formatRibuan(dp)} onChange={e=>setDp(unformatRibuan(e.target.value))} placeholder="0" />
                </div>
                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Metode</label><select className="w-full border-2 p-2 rounded-lg text-sm outline-none" value={metodeBayar} onChange={e=>setMetodeBayar(e.target.value)}><option value="TF">Transfer</option><option value="CASH">Cash</option></select></div>
                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Status Order</label><select className="w-full border-2 p-2 rounded-lg text-sm font-bold outline-none bg-gray-50" value={status} onChange={e=>setStatus(e.target.value)}><option value="MENUNGGU">MENUNGGU</option><option value="DP">DP</option><option value="DIKIRIM">DIKIRIM</option><option value="TERKIRIM">TERKIRIM</option><option value="SELESAI">SELESAI</option></select></div>
              </div>
              <div className="pt-2"><label className="text-xs font-semibold text-gray-600 block mb-1 flex items-center gap-1"><FileText size={12}/> Catatan / Bukti TF</label><input type="text" className="w-full border-2 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" value={keterangan} onChange={e=>setKeterangan(e.target.value)} placeholder="Tulis keterangan / link bukti..." /></div>
            </div>
          </div>

          <div className="bg-blue-50/50 p-5 rounded-xl border-2 border-blue-100 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium text-gray-600"><span>Total Barang:</span><span>{formatRp(totalBarang)}</span></div>
              <div className="flex justify-between text-sm font-medium text-gray-600 border-b border-blue-200 pb-3 mt-1"><span>Ongkir Tagihan:</span><span>+ {formatRp(ongkirNum)}</span></div>
              <div className="flex justify-between text-xl font-black text-gray-900 pt-3"><span>GRAND TOTAL:</span><span>{formatRp(grandTotal)}</span></div>
              <div className="flex justify-between text-sm font-semibold text-green-600 mt-1"><span>Sudah Dibayar (DP):</span><span>- {formatRp(dpNum)}</span></div>
              
              <div className={`mt-5 p-4 rounded-xl flex justify-between items-center border ${sisaBayar <= 0 ? 'bg-green-100 border-green-200 text-green-800' : 'bg-red-100 border-red-200 text-red-800'}`}>
                <span className="text-sm font-bold">{sisaBayar <= 0 ? 'LUNAS / KEMBALI:' : 'PIUTANG:'}</span><span className="text-2xl font-black">{formatRp(Math.abs(sisaBayar))}</span>
              </div>
              
              {items.length > 0 && (
                <div className="mt-2 p-3 bg-white border border-green-200 rounded-lg flex items-center justify-between text-green-700 shadow-sm">
                   <span className="text-xs font-bold flex items-center gap-1"><TrendingUp size={14}/> Estimasi Profit:</span>
                   <span className="font-black text-lg">{formatRp(estimasiProfit)}</span>
                </div>
              )}
            </div>
            <button disabled={isProcessing} type="button" onClick={handleSaveOrder} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-base mt-4 shadow-md transition-transform active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50">
               {isProcessing ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} SIMPAN TRANSAKSI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OrderCart;