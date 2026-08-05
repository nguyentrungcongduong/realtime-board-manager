import { db } from '../config/firebase';
import { Task } from '../models';
import { loadStore, saveStore } from '../utils/fileStore';

const FILE_NAME = 'tasks.json';

const initialTasks = loadStore<Record<string, Task>>(FILE_NAME, {});
const memoryTasks = new Map<string, Task>(Object.entries(initialTasks));

function persistTasks() {
  const obj: Record<string, Task> = {};
  memoryTasks.forEach((val, key) => { obj[key] = val; });
  saveStore(FILE_NAME, obj);
}

const getRef = (boardId: string, cardId: string) =>
  db.collection('boards').doc(boardId).collection('cards').doc(cardId).collection('tasks');

export const taskRepository = {
  async create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const task: Task = {
      ...data,
      id,
      createdAt: now as any,
      updatedAt: now as any,
    };
    memoryTasks.set(id, task);
    persistTasks();
    try {
      await getRef(task.boardId, task.cardId).doc(id).set(task);
    } catch {
      // Dev fallback
    }
    return task;
  },

  async findById(boardId: string, cardId: string, taskId: string): Promise<Task | null> {
    try {
      const doc = await getRef(boardId, cardId).doc(taskId).get();
      if (doc.exists) return doc.data() as Task;
    } catch {
      // Dev fallback
    }
    return memoryTasks.get(taskId) || null;
  },

  async findByCard(boardId: string, cardId: string): Promise<Task[]> {
    try {
      const snap = await getRef(boardId, cardId).orderBy('position', 'asc').get();
      if (!snap.empty) {
        return snap.docs.map((doc) => doc.data() as Task);
      }
    } catch {
      // Dev fallback
    }

    const result: Task[] = [];
    for (const t of memoryTasks.values()) {
      if (t.boardId === boardId && t.cardId === cardId) result.push(t);
    }
    return result;
  },

  async findByCardId(boardId: string, cardId: string): Promise<Task[]> {
    return this.findByCard(boardId, cardId);
  },

  async findByBoard(boardId: string): Promise<Task[]> {
    const result: Task[] = [];
    for (const t of memoryTasks.values()) {
      if (t.boardId === boardId) result.push(t);
    }
    return result;
  },

  async update(boardId: string, cardId: string, taskId: string, data: Partial<Task>): Promise<void> {
    const existing = memoryTasks.get(taskId);
    if (existing) {
      memoryTasks.set(taskId, { ...existing, ...data, updatedAt: new Date().toISOString() as any });
      persistTasks();
    }
    try {
      await getRef(boardId, cardId).doc(taskId).update(data);
    } catch {
      // Dev fallback
    }
  },

  async delete(boardId: string, cardId: string, taskId: string): Promise<void> {
    memoryTasks.delete(taskId);
    persistTasks();
    try {
      await getRef(boardId, cardId).doc(taskId).delete();
    } catch {
      // Dev fallback
    }
  },
};
