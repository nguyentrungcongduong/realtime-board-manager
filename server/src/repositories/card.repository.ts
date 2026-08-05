import { db } from '../config/firebase';
import { Card } from '../models';

const memoryCards = new Map<string, Card>();

const getRef = (boardId: string) =>
  db.collection('boards').doc(boardId).collection('cards');

export const cardRepository = {
  async create(data: Omit<Card, 'id' | 'createdAt'>): Promise<Card> {
    const id = `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const card: Card = {
      ...data,
      id,
      createdAt: now as any,
    };
    memoryCards.set(id, card);
    try {
      await getRef(card.boardId).doc(id).set(card);
    } catch {
      // Dev fallback
    }
    return card;
  },

  async findById(boardId: string, cardId: string): Promise<Card | null> {
    try {
      const doc = await getRef(boardId).doc(cardId).get();
      if (doc.exists) return doc.data() as Card;
    } catch {
      // Dev fallback
    }
    return memoryCards.get(cardId) || null;
  },

  async findByBoard(boardId: string): Promise<Card[]> {
    try {
      const snap = await getRef(boardId).orderBy('position', 'asc').get();
      if (!snap.empty) {
        return snap.docs.map((doc) => doc.data() as Card);
      }
    } catch {
      // Dev fallback
    }

    const result: Card[] = [];
    for (const c of memoryCards.values()) {
      if (c.boardId === boardId) result.push(c);
    }
    return result;
  },

  async findByBoardId(boardId: string): Promise<Card[]> {
    return this.findByBoard(boardId);
  },

  async update(boardId: string, cardId: string, data: Partial<Card>): Promise<void> {
    const existing = memoryCards.get(cardId);
    if (existing) {
      memoryCards.set(cardId, { ...existing, ...data });
    }
    try {
      await getRef(boardId).doc(cardId).update(data);
    } catch {
      // Dev fallback
    }
  },

  async delete(boardId: string, cardId: string): Promise<void> {
    memoryCards.delete(cardId);
    try {
      await getRef(boardId).doc(cardId).delete();
    } catch {
      // Dev fallback
    }
  },
};
