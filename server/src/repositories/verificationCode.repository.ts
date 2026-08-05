import { db } from '../config/firebase';
import { VerificationCode } from '../models';
import admin from 'firebase-admin';
import { OTP_EXPIRY_MINUTES } from '../utils/otp';

const COLLECTION = 'verificationCodes';

export const verificationCodeRepository = {
  async create(email: string, code: string): Promise<VerificationCode> {
    // Invalidate previous codes for this email
    const existing = await db
      .collection(COLLECTION)
      .where('email', '==', email)
      .where('used', '==', false)
      .get();

    const batch = db.batch();
    existing.docs.forEach((doc) => batch.update(doc.ref, { used: true }));

    const ref = db.collection(COLLECTION).doc();
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
    );

    const record: VerificationCode = {
      id: ref.id,
      email,
      code,
      expiresAt,
      used: false,
    };

    batch.set(ref, record);
    await batch.commit();
    return record;
  },

  async findValid(email: string, code: string): Promise<VerificationCode | null> {
    const now = admin.firestore.Timestamp.now();
    const snapshot = await db
      .collection(COLLECTION)
      .where('email', '==', email)
      .where('code', '==', code)
      .where('used', '==', false)
      .where('expiresAt', '>', now)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as VerificationCode;
  },

  async markUsed(id: string): Promise<void> {
    await db.collection(COLLECTION).doc(id).update({ used: true });
  },
};
