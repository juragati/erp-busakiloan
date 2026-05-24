import { useState, useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';
import axiosLib from 'axios';
import { PlusCircle, Trash2, Save, ShoppingCart, Truck, FileText, CreditCard, TrendingUp } from 'lucide-react';
import LoadingOverlay from './LoadingOverlay';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const formatRpInput = (angka) => angka ? angka.toString().replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '';
const parseRpInput = (text) => text.toString().replace(/[^0-9]/g, '');

const OrderCart = ({ selectedCustomer }) => {
  const [products, setProducts] = useState([]);
  const [sopirs, setSopirs] = useState([]);
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
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchProducts(); fetchSopirs();
    const today = new Date(); const jtDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    setTanggalJatuhTempo(`${jtDate.getFullYear()}-${String(jtDate.getMonth()+1).padStart(2,'0')}-${String(jtDate.getDate()).padStart(2,'0')}`);
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      setOngkir(selectedCustomer.dataAsli?.ongkirDefault?.toString() || '');
      setOngkirModal(selectedCustomer.dataAsli?.ongkirPerusahaanDefault?.toString() || '');
    } else { setOngkir(''); setOngkirModal(''); }
  }, [selectedCustomer]);

  const fetchProducts = () => axiosLib.get(`${baseURL}/api/products`).then(res => setProducts(res.data.map(p => ({ value: p.id, label: `${p.nama} (#${p.id})`, dataAsli: p }))));
  const fetchSopirs = () => axiosLib.get(`${baseURL}/api/sopir`).then(res => setSopirs(res.data.map(s => ({ value: s.id, label: `${s.nama} (#${s.id})`, dataAsli: s }))));

  const handleProductChange = (selectedProd) => {
    setSelectedProduct(selectedProd);
    if (selectedProd) {
      const prodId = selectedProd.dataAsli?.id;
      if (selectedCustomer?.dataAsli?.hargaKhusus) {
        const hk = selectedCustomer.dataAsli.hargaKhusus.find(h => h.productId === prodId);
        if (hk) return setHargaSatuan(hk.harga.toString());
      }
      setHargaSatuan(selectedProd.dataAsli?.hargaJual?.toString() || '0');
    } else { setHargaSatuan(''); }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    const qtyNum = parseFloat(qty);
    const hargaNum = parseInt(parseRpInput(hargaSatuan) || 0);
    if (!selectedProduct) return alert("Pilih produk!");
    if (qtyNum <= 0 || hargaNum < 0) return alert("QTY/Harga tidak valid!");

    const newItem = {
      productId: selectedProduct.value, nama: selectedProduct.label,
      satuanJual: selectedProduct.dataAsli?.satuanJual || '-',
      qty: qtyNum, hargaJual: hargaNum, hppSatuan: selectedProduct.dataAsli?.hpp || 0,
      subtotal: hargaNum * qtyNum
    };
    setItems([...items, newItem]);
    setSelectedProduct(null); setHargaSatuan(''); setQty(1);
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const totalBarang = items.reduce((sum, item) => sum + item.subtotal, 0);
  const ongkirNum = parseInt(parseRpInput(ongkir) || 0);
  const ongkirModalNum = parseInt(parseRpInput(ongkirModal) || 0);
  const grandTotal = totalBarang + ongkirNum;
  const dpNum = parseInt(parseRpInput(dp) || 0);
  const sisaBayar = grandTotal - dpNum;

  // UX: ESTIMASI PROFIT SEBELUM SIMPAN KE DB
  const estimasiBarangProfit = items.reduce((sum, item) => sum + ((item.hargaJual - item.hppSatuan) * item.qty), 0);
  const estimasiProfitBersih = estimasiBarangProfit + (ongkirNum - ongkirModalNum);

  useEffect(() => {
    if (items.length > 0) {
      setStatus(prev => {
        if (sisaBayar <= 0) return 'SELESAI';
        if (dpNum > 0 && sisaBayar > 0) return 'DP';
        return 'MENUNGGU';
      });
    }
  }, [sisaBayar, dpNum, items.length]);

  const handleSaveOrder = async () => {
    if (!selectedCustomer || items.length === 0 || isProcessing) return alert("Lengkapi data pelanggan dan barang!");
    if (!window.confirm("Simpan transaksi pesanan ini?")) return;
    setIsProcessing(true);
    try {
      await axiosLib.post(`${baseURL}/api/orders`, {
        customerId: selectedCustomer.value, sopirId: sopirId ? sopirId.value : null,
        tanggal, tanggalJatuhTempo, items, dp: dpNum,
        totalHarga: totalBarang, ongkosKirim: ongkirNum, ongkosKirimModal: ongkirModalNum,
        metodeBayar, status, keterangan, buktiLunas
      });
      alert("✅ Transaksi berhasil disimpan!");
      setItems([]); setSopirId(null); setDp(''); setKeterangan(''); setBuktiLunas('');
    } catch (e) { alert("Gagal menyimpan."); }
    finally { setIsProcessing(false); }
  };

  const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

  if (!selectedCustomer) return <div className="h-full flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-12"><div className="text-center text-gray-400 font-bold text-xs"><ShoppingCart className="mx-auto text-gray-300 mb-2" size={32} />Pilih Pelanggan terlebih dahulu di kolom kiri.</div></div>;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border overflow-hidden">
      <LoadingOverlay isLoading={isProcessing} />
      <div className="p-3 bg-gray-50 border-b flex justify-between items-center shrink-0">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm"><ShoppingCart size={18} className="text-blue-600"/> Buat Order Baru</h3>
        <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-lg">Pelanggan: {selectedCustomer.label}</span>
      </div>

      <div className="p-4 overflow-y-auto flex-1 space-y-5">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3 items-end mb-4">
            <div className="w-full lg:flex-1">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Cari Produk (Busa / Bantal)</label>
              <CreatableSelect options={products} value={selectedProduct} onChange={handleProductChange} placeholder="Ketik nama produk..." />
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
              <div className="flex-1 lg:w-36">
                 <label className="text-[10px] font-semibold text-gray-600 mb-1 block uppercase">Harga / {selectedProduct ? (selectedProduct.dataAsli?.satuanJual || '-') : '-'}</label>
                 <input type="text" inputMode="numeric" className="w-full border-2 p-2 rounded-lg text-sm font-semibold outline-none focus:border-blue-500 text-blue-700" value={formatRpInput(hargaSatuan)} onChange={e=>setHargaSatuan(parseRpInput(e.target.value))} placeholder="0" />
              </div>
              <div className="w-20">
                <label className="text-[10px] font-semibold text-gray-600 mb-1 block uppercase">Qty</label>
                <div className="flex bg-white border-2 rounded-lg focus-within:border-blue-500 overflow-hidden">
                  <input type="number" className="w-full p-2 text-sm font-bold text-center outline-none" value={qty} onChange={e=>setQty(e.target.value)} placeholder="1" />
                  <span className="bg-gray-100 text-[10px] font-bold text-gray-500 flex items-center px-1.5 border-l uppercase truncate max-w-[40px]">{selectedProduct ? (selectedProduct.dataAsli?.satuanJual || '-') : '-'}</span>
                </div>
              </div>
              <button type="button" onClick={handleAddItem} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><PlusCircle size={16}/> Add</button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left"><thead className="bg-gray-50 border-b text-gray-700 font-semibold text-xs uppercase"><tr><th className="p-3">Nama Barang</th><th className="p-3 text-right">Harga Satuan</th><th className="p-3 text-center">Qty Jual</th><th className="p-3 text-right">Subtotal</th><th className="p-3 text-center">Aksi</th></tr></thead>
              <tbody className="divide-y">
                {items.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-gray-400 italic text-xs">Belum ada barang di keranjang.</td></tr>}
                {items.map((i, idx) => (<tr key={idx} className="hover:bg-gray-50"><td className="p-3 font-semibold text-gray-900">{i.nama}</td><td className="p-3 text-right text-gray-600">{formatRp(i.hargaJual)}</td><td className="p-3 text-center font-black text-blue-800 bg-blue-50/30">{i.qty} <span className="text-[9px] font-normal text-gray-500 uppercase">{i.satuanJual}</span></td><td className="p-3 text-right font-bold text-gray-900">{formatRp(i.subtotal)}</td><td className="p-3 text-center"><button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"><Trash2 size={16}/></button></td></tr>))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2 border-b pb-2"><Truck size={16} className="text-blue-500"/> Pengiriman & Info</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Sopir (Hanya Referensi)</label>
                  <CreatableSelect isClearable options={sopirs} value={sopirId} onChange={setSopirId} placeholder="Pilih Sopir / Ketik ID..." />
                </div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">Tgl Transaksi</label><input type="date" className="w-full border-2 p-2 rounded-lg text-sm outline-none" value={tanggal} onChange={e=>setTanggal(e.target.value)} /></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1 text-red-600">Jatuh Tempo</label><input type="date" className="w-full border-2 p-2 rounded-lg text-sm outline-none bg-red-50 border-red-200 text-red-700 font-medium" value={tanggalJatuhTempo} onChange={e=>setTanggalJatuhTempo(e.target.value)} /></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2 border-b pb-2"><CreditCard size={16} className="text-blue-500"/> Pembayaran</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-lg">
                  <label className="text-[10px] font-bold text-orange-800 uppercase block mb-1">Ongkir dari Customer</label>
                  <input type="text" inputMode="numeric" className="w-full border-2 p-2 rounded text-sm bg-white font-bold text-orange-700 outline-none" value={formatRpInput(ongkir)} onChange={e=>setOngkir(parseRpInput(e.target.value))} placeholder="0" />
                </div>
                <div className="bg-red-50 border border-red-200 p-2.5 rounded-lg">
                  <label className="text-[10px] font-bold text-red-800 uppercase block mb-1">Ongkir ke Sopir</label>
                  <input type="text" inputMode="numeric" className="w-full border-2 p-2 rounded text-sm bg-white font-bold text-red-700 outline-none" value={formatRpInput(ongkirModal)} onChange={e=>setOngkirModal(parseRpInput(e.target.value))} placeholder="0" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-600 block mb-1">Sudah Bayar (DP)</label>
                  <input type="text" inputMode="numeric" className="w-full border-2 p-2.5 rounded-xl text-green-700 bg-green-50 font-bold outline-none border-green-200" value={formatRpInput(dp)} onChange={e=>setDp(parseRpInput(e.target.value))} />
                </div>
                <div><label className="text-xs font-bold text-gray-600 block mb-1">Metode</label><select className="w-full border-2 p-2.5 rounded-xl font-bold outline-none bg-white text-gray-700" value={metodeBayar} onChange={e=>setMetodeBayar(e.target.value)}><option value="TF">Transfer Bank</option><option value="CASH">Tunai (Cash)</option></select></div>
                <div><label className="text-xs font-bold text-gray-600 block mb-1">Status Order</label><select className="w-full border-2 p-2.5 rounded-xl font-bold outline-none bg-gray-50 text-gray-700" value={status} onChange={e=>setStatus(e.target.value)}><option value="MENUNGGU">MENUNGGU (Belum Bayar)</option><option value="DP">DP (Bayar Sebagian)</option><option value="DIKIRIM">DIKIRIM (Jalan)</option><option value="TERKIRIM">TERKIRIM (Piutang)</option><option value="SELESAI">SELESAI (Lunas)</option><option value="DIBATALKAN">DIBATALKAN (Cancel)</option></select></div>
                <div className="col-span-2"><label className="text-xs font-bold text-gray-600 block mb-1">Bukti Transfer (Link)</label><input type="text" className="w-full border-2 p-2.5 rounded-xl text-sm outline-none bg-white" value={buktiLunas} onChange={e=>setBuktiLunas(e.target.value)} placeholder="Opsional..." /></div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50/50 p-5 rounded-2xl border-2 border-blue-100 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium text-gray-600"><span>Total Barang:</span><span>{formatRp(totalBarang)}</span></div>
              <div className="flex justify-between text-sm font-medium text-gray-600 border-b border-blue-200 pb-3 mt-1"><span>Ongkir Tagihan:</span><span>+ {formatRp(ongkirNum)}</span></div>
              <div className="flex justify-between text-xl font-black text-gray-900 pt-3"><span>GRAND TOTAL:</span><span>{formatRp(grandTotal)}</span></div>
              <div className="flex justify-between text-sm font-semibold text-green-600 mt-1"><span>Sudah Dibayar (DP):</span><span>- {formatRp(dpNum)}</span></div>
              <div className={`mt-4 p-4 rounded-xl flex justify-between items-center border ${sisaBayar <= 0 ? 'bg-green-100 border-green-200 text-green-800' : 'bg-red-100 border-red-200 text-red-800'}`}><span className="text-sm font-bold">{sisaBayar <= 0 ? 'LUNAS / KEMBALI:' : 'PIUTANG:'}</span><span className="text-2xl font-black">{formatRp(Math.abs(sisaBayar))}</span></div>
              
              {items.length > 0 && (
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-3 rounded-xl border shadow flex justify-between items-center mt-3"><span className="text-xs uppercase font-bold text-gray-300 flex items-center gap-1"><TrendingUp size={16} className="text-green-400"/> Estimasi Profit Nota:</span><span className="font-black text-base text-green-400">{formatRp(estimasiProfitBersih)}</span></div>
              )}
            </div>
            <div className="mt-4"><label className="text-xs font-semibold text-gray-600 block mb-1">Catatan Order</label><textarea className="w-full border-2 p-2.5 rounded-lg text-sm outline-none h-16" value={keterangan} onChange={e=>setKeterangan(e.target.value)} placeholder="Tulis keterangan..."></textarea></div>
            <button type="button" onClick={handleSaveOrder} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-base mt-4 shadow-md transition-transform active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50"><Save size={20}/> {isProcessing ? 'MENYIMPAN...' : 'SIMPAN ORDER TRANSAKSI'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OrderCart;