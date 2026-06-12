import { pool } from '../../db';

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

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const { rows } = await pool.query(
      'SELECT * FROM auth_users WHERE id = $1',
      [id]
    );
    return rows[0] ?? undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const { rows } = await pool.query(
      `INSERT INTO auth_users (id, email, first_name, last_name, profile_image_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         email             = EXCLUDED.email,
         first_name        = EXCLUDED.first_name,
         last_name         = EXCLUDED.last_name,
         profile_image_url = EXCLUDED.profile_image_url,
         updated_at        = NOW()
       RETURNING *`,
      [userData.id, userData.email ?? null, userData.firstName ?? null, userData.lastName ?? null, userData.profileImageUrl ?? null]
    );
    return rows[0];
  }
}

export const authStorage = new AuthStorage();
