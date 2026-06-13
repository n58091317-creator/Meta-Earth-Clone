import * as admin from 'firebase-admin';

export interface User {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UpsertUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class FirestoreAuthStorage implements IAuthStorage {
  private get db() {
    return admin.firestore();
  }

  async getUser(id: string): Promise<User | undefined> {
    const doc = await this.db.collection('users').doc(id).get();
    if (!doc.exists) return undefined;
    const data = doc.data()!;
    return {
      id,
      email:           data.email          ?? null,
      firstName:       data.firstName      ?? null,
      lastName:        data.lastName       ?? null,
      profileImageUrl: data.profileImageUrl ?? null,
      createdAt:       data.createdAt      ?? null,
      updatedAt:       data.updatedAt      ?? null,
    };
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const now = new Date().toISOString();
    const ref = this.db.collection('users').doc(userData.id);
    const existing = await ref.get();

    const updates: Record<string, any> = {
      email:           userData.email           ?? null,
      firstName:       userData.firstName       ?? null,
      lastName:        userData.lastName        ?? null,
      profileImageUrl: userData.profileImageUrl ?? null,
      updatedAt:       now,
    };

    if (!existing.exists) {
      updates.createdAt = now;
      await ref.set(updates);
    } else {
      await ref.update(updates);
    }

    const createdAt = existing.exists
      ? (existing.data()?.createdAt ?? now)
      : now;

    return { id: userData.id, ...updates, createdAt };
  }
}

export const authStorage = new FirestoreAuthStorage();
