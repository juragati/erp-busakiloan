// Angka murni → string format Rupiah (titik sebagai pemisah ribuan)
// Contoh: 1500000 → "1.500.000"
export const formatRupiahInput = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const num = value.toString().replace(/\D/g, '');
  if (!num) return '';
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// String format Rupiah → angka integer murni
// Contoh: "1.500.000" → 1500000
export const parseRupiahInput = (formatted) => {
  if (!formatted) return 0;
  return parseInt(formatted.toString().replace(/\./g, ''), 10) || 0;
};

// Angka murni → string format Qty (titik = ribuan, koma = desimal)
// Contoh: 1000.5 → "1.000,5"
export const formatQtyInput = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  // Hanya izinkan angka dan koma
  const str = value.toString().replace(/[^0-9,]/g, '');
  const [intPart, decPart] = str.split(',');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart !== undefined ? `${formattedInt},${decPart}` : formattedInt;
};

// String format Qty → angka float murni
// Contoh: "1.000,5" → 1000.5
export const parseQtyInput = (formatted) => {
  if (!formatted) return 0;
  // Hilangkan titik ribuan, ubah koma jadi titik untuk parsing float
  return parseFloat(formatted.toString().replace(/\./g, '').replace(',', '.')) || 0;
};

// Untuk display (bukan input): angka murni → "Rp 1.500.000"
export const formatRp = (n) => {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0 
  }).format(n || 0);
};