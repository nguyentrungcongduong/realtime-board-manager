import { db } from '../config/firebase';
import { Invitation, InvitationStatus } from '../models';
import admin from 'firebase-admin';

const COLLECTION = 'invitations';

export const invitationRepository = {
  async findById(id: string): Promise<Invitation | null> {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Invitation;
  },

  async findByMember(memberId: string): Promise<Invitation[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('memberId', '==', memberId)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Invitation));
  },

  async findByBoard(boardId: string): Promise<Invitation[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('boardId', '==', boardId)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Invitation));
  },

  async findExisting(boardId: string, memberId: string): Promise<Invitation | null> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('boardId', '==', boardId)
      .where('memberId', '==', memberId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Invitation;
  },

  async create(data: Omit<Invitation, 'id' | 'createdAt'>): Promise<Invitation> {
    const ref = db.collection(COLLECTION).doc();
    const invitation: Invitation = {
      id: ref.id,
      ...data,
      createdAt: admin.firestore.Timestamp.now(),
    };
    await ref.set(invitation);
    return invitation;
  },

  async updateStatus(id: string, status: InvitationStatus): Promise<void> {
    await db.collection(COLLECTION).doc(id).update({ status });
  },
};
