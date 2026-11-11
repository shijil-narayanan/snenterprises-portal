import { auth } from '../firebase';

/** The signed-in user, as saved on records (createdBy / updatedBy). */
export function currentActor() {
  const u = auth?.currentUser;
  return u ? { uid: u.uid, email: u.email || '', name: u.displayName || '' } : null;
}
