import { auth, isFirebaseConfigured } from '../firebase';
import { currentActor } from './actor';

const API = (import.meta.env.VITE_EMAIL_API_URL || '').replace(/\/+$/, '');

/** True when the email Worker address is configured (and we're not in demo mode). */
export const isEmailConfigured = Boolean(API) && isFirebaseConfigured;

/**
 * Sends a PDF through the email Worker (which sends via Brevo).
 * Returns the history entry to store on the document.
 */
export async function sendPdfEmail({ to, cc, subject, message, fileName, pdfBase64, sender, replyTo }) {
  if (!isEmailConfigured) throw new Error('Email sending is not set up yet.');
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Please sign in again to send email.');
  let res;
  try {
    res = await fetch(`${API}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, cc, subject, message, fileName, pdfBase64, sender, replyTo }),
    });
  } catch {
    throw new Error('Could not reach the email service. Check your internet connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Email failed (${res.status}).`);
  return {
    to: data.to || to,
    cc: data.cc || cc || [],
    subject,
    fileName,
    messageId: data.messageId || '',
    sentAt: new Date().toISOString(),
    sentBy: currentActor(),
  };
}
