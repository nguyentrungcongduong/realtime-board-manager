import { db } from '../config/firebase';
import { Invitation } from '../models';

const COLLECTION = 'invitations';
const memoryInvitations = new Map<string, Invitation>();

export const invitationRepository = {
  async create(data: Omit<Invitation, 'id' | 'createdAt'>): Promise<Invitation> {
    const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const invitation: Invitation = {
      ...data,
      id,
      createdAt: now as any,
    };
    memoryInvitations.set(id, invitation);
    try {
      await db.collection(COLLECTION).doc(id).set(invitation);
    } catch {
      // Dev fallback
    }
    return invitation;
  },

  async findById(id: string): Promise<Invitation | null> {
    try {
      const doc = await db.collection(COLLECTION).doc(id).get();
      if (doc.exists) return doc.data() as Invitation;
    } catch {
      // Dev fallback
    }
    return memoryInvitations.get(id) || null;
  },

  async findExisting(boardId: string, email: string): Promise<Invitation | null> {
    try {
      const snap = await db
        .collection(COLLECTION)
        .where('boardId', '==', boardId)
        .where('memberEmail', '==', email)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      if (!snap.empty) {
        return snap.docs[0].data() as Invitation;
      }
    } catch {
      // Dev fallback
    }

    for (const inv of memoryInvitations.values()) {
      if (inv.boardId === boardId && inv.memberEmail === email && inv.status === 'pending') {
        return inv;
      }
    }
    return null;
  },

  async findByMember(email: string): Promise<Invitation[]> {
    try {
      const snap = await db
        .collection(COLLECTION)
        .where('memberEmail', '==', email)
        .where('status', '==', 'pending')
        .get();

      if (!snap.empty) {
        return snap.docs.map((doc) => doc.data() as Invitation);
      }
    } catch {
      // Dev fallback
    }

    const result: Invitation[] = [];
    for (const inv of memoryInvitations.values()) {
      if (inv.memberEmail === email && inv.status === 'pending') {
        result.push(inv);
      }
    }
    return result;
  },

  async findPendingByEmail(email: string): Promise<Invitation[]> {
    return this.findByMember(email);
  },

  async updateStatus(id: string, status: 'accepted' | 'declined'): Promise<void> {
    const existing = memoryInvitations.get(id);
    if (existing) {
      memoryInvitations.set(id, { ...existing, status });
    }
    try {
      await db.collection(COLLECTION).doc(id).update({ status });
    } catch {
      // Dev fallback
    }
  },
};
