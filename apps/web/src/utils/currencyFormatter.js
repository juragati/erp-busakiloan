// Mengubah angka murni (1000000) menjadi string berformat (1.000.000)
export const formatInputRupiah = (angka) => {
  if (!angka) return '';
  const number_string = angka.toString().replace(/[^,\d]/g, '');
  const split = number_string.split(',');
  const sisa = split[0].length % 3;
  let rupiah = split[0].substr(0, sisa);
  const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

  if (ribuan) {
    const separator = sisa ? '.' : '';
    rupiah += separator + ribuan.join('.');
  }

  rupiah = split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
  return rupiah;
};

// Mengubah string berformat (1.000.000) kembali ke angka murni (1000000) untuk disimpan ke Database
export const parseInputRupiah = (formattedValue) => {
  if (!formattedValue) return 0;
  return parseInt(formattedValue.toString().replace(/[^0-9]/g, ''), 10) || 0;
};