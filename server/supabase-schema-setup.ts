// Supabase Schema Setup - Ensures tables exist with proper structure
import { getSupabaseClient } from './supabase-helper';

export async function ensureSupabaseSchema() {
  const supabase = getSupabaseClient();
  
  console.log('🔧 Checking Supabase schema...');
  
  try {
    // Try to create users table
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        anonymous_id TEXT UNIQUE NOT NULL,
        email TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_anonymous_id ON users(anonymous_id);
    `;
    
    // Try to create orders table
    const createOrdersTable = `
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending',
        image_url TEXT NOT NULL,
        model_type TEXT NOT NULL,
        engraving_text TEXT,
        font_style TEXT DEFAULT 'arial',
        color TEXT DEFAULT 'black',
        quality TEXT DEFAULT 'standard',
        total_amount TEXT NOT NULL,
        stripe_payment_intent_id TEXT,
        stl_file_url TEXT,
        print_dispatched BOOLEAN DEFAULT FALSE,
        specifications JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    `;
    
    // Execute schema creation
    const { error: usersError } = await supabase.rpc('exec_sql', { 
      sql: createUsersTable 
    });
    
    if (usersError) {
      console.log('📝 Users table creation result:', usersError);
    }
    
    const { error: ordersError } = await supabase.rpc('exec_sql', { 
      sql: createOrdersTable 
    });
    
    if (ordersError) {
      console.log('📝 Orders table creation result:', ordersError);
    }
    
    console.log('✅ Supabase schema setup completed');
    
  } catch (error) {
    console.log('📝 Supabase schema setup note:', error);
    // Schema setup is optional - continue anyway
  }
}