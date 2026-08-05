import { db } from '../config/firebase';
import { User } from '../models';

const COLLECTION = 'users';
const memoryUsers = new Map<string, User>();

export const userRepository = {
  async create(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const user: User = {
      ...data,
      id,
      createdAt: now as any,
    };
    memoryUsers.set(id, user);
    try {
      await db.collection(COLLECTION).doc(id).set(user);
    } catch {
      // Dev fallback
    }
    return user;
  },

  async findById(id: string): Promise<User | null> {
    try {
      const doc = await db.collection(COLLECTION).doc(id).get();
      if (doc.exists) return doc.data() as User;
    } catch {
      // Dev fallback
    }
    return memoryUsers.get(id) || null;
  },

  async findByEmail(email: string): Promise<User | null> {
    try {
      const snap = await db.collection(COLLECTION).where('email', '==', email).limit(1).get();
      if (!snap.empty) return snap.docs[0].data() as User;
    } catch {
      // Dev fallback
    }
    for (const u of memoryUsers.values()) {
      if (u.email === email) return u;
    }
    return null;
  },

  async update(id: string, data: Partial<User>): Promise<void> {
    const existing = memoryUsers.get(id);
    if (existing) {
      memoryUsers.set(id, { ...existing, ...data });
    }
    try {
      await db.collection(COLLECTION).doc(id).update(data);
    } catch {
      // Dev fallback
    }
  },
};
