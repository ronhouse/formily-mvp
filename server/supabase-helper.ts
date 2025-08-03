// Supabase helper functions for consistent database operations
import { createClient } from '@supabase/supabase-js';

// Helper to get configured Supabase client
export function getSupabaseClient() {
  // Environment variables are swapped in secrets
  const supabaseUrl = process.env.VITE_SUPABASE_ANON_KEY; // Contains the URL
  const supabaseKey = process.env.VITE_SUPABASE_URL; // Contains the anon key
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }
  
  if (!supabaseUrl.startsWith('https://')) {
    throw new Error('Invalid Supabase URL format');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Helper to get order by ID from Supabase
export async function getOrderFromSupabase(orderId: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
    
  if (error) {
    console.error('❌ Supabase order fetch error:', error);
    throw new Error(`Failed to fetch order: ${error.message}`);
  }
  
  return data;
}

// Helper to update order in Supabase
export async function updateOrderInSupabase(orderId: string, updates: any) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();
    
  if (error) {
    console.error('❌ Supabase order update error:', error);
    throw new Error(`Failed to update order: ${error.message}`);
  }
  
  return data;
}

// Helper to get user by ID from Supabase
export async function getUserFromSupabase(userId: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error('❌ Supabase user fetch error:', error);
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
  
  return data;
}