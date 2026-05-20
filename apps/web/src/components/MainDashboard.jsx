import { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, TrendingUp, Users, Truck, Target, Calendar, ArrowRight, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import LoadingOverlay from './LoadingOverlay';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MainDashboard = ({ setActiveTab }) => {
  const [orders, setOrders] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [finance, setFinance] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [resO, resP, resF] = await Promise.all([ 
          axios.get(`${baseURL}/api/orders`), 
          axios.get(`${baseURL}/api/purchases`), 
          axios.get(`${baseURL}/api/finance`) 
        ]);
        setOrders(resO.data); 
        setPurchases(resP.data); 
        setFinance(resF.data);
      } catch (e) { 
        console.error("Gagal memuat data dashboard", e); 
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

  const isMatch = (dateStr) => {
    if (!dateStr || !startDate || !endDate) return true;
    const d = new Date(dateStr).setHours(0,0,0,0);
    const start = new Date(startDate).setHours(0,0,0,0);
    const end = new Date(endDate).setHours(23,59,59,999);
    return d >= start && d <= end;
  };

  // AMAN: Filter rentang tanggal untuk seluruh data dasar
  const filteredOrders = orders.filter(o => isMatch(o.tanggal));
  const filteredPurchases = purchases.filter(p => isMatch(p.tanggal));
  const filteredFinance = finance.filter(f => isMatch(f.tanggal));

  let piutang = 0;
  let profitKasar = 0; // Menghitung profit sinkron dengan ProfitDashboard

  // 1. FILTER VALIDASI PROFIT: Hanya hitung yang SELESAI atau TERKIRIM
  const profitValidOrders = filteredOrders.filter(o => o.status === 'SELESAI' || o.status === 'TERKIRIM');

  profitValidOrders.forEach(o => {
    let orderOmsetBarang = 0;
    let orderModalBarang = 0;
    let hasValidItem = false;

    o.items.forEach(i => {
      const hppValid = parseFloat(i.hppSatuan || 0);
      const hargaJualValid = parseFloat(i.hargaSatuan || i.hargaJual || 0);
      const qtyValid = parseFloat(i.qty || 0);

      // SINKRONISASI TOTAL MODAL: Lewati jika HPP Rp 0
      if (hppValid > 0) {
        orderOmsetBarang += (hargaJualValid * qtyValid);
        orderModalBarang += (hppValid * qtyValid);
        hasValidItem = true;
      }
    });

    if (hasValidItem) {
      const ongkirIn = parseFloat(o.ongkosKirim) || 0;
      const ongkirOut = parseFloat(o.ongkosKirimModal) || 0;
      // Rumus Laba Bersih: (Omset Jual - Modal HPP) + (Ongkir Masuk - Ongkir Keluar)
      profitKasar += (orderOmsetBarang - orderModalBarang) + (ongkirIn - ongkirOut);
    }
  });

  // 2. HITUNG PIUTANG BEREDAR DARI ORDER STATUS 'TERKIRIM' YANG BELUM LUNAS
  filteredOrders.forEach(o => {
    if (o.status === 'TERKIRIM') {
      const tagihanTotal = o.totalHarga + (o.ongkosKirim || 0);
      piutang += (tagihanTotal - o.dp);
    }
  });

  let totalHutangAktif = 0;
  const supplierDebts = {};
  filteredPurchases.forEach(p => {
    const sisa = p.items.reduce((sum, i) => sum + i.subtotal, 0) - p.totalBayar;
    if (sisa > 0) {
      totalHutangAktif += sisa;
      const suppName = `${p.supplier?.nama} (#${p.supplierId})`;
      if (!supplierDebts[suppName]) supplierDebts[suppName] = 0;
      supplierDebts[suppName] += sisa;
    }
  });

  const debtList = Object.keys(supplierDebts).map(k => ({ nama: k, sisa: supplierDebts[k] })).sort((a,b) => b.sisa - a.sisa);

  // LOGIKA UTAMA FINANSIAL KAS BUKU
  const totalMasuk = filteredFinance.filter(f => f.tipe === 'PEMASUKAN').reduce((sum, f) => sum + f.nominal, 0);
  const totalKeluar = filteredFinance.filter(f => f.tipe === 'PENGELUARAN').reduce((sum, f) => sum + f.nominal, 0);
  const saldoKas = totalMasuk - totalKeluar;
  const omset = totalMasuk; 

  const chartDataMap = {};
  filteredFinance.forEach(f => { 
    if (f.tipe === 'PEMASUKAN') {
      const dLabel = new Date(f.tanggal).toLocaleDateString('id-ID', {day: 'numeric', month:'short'}); 
      if(!chartDataMap[dLabel]) chartDataMap[dLabel] = { name: dLabel, Omset: 0, sortDate: new Date(f.tanggal) }; 
      chartDataMap[dLabel].Omset += f.nominal; 
    }
  });

  const chartData = Object.values(chartDataMap).sort((a,b) => a.sortDate - b.sortDate);

  const pendingOrders = orders
    .filter(o => (o.status === 'MENUNGGU' || o.status === 'DP') && isMatch(o.tanggal))
    .sort((a,b) => new Date(a.tanggal) - new Date(b.tanggal));

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 md:p-5 space-y-5 bg-gray-50/30 text-xs md:text-sm">
      <LoadingOverlay isLoading={isLoading} />

      {/* FILTER CALENDAR BARIS */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Dashboard Analisis</h1>
          <p className="text-xs font-bold text-gray-500 mt-1">Sistem Pemantauan Performa Bisnis Terintegrasi.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100 w-full md:w-auto">
          <div className="flex items-center gap-2 text-blue-700 font-black text-xs px-2"><Calendar size={16}/> Filter Laporan:</div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input type="date" className="border border-blue-200 bg-white p-2 rounded-lg text-xs font-bold text-gray-700 outline-none w-full sm:w-auto cursor-pointer" value={startDate} onChange={e=>setStartDate(e.target.value)} title="Tanggal Mulai"/>
            <span className="text-gray-400 font-black">-</span>
            <input type="date" className="border border-blue-200 bg-white p-2 rounded-lg text-xs font-bold text-gray-700 outline-none w-full sm:w-auto cursor-pointer" value={endDate} onChange={e=>setEndDate(e.target.value)} title="Tanggal Akhir"/>
          </div>
        </div>
      </div>

      {/* INDIKATOR METRICS UTAMA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <div onClick={() => setActiveTab('keuangan')} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group relative overflow-hidden">
          <div className="text-[10px] md:text-xs text-gray-500 font-black uppercase tracking-wider mb-2 flex justify-between items-center relative z-10">Kas Aktif (Global) <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><Wallet size={14}/></div></div>
          <h3 className={`text-sm md:text-xl font-black truncate relative z-10 ${saldoKas < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatRp(saldoKas)}</h3>
        </div>
        
        <div onClick={() => setActiveTab('keuangan')} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group relative overflow-hidden">
          <div className="text-[10px] md:text-xs text-gray-500 font-black uppercase tracking-wider mb-2 flex justify-between items-center relative z-10">Omset Masuk (Kas) <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Target size={14}/></div></div>
          <h3 className="text-sm md:text-xl font-black text-blue-700 truncate relative z-10">{formatRp(omset)}</h3>
        </div>
        
        <div onClick={() => setActiveTab('profit')} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-green-300 hover:shadow-md transition-all group relative overflow-hidden">
          <div className="text-[10px] md:text-xs text-gray-500 font-black uppercase tracking-wider mb-2 flex justify-between items-center relative z-10">Profit Terkirim <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={14}/></div></div>
          <h3 className="text-sm md:text-xl font-black text-green-600 truncate relative z-10">{formatRp(profitKasar)}</h3>
        </div>
        
        <div onClick={() => setActiveTab('piutang')} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-orange-300 hover:shadow-md transition-all group relative overflow-hidden">
          <div className="text-[10px] md:text-xs text-gray-500 font-black uppercase tracking-wider mb-2 flex justify-between items-center relative z-10">Piutang Customer <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg"><Users size={14}/></div></div>
          <h3 className="text-sm md:text-xl font-black text-orange-600 truncate relative z-10">{formatRp(piutang)}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 flex-1 min-h-[400px]">
        {/* LIST ANTRIAN JALAN */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-orange-100 bg-orange-50 flex justify-between items-center shrink-0">
            <div>
              <h4 className="font-black text-xs md:text-sm text-gray-800 flex items-center gap-1.5"><Clock size={16} className="text-orange-500"/> Antrean Belum Dikirim</h4>
              <p className="text-[11px] font-bold text-gray-500 mt-0.5"><span className="font-black text-orange-600">{pendingOrders.length}</span> Pesanan menunggu kurir/sopir armada</p>
            </div>
            <button onClick={() => setActiveTab('rekap')} className="text-[10px] md:text-xs font-black text-orange-700 bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200">Buka Menu</button>
          </div>
          
          <div className="overflow-x-auto flex-1 p-0">
            <table className="w-full text-left whitespace-nowrap text-xs md:text-sm">
              <thead className="bg-gray-50 border-b text-[10px] font-black tracking-wider text-gray-400 uppercase">
                <tr>
                  <th className="p-3 pl-5">Tanggal</th>
                  <th className="p-3">ID & Pelanggan</th>
                  <th className="p-3">Rincian Barang</th>
                  <th className="p-3 text-right">Tagihan Total</th>
                  <th className="p-3 text-center pr-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y border-gray-100">
                {pendingOrders.map((o, idx) => (
                  <tr key={idx} className="hover:bg-orange-50/20 transition-colors">
                    <td className="p-3 text-gray-500">{new Date(o.tanggal).toLocaleDateString('id-ID')}</td>
                    <td className="p-3 font-black text-gray-800 uppercase">{o.customer?.nama} <span className="text-gray-400 font-mono text-[9px]">(#{o.customerId})</span></td>
                    <td className="p-3 text-gray-600 font-medium max-w-[150px] truncate">
                      {o.items.length > 0 ? `${o.items[0].product?.nama} ${o.items.length > 1 ? `(+${o.items.length - 1})` : ''}` : '-'}
                    </td>
                    <td className="p-3 text-right font-black text-gray-900">{formatRp(o.totalHarga + (o.ongkosKirim||0))}</td>
                    <td className="p-3 text-center pr-5">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${o.status === 'DP' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {pendingOrders.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-gray-400 font-bold italic">Semua antrean pengiriman bersih. 🚚💨</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* GRAFIK & HUTANG */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex flex-col h-[230px] shrink-0">
            <h4 className="font-black text-xs text-gray-800 mb-3 flex items-center gap-1.5"><TrendingUp size={14} className="text-blue-500"/> Aliran Omset Kas Harian</h4>
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                  <defs><linearGradient id="colorOmset" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#9ca3af', fontWeight: 700}} dy={10} minTickGap={20} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#9ca3af', fontWeight: 700}} tickFormatter={(v) => `${v/1000000}JT`} />
                  <Tooltip formatter={(value) => formatRp(value)} contentStyle={{borderRadius: '12px', fontSize: '11px', fontWeight: 'bold'}} />
                  <Area type="monotone" dataKey="Omset" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOmset)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col overflow-hidden flex-1 min-h-[200px]">
            <div className="p-3.5 border-b border-red-100 bg-red-50/50 flex justify-between items-center cursor-pointer bg-white" onClick={() => setActiveTab('piutang')}>
              <div>
                <p className="text-[10px] font-black text-red-600 uppercase tracking-wider flex items-center gap-1.5"><Truck size={14}/> Total Hutang ke Pabrik</p>
                <h2 className="text-base md:text-lg font-black text-red-700 mt-0.5">{formatRp(totalHutangAktif)}</h2>
              </div>
            </div>
            <div className="p-3 overflow-y-auto flex-1 bg-white">
              <div className="space-y-2">
                {debtList.map((d, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded-xl border border-gray-100 text-xs">
                    <span className="font-bold text-gray-700 uppercase truncate pr-2">{d.nama}</span>
                    <span className="font-black text-red-600">{formatRp(d.sisa)}</span>
                  </div>
                ))}
                {debtList.length === 0 && <p className="text-xs text-gray-400 text-center py-6 font-bold italic">Semua hutang lunas 🎉</p>}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MainDashboard;