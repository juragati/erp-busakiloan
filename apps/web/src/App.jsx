import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from './layout/AdminLayout';
import CustomerSelect from './components/CustomerSelect';
import OrderCart from './components/OrderCart';
import OrderList from './components/OrderList';
import CustomerList from './components/CustomerList';
import StockList from './components/StockList';
import SupplierList from './components/SupplierList';
import PurchaseList from './components/PurchaseList';
import PiutangDashboard from './components/PiutangDashboard';
import RiwayatProses from './components/RiwayatProses';
import FinanceDashboard from './components/FinanceDashboard';
import ProfitDashboard from './components/ProfitDashboard';
import MainDashboard from './components/MainDashboard';
import SopirList from './components/SopirList';
import LoginPage from './components/LoginPage';
import DataManagement from './components/DataManagement';
import ResetPassword from './components/ResetPassword';

// Peta route → activeTab untuk highlight sidebar
const PATH_TO_TAB = {
  '/': 'dashboard',
  '/kasir': 'kasir',
  '/rekap': 'rekap',
  '/pelanggan': 'pelanggan',
  '/sopir': 'sopir',
  '/stok': 'stok',
  '/riwayat': 'riwayat',
  '/piutang': 'piutang',
  '/supplier': 'supplier',
  '/pembelian': 'pembelian',
  '/keuangan': 'keuangan',
  '/profit': 'profit',
  '/database': 'database',
};

function AppRoutes({ setToken }) {
  const [activeCustomer, setActiveCustomer] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Derive activeTab dari URL saat ini agar sidebar selalu sinkron
  const activeTab = PATH_TO_TAB[location.pathname] || 'dashboard';

  // setActiveTab sekarang = navigate ke URL yang sesuai
  const setActiveTab = (tab) => {
    const path = Object.keys(PATH_TO_TAB).find(k => PATH_TO_TAB[k] === tab) || '/';
    navigate(path);
  };

  return (
    <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab} setToken={setToken}>
      <Routes>
        <Route path="/" element={<MainDashboard setActiveTab={setActiveTab} />} />

        <Route path="/kasir" element={
          <div className="flex flex-col h-full space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border shrink-0">
              <h3 className="text-sm md:text-base font-bold text-gray-800 border-b pb-2 mb-3">1. Informasi Pelanggan</h3>
              <div className="w-full md:w-1/2 lg:w-1/3">
                <CustomerSelect onSelectCustomer={setActiveCustomer} />
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <OrderCart selectedCustomer={activeCustomer} />
            </div>
          </div>
        } />

        <Route path="/rekap"     element={<OrderList setActiveTab={setActiveTab} />} />
        <Route path="/pelanggan" element={<CustomerList />} />
        <Route path="/sopir"     element={<SopirList />} />
        <Route path="/stok"      element={<StockList />} />
        <Route path="/riwayat"   element={<RiwayatProses />} />
        <Route path="/piutang"   element={<PiutangDashboard />} />
        <Route path="/supplier"  element={<SupplierList />} />
        <Route path="/pembelian" element={<PurchaseList />} />
        <Route path="/keuangan"  element={<FinanceDashboard />} />
        <Route path="/profit"    element={<ProfitDashboard />} />
        <Route path="/database"  element={<DataManagement />} />

        {/* Fallback: redirect semua path tidak dikenal ke dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AdminLayout>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  return (
    <Routes>
      {/* Route reset password bisa diakses tanpa login */}
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Semua route lain: cek login dulu */}
      <Route
        path="/*"
        element={
          token
            ? <AppRoutes setToken={setToken} />
            : <LoginPage setToken={setToken} />
        }
      />
    </Routes>
  );
}

export default App;
