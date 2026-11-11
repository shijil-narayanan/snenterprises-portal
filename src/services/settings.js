import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { getCompany, mergeCompany, setCompany } from '../config/companySettings';
import { currentActor } from './actor';

const LOCAL_KEY = 'sn.settings.company';
const str = (v) => (v ?? '').toString().trim();

/** Only the fields we keep, trimmed. */
function toRecord(data) {
  const a = data.address || {};
  const b = data.bankDetails || {};
  return {
    name: str(data.name),
    gst: str(data.gst).toUpperCase(),
    iec: str(data.iec),
    address: {
      addressline1: str(a.addressline1), addressline2: str(a.addressline2), city: str(a.city),
      state: str(a.state), pincode: str(a.pincode), country: str(a.country),
    },
    mobile: str(data.mobile),
    phone: str(data.phone),
    email: str(data.email),
    bankDetails: {
      bankName: str(b.bankName), accountNumber: str(b.accountNumber), ifsc: str(b.ifsc).toUpperCase(),
      swiftCode: str(b.swiftCode).toUpperCase(), branch: str(b.branch),
    },
    lut: str(data.lut),
    // Email: the "send from" address must be verified in Brevo
    senderEmail: str(data.senderEmail).toLowerCase(),
    replyTo: str(data.replyTo).toLowerCase(),
  };
}

/** Loads the saved company settings into the app. Returns { company, saved } where saved is the raw record or null. */
export async function loadCompanySettings() {
  let saved = null;
  if (!isFirebaseConfigured) {
    try { saved = JSON.parse(localStorage.getItem(LOCAL_KEY)); } catch { saved = null; }
  } else {
    const snap = await getDoc(doc(db, 'settings', 'company'));
    saved = snap.exists() ? snap.data() : null;
  }
  setCompany(saved || {});
  return { company: getCompany(), saved };
}

export async function saveCompanySettings(data) {
  const record = { ...toRecord(data), updatedAt: new Date().toISOString(), updatedBy: currentActor() };
  if (!isFirebaseConfigured) localStorage.setItem(LOCAL_KEY, JSON.stringify(record));
  else await setDoc(doc(db, 'settings', 'company'), record);
  setCompany(record);
  loadOnce = Promise.resolve({ company: getCompany(), saved: record });
  return mergeCompany(record);
}

// Loads the settings once per session; forms and PDFs await this so they never use stale defaults
let loadOnce = null;
export function ensureCompanySettings() {
  if (!loadOnce) {
    loadOnce = loadCompanySettings().catch((e) => {
      loadOnce = null; // try again next time
      throw e;
    });
  }
  return loadOnce.catch(() => {});
}
