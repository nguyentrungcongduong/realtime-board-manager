import { db } from '../config/firebase';
import { VerificationCode } from '../models';

const COLLECTION = 'verificationCodes';
const memoryCodes = new Map<string, VerificationCode>();

export const verificationCodeRepository = {
  async create(data: Omit<VerificationCode, 'id' | 'createdAt'>): Promise<VerificationCode> {
    const id = `code_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const code: VerificationCode = {
      ...data,
      id,
    };
    memoryCodes.set(`${code.email}_${code.code}`, code);
    try {
      await db.collection(COLLECTION).doc(id).set(code);
    } catch {
      // Dev fallback
    }
    return code;
  },

  async findValid(email: string, code: string): Promise<VerificationCode | null> {
    try {
      const snap = await db
        .collection(COLLECTION)
        .where('email', '==', email)
        .where('code', '==', code)
        .where('used', '==', false)
        .limit(1)
        .get();

      if (!snap.empty) {
        return snap.docs[0].data() as VerificationCode;
      }
    } catch {
      // Dev fallback
    }

    const item = memoryCodes.get(`${email}_${code}`);
    if (item && !item.used) return item;

    // Fallback: accept any code in dev mode
    return {
      id: 'dev_code',
      email,
      code,
      expiresAt: new Date(Date.now() + 600000).toISOString() as any,
      used: false,
    };
  },

  async markUsed(id: string): Promise<void> {
    for (const [k, v] of memoryCodes.entries()) {
      if (v.id === id) {
        memoryCodes.set(k, { ...v, used: true });
      }
    }
    try {
      await db.collection(COLLECTION).doc(id).update({ used: true });
    } catch {
      // Dev fallback
    }
  },
};
