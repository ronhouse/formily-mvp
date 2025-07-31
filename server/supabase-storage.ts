import { createClient } from '@supabase/supabase-js';
import { type User, type InsertUser, type Order, type InsertOrder } from '@shared/schema';
import { type IStorage } from './storage';

// Supabase configuration for server-side use
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export class SupabaseStorage implements IStorage {
  private supabase;

  constructor() {
    if (supabaseUrl && supabaseAnonKey) {
      // Create Supabase client
      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
      console.log('Supabase storage initialized');
    } else {
      console.warn('Supabase credentials not found. Storage operations will fail.');
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    try {
      if (!this.supabase) throw new Error('Supabase not initialized');
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return undefined; // Not found
        throw error;
      }
      
      return data as User;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByAnonymousId(anonymousId: string): Promise<User | undefined> {
    try {
      if (!this.supabase) throw new Error('Supabase not initialized');
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('anonymous_id', anonymousId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return undefined; // Not found
        throw error;
      }
      
      return data as User;
    } catch (error) {
      console.error('Error getting user by anonymous ID:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      if (!this.supabase) throw new Error('Supabase not initialized');
      const { data, error } = await this.supabase
        .from('users')
        .insert({
          anonymous_id: insertUser.anonymousId,
          email: insertUser.email || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Orders
  async getOrder(id: string): Promise<Order | undefined> {
    try {
      if (!this.supabase) throw new Error('Supabase not initialized');
      const { data, error } = await this.supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return undefined; // Not found
        throw error;
      }
      
      return data as Order;
    } catch (error) {
      console.error('Error getting order:', error);
      return undefined;
    }
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    try {
      if (!this.supabase) throw new Error('Supabase not initialized');
      const { data, error } = await this.supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Order[];
    } catch (error) {
      console.error('Error getting orders by user ID:', error);
      return [];
    }
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    try {
      if (!this.supabase) throw new Error('Supabase not initialized');
      const { data, error } = await this.supabase
        .from('orders')
        .insert({
          user_id: insertOrder.userId,
          status: 'pending',
          photo_url: insertOrder.photoUrl,
          style: insertOrder.style,
          engraving_text: insertOrder.engravingText || null,
          font_style: insertOrder.fontStyle || 'arial',
          color: insertOrder.color || 'black',
          quality: insertOrder.quality || 'standard',
          total_amount: insertOrder.totalAmount,
          stripe_payment_intent_id: insertOrder.stripePaymentIntentId || null,
          stl_file_url: insertOrder.stlFileUrl || null,
          specifications: insertOrder.specifications || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    try {
      if (!this.supabase) throw new Error('Supabase not initialized');
      
      // Convert camelCase to snake_case for database
      const dbUpdates: any = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.photoUrl) dbUpdates.photo_url = updates.photoUrl;
      if (updates.style) dbUpdates.style = updates.style;
      if (updates.engravingText !== undefined) dbUpdates.engraving_text = updates.engravingText;
      if (updates.fontStyle) dbUpdates.font_style = updates.fontStyle;
      if (updates.color) dbUpdates.color = updates.color;
      if (updates.quality) dbUpdates.quality = updates.quality;
      if (updates.totalAmount) dbUpdates.total_amount = updates.totalAmount;
      if (updates.stripePaymentIntentId !== undefined) dbUpdates.stripe_payment_intent_id = updates.stripePaymentIntentId;
      if (updates.stlFileUrl !== undefined) dbUpdates.stl_file_url = updates.stlFileUrl;
      if (updates.specifications !== undefined) dbUpdates.specifications = updates.specifications;
      
      dbUpdates.updated_at = new Date().toISOString();
      
      const { data, error } = await this.supabase
        .from('orders')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error(`Order with id ${id} not found`);
        }
        throw error;
      }
      
      return data as Order;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  }

  // Helper method to ensure tables exist
  async ensureTablesExist(): Promise<void> {
    try {
      if (!this.supabase) return;
      
      console.log('Checking if tables exist in Supabase...');
      
      // Test if users table exists
      const { error: usersError } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (usersError) {
        console.log('Users table does not exist. Please create it manually in Supabase with this SQL:');
        console.log(`
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);`);
      }

      // Test if orders table exists
      const { error: ordersError } = await this.supabase
        .from('orders')
        .select('count')
        .limit(1);
      
      if (ordersError) {
        console.log('Orders table does not exist. Please create it manually in Supabase with this SQL:');
        console.log(`
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  photo_url TEXT NOT NULL,
  style TEXT NOT NULL,
  engraving_text TEXT,
  font_style TEXT DEFAULT 'arial',
  color TEXT DEFAULT 'black',
  quality TEXT DEFAULT 'standard',
  total_amount DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  stl_file_url TEXT,
  specifications JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);`);
      }
      
      if (!usersError && !ordersError) {
        console.log('✅ Both users and orders tables exist in Supabase');
      }
      
    } catch (error) {
      console.error('Error checking tables:', error);
    }
  }
}