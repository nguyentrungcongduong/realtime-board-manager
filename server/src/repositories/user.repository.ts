import { db } from '../config/firebase';
import { User } from '../models';
import admin from 'firebase-admin';

const COLLECTION = 'users';

export const userRepository = {
  async findById(id: string): Promise<User | null> {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as User;
  },

  async findByEmail(email: string): Promise<User | null> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('email', '==', email)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  },

  async create(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const ref = db.collection(COLLECTION).doc();
    const now = admin.firestore.Timestamp.now();
    const user: User = {
      id: ref.id,
      ...data,
      createdAt: now,
    };
    await ref.set(user);
    return user;
  },

  async update(id: string, data: Partial<User>): Promise<void> {
    await db.collection(COLLECTION).doc(id).update(data);
  },
};
