import { useState, useEffect, useCallback } from 'react';
import { customersApi } from '../services/api';

export function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await customersApi.list();
      setCustomers(data.customers);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createCustomer(formData) {
    try {
      const { data } = await customersApi.create(formData);
      setCustomers((prev) => [data, ...prev]);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || 'Failed to create customer' };
    }
  }

  async function deleteCustomer(id) {
    try {
      await customersApi.delete(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || 'Failed to delete' };
    }
  }

  return { customers, loading, error, reload: load, createCustomer, deleteCustomer };
}
