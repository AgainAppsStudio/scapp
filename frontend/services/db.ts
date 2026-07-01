import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get, set, push, update, remove } from 'firebase/database';
import { FIREBASE_CONFIG } from '../constants';
import { Customer, Sale, Payment, Device, Expense, ActivityLog } from '../types';

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(app);
export const database = getDatabase(app);

let currentUserId: string | null = null;

export const setDbUser = (uid: string | null) => {
  currentUserId = uid;
};

const getPath = (collection: string) => `users/${currentUserId}/${collection}`;

const createCrud = <T extends { id: string; createdAt: number }>(collection: string) => ({
  getAll: async (): Promise<T[]> => {
    if (!currentUserId) return [];
    const snapshot = await get(ref(database, getPath(collection)));
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data)
        .map(key => ({ ...data[key], id: key }))
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    return [];
  },
  add: async (item: Omit<T, 'id' | 'createdAt'>): Promise<T> => {
    if (!currentUserId) throw new Error("Not authenticated");
    const listRef = ref(database, getPath(collection));
    const newItemRef = push(listRef);
    const newItem = { ...item, createdAt: Date.now() };
    await set(newItemRef, newItem);
    return { ...newItem, id: newItemRef.key } as unknown as T;
  },
  update: async (id: string, data: Partial<T>): Promise<void> => {
    if (!currentUserId) throw new Error("Not authenticated");
    const itemRef = ref(database, `${getPath(collection)}/${id}`);
    await update(itemRef, data);
  },
  delete: async (id: string): Promise<void> => {
    if (!currentUserId) throw new Error("Not authenticated");
    const itemRef = ref(database, `${getPath(collection)}/${id}`);
    await remove(itemRef);
  }
});

export const db = {
  customers: createCrud<Customer>('customers'),
  sales: createCrud<Sale>('sales'),
  payments: createCrud<Payment>('payments'),
  devices: createCrud<Device>('devices'),
  expenses: createCrud<Expense>('expenses'),
  logs: createCrud<ActivityLog>('logs'),
  
  settings: {
    get: async () => {
      if (!currentUserId) return { shopName: 'My Mobile Shop', address: '', phone: '', autoSms: false };
      const snapshot = await get(ref(database, getPath('settings')));
      return snapshot.exists() ? snapshot.val() : { shopName: 'My Mobile Shop', address: '', phone: '', autoSms: false };
    },
    save: async (settings: any) => {
      if (!currentUserId) return;
      await set(ref(database, getPath('settings')), settings);
    }
  }
};
