import { db } from '../config/firebase';
import { Task } from '../models';
import admin from 'firebase-admin';

const COLLECTION = 'tasks';

export const taskRepository = {
  async findById(id: string): Promise<Task | null> {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Task;
  },

  async findByCard(cardId: string): Promise<Task[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cardId', '==', cardId)
      .orderBy('createdAt', 'asc')
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Task));
  },

  async findByBoard(boardId: string): Promise<Task[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('boardId', '==', boardId)
      .orderBy('createdAt', 'asc')
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Task));
  },

  async create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const ref = db.collection(COLLECTION).doc();
    const now = admin.firestore.Timestamp.now();
    const task: Task = {
      id: ref.id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(task);
    return task;
  },

  async update(id: string, data: Partial<Task>): Promise<Task | null> {
    await db.collection(COLLECTION).doc(id).update({
      ...data,
      updatedAt: admin.firestore.Timestamp.now(),
    });
    return this.findById(id);
  },

  async delete(id: string): Promise<void> {
    await db.collection(COLLECTION).doc(id).delete();
  },

  async deleteByCard(cardId: string): Promise<void> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cardId', '==', cardId)
      .get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  },
};
