import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';

/**
 * Generic CRUD for one Firestore collection.
 * Falls back to localStorage when Firebase is not configured (demo mode).
 *
 * @param {string} name        Firestore collection name
 * @param {object} options
 * @param {Function} options.toRecord  normalises form data before saving
 * @param {string} options.orderField  field to sort by
 * @param {'asc'|'desc'} options.orderDir
 */
export function createCollectionService(name, { toRecord = (d) => d, orderField = 'createdAt', orderDir = 'desc' } = {}) {
  const localKey = `sn.${name}`;

  const local = {
    read() {
      try {
        return JSON.parse(localStorage.getItem(localKey)) || [];
      } catch {
        return [];
      }
    },
    write(list) {
      localStorage.setItem(localKey, JSON.stringify(list));
    },
  };

  const compare = (a, b) => {
    const r = String(a[orderField] ?? '').localeCompare(String(b[orderField] ?? ''), undefined, { sensitivity: 'base' });
    return orderDir === 'desc' ? -r : r;
  };

  const stamp = (data) => {
    const now = new Date().toISOString();
    return { ...toRecord(data), createdAt: now, updatedAt: now };
  };

  return {
    async list() {
      if (!isFirebaseConfigured) return local.read().sort(compare);
      const snap = await getDocs(query(collection(db, name), orderBy(orderField, orderDir)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async get(id) {
      if (!isFirebaseConfigured) return local.read().find((r) => r.id === id) || null;
      const snap = await getDoc(doc(db, name, id));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    },

    async create(data) {
      const record = stamp(data);
      if (!isFirebaseConfigured) {
        const created = { id: crypto.randomUUID(), ...record };
        local.write([...local.read(), created]);
        return created.id;
      }
      return (await addDoc(collection(db, name), record)).id;
    },

    async update(id, data) {
      const record = { ...toRecord(data), updatedAt: new Date().toISOString() };
      if (!isFirebaseConfigured) {
        local.write(local.read().map((r) => (r.id === id ? { ...r, ...record } : r)));
        return;
      }
      await updateDoc(doc(db, name, id), record);
    },

    async remove(id) {
      if (!isFirebaseConfigured) {
        local.write(local.read().filter((r) => r.id !== id));
        return;
      }
      await deleteDoc(doc(db, name, id));
    },
  };
}
