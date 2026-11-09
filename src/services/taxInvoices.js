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
import { computeTotals, lineAmount } from '../utils/invoice';

const COLLECTION = 'taxInvoices';
const LOCAL_KEY = 'sn.taxInvoices';

// Normalise form data into what we store: numbers as numbers, amounts and totals pre-computed
function toRecord(data) {
  const items = (data.items || []).map((it) => ({
    description: (it.description || '').trim(),
    qty: Number(it.qty) || 0,
    rate: Number(it.rate) || 0,
    amount: lineAmount(it),
  }));
  return {
    invoiceDate: data.invoiceDate || '',
    invoiceNumber: (data.invoiceNumber || '').trim(),
    poDate: data.poDate || '',
    poNumber: (data.poNumber || '').trim(),
    poCompany: (data.poCompany || '').trim(),
    currency: data.currency || 'INR',
    paymentTerms: (data.paymentTerms || '').trim(),
    taxType: data.taxType || 'CGST_SGST',
    items,
    totals: computeTotals(items, data.taxType),
  };
}

const byNewest = (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '');

// ---------- localStorage fallback (used until Firebase is configured) ----------
const local = {
  read() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
    } catch {
      return [];
    }
  },
  write(list) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  },
};

// ---------- Public API ----------
export async function listTaxInvoices() {
  if (!isFirebaseConfigured) return local.read().sort(byNewest);
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getTaxInvoice(id) {
  if (!isFirebaseConfigured) return local.read().find((inv) => inv.id === id) || null;
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createTaxInvoice(data) {
  const now = new Date().toISOString();
  const record = { ...toRecord(data), createdAt: now, updatedAt: now };
  if (!isFirebaseConfigured) {
    const created = { id: crypto.randomUUID(), ...record };
    local.write([...local.read(), created]);
    return created.id;
  }
  const ref = await addDoc(collection(db, COLLECTION), record);
  return ref.id;
}

export async function updateTaxInvoice(id, data) {
  const record = { ...toRecord(data), updatedAt: new Date().toISOString() };
  if (!isFirebaseConfigured) {
    local.write(local.read().map((inv) => (inv.id === id ? { ...inv, ...record } : inv)));
    return;
  }
  await updateDoc(doc(db, COLLECTION, id), record);
}

export async function deleteTaxInvoice(id) {
  if (!isFirebaseConfigured) {
    local.write(local.read().filter((inv) => inv.id !== id));
    return;
  }
  await deleteDoc(doc(db, COLLECTION, id));
}
