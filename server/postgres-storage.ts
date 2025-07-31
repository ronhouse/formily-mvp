import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, orders } from '@shared/schema';
import { type User, type InsertUser, type Order, type InsertOrder } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { type IStorage } from './storage';

export class PostgresStorage implements IStorage {
  private db;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    const sql = postgres(connectionString);
    this.db = drizzle(sql, { schema: { users, orders } });
    console.log('PostgreSQL storage initialized');
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    try {
      const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByAnonymousId(anonymousId: string): Promise<User | undefined> {
    try {
      const result = await this.db.select().from(users).where(eq(users.anonymousId, anonymousId)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting user by anonymous ID:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const result = await this.db.insert(users).values(insertUser).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Orders
  async getOrder(id: string): Promise<Order | undefined> {
    try {
      const result = await this.db.select().from(orders).where(eq(orders.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting order:', error);
      return undefined;
    }
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    try {
      const result = await this.db.select().from(orders).where(eq(orders.userId, userId));
      return result;
    } catch (error) {
      console.error('Error getting orders by user ID:', error);
      return [];
    }
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    try {
      const result = await this.db.insert(orders).values({
        ...insertOrder,
        status: 'pending'
      }).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    try {
      const result = await this.db
        .update(orders)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error(`Order with id ${id} not found`);
      }
      
      return result[0];
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  }
}