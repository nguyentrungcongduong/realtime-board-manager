import { db } from '../config/firebase';
import { Card } from '../models';
import admin from 'firebase-admin';

const COLLECTION = 'cards';

export const cardRepository = {
  async findById(id: string): Promise<Card | null> {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Card;
  },

  async findByBoard(boardId: string): Promise<Card[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('boardId', '==', boardId)
      .orderBy('createdAt', 'asc')
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Card));
  },

  async create(data: Omit<Card, 'id' | 'createdAt'>): Promise<Card> {
    const ref = db.collection(COLLECTION).doc();
    const card: Card = {
      id: ref.id,
      ...data,
      createdAt: admin.firestore.Timestamp.now(),
    };
    await ref.set(card);
    return card;
  },

  async update(id: string, data: Partial<Card>): Promise<Card | null> {
    await db.collection(COLLECTION).doc(id).update(data);
    return this.findById(id);
  },

  async delete(id: string): Promise<void> {
    await db.collection(COLLECTION).doc(id).delete();
  },

  async deleteByBoard(boardId: string): Promise<void> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('boardId', '==', boardId)
      .get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  },
};
