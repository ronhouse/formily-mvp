import { type User, type InsertUser, type Order, type InsertOrder } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByAnonymousId(anonymousId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Orders
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByUserId(userId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private orders: Map<string, Order>;

  constructor() {
    this.users = new Map();
    this.orders = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByAnonymousId(anonymousId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.anonymousId === anonymousId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      email: insertUser.email || null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.userId === userId,
    );
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      ...insertOrder,
      id,
      status: "pending",
      engravingText: insertOrder.engravingText || null,
      fontStyle: insertOrder.fontStyle || null,
      color: insertOrder.color || null,
      quality: insertOrder.quality || null,
      stripePaymentIntentId: insertOrder.stripePaymentIntentId || null,
      stlFileUrl: insertOrder.stlFileUrl || null,
      specifications: insertOrder.specifications || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    const existingOrder = this.orders.get(id);
    if (!existingOrder) {
      throw new Error(`Order with id ${id} not found`);
    }
    
    const updatedOrder: Order = {
      ...existingOrder,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }
}

import { PostgresStorage } from './postgres-storage';

// Use PostgreSQL storage if DATABASE_URL is available, fallback to in-memory storage
const usePostgres = !!process.env.DATABASE_URL;

export const storage = usePostgres ? new PostgresStorage() : new MemStorage();
