import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * useFetch — untuk mengambil data (GET) secara otomatis saat komponen mount.
 *
 * @param {string|string[]} urls  - Satu URL string, atau array URL untuk fetch paralel.
 * @param {any[]}           deps  - Dependency array, re-fetch saat nilai berubah (default []).
 *
 * @returns {{ data, isLoading, error, refetch }}
 *   - data      : hasil fetch. Jika urls adalah string → object/array. Jika array → array of results.
 *   - isLoading : true saat sedang fetch.
 *   - error     : pesan error jika gagal, null jika sukses.
 *   - refetch   : fungsi untuk trigger ulang fetch secara manual.
 *
 * Contoh pemakaian (single URL):
 *   const { data: orders, isLoading } = useFetch('/api/orders');
 *
 * Contoh pemakaian (parallel):
 *   const { data: [orders, finance], isLoading } = useFetch(['/api/orders', '/api/finance']);
 */
export function useFetch(urls, deps = []) {
  const [data, setData] = useState(Array.isArray(urls) ? [] : null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Gunakan counter sebagai trigger refetch agar tidak perlu ubah deps dari luar
  const [fetchCount, setFetchCount] = useState(0);

  const refetch = useCallback(() => setFetchCount(c => c + 1), []);

  useEffect(() => {
    let cancelled = false; // Cegah setState setelah komponen unmount

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (Array.isArray(urls)) {
          const results = await Promise.all(
            urls.map(url => axios.get(`${baseURL}${url}`))
          );
          if (!cancelled) setData(results.map(r => r.data));
        } else {
          const res = await axios.get(`${baseURL}${urls}`);
          if (!cancelled) setData(res.data);
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.error || e.message || 'Gagal memuat data');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCount, ...deps]);

  return { data, isLoading, error, refetch };
}

/**
 * useSubmit — untuk operasi mutasi data (POST, PUT, DELETE).
 *
 * Tidak auto-run. Dipanggil manual via fungsi `submit(url, data, method)`.
 *
 * @returns {{ submit, isSubmitting }}
 *   - submit(url, payload?, method?)
 *       url     : path API, contoh '/api/orders'
 *       payload : body request (opsional, untuk POST/PUT)
 *       method  : 'post' | 'put' | 'delete' (default: 'post')
 *       Returns : Promise<responseData> — bisa di-await dan di-catch dari komponen
 *   - isSubmitting : true saat request sedang berjalan
 *
 * Contoh pemakaian:
 *   const { submit, isSubmitting } = useSubmit();
 *
 *   const handleSave = async () => {
 *     try {
 *       await submit('/api/customers/upsert', formData);
 *       refetch(); // refresh data setelah simpan
 *     } catch (e) {
 *       alert(e.message);
 *     }
 *   };
 */
export function useSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (url, payload = null, method = 'post') => {
    setIsSubmitting(true);
    try {
      const res = await axios[method](`${baseURL}${url}`, payload);
      return res.data;
    } catch (e) {
      // Lempar error agar komponen bisa handle sendiri (alert, toast, dll)
      throw new Error(e.response?.data?.error || e.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { submit, isSubmitting };
}
