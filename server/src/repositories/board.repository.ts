import { db } from '../config/firebase';
import { Board } from '../models';
import admin from 'firebase-admin';

const COLLECTION = 'boards';

export const boardRepository = {
  async findById(id: string): Promise<Board | null> {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Board;
  },

  async findByMember(userId: string): Promise<Board[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('members', 'array-contains', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Board));
  },

  async create(data: Omit<Board, 'id' | 'createdAt'>): Promise<Board> {
    const ref = db.collection(COLLECTION).doc();
    const board: Board = {
      id: ref.id,
      ...data,
      createdAt: admin.firestore.Timestamp.now(),
    };
    await ref.set(board);
    return board;
  },

  async update(id: string, data: Partial<Board>): Promise<Board | null> {
    await db.collection(COLLECTION).doc(id).update(data);
    return this.findById(id);
  },

  async delete(id: string): Promise<void> {
    await db.collection(COLLECTION).doc(id).delete();
  },
};
