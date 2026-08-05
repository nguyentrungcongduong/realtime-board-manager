import { db } from '../config/firebase';
import { Board } from '../models';

const COLLECTION = 'boards';
const memoryBoards = new Map<string, Board>();

export const boardRepository = {
  async create(data: Omit<Board, 'id' | 'createdAt'>): Promise<Board> {
    const id = `board_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const board: Board = {
      ...data,
      id,
      createdAt: now as any,
    };
    memoryBoards.set(id, board);
    try {
      await db.collection(COLLECTION).doc(id).set(board);
    } catch {
      // Dev fallback
    }
    return board;
  },

  async findById(id: string): Promise<Board | null> {
    try {
      const doc = await db.collection(COLLECTION).doc(id).get();
      if (doc.exists) return doc.data() as Board;
    } catch {
      // Dev fallback
    }
    return memoryBoards.get(id) || null;
  },

  async findByMember(userId: string): Promise<Board[]> {
    try {
      const snap = await db
        .collection(COLLECTION)
        .where('members', 'array-contains', userId)
        .get();

      if (!snap.empty) {
        return snap.docs.map((doc) => doc.data() as Board);
      }
    } catch {
      // Dev fallback
    }

    const result: Board[] = [];
    for (const b of memoryBoards.values()) {
      if (b.members.includes(userId)) result.push(b);
    }
    return result;
  },

  async findByUserId(userId: string): Promise<Board[]> {
    return this.findByMember(userId);
  },

  async update(id: string, data: Partial<Board>): Promise<void> {
    const existing = memoryBoards.get(id);
    if (existing) {
      memoryBoards.set(id, { ...existing, ...data });
    }
    try {
      await db.collection(COLLECTION).doc(id).update(data);
    } catch {
      // Dev fallback
    }
  },

  async delete(id: string): Promise<void> {
    memoryBoards.delete(id);
    try {
      await db.collection(COLLECTION).doc(id).delete();
    } catch {
      // Dev fallback
    }
  },
};
