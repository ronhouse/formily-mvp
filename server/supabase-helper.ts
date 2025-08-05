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

// Helper to get user by anonymous ID from Supabase
export async function getUserFromSupabase(anonymousId: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('anonymous_id', anonymousId)
    .single();
    
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('❌ Supabase user fetch error:', error);
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
  
  return data;
}

// Helper to create user in Supabase
export async function createUserInSupabase(userData: { anonymousId: string; email: string }) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      anonymous_id: userData.anonymousId,
      email: userData.email
    })
    .select()
    .single();
    
  if (error) {
    console.error('❌ Supabase user creation error:', error);
    throw new Error(`Failed to create user: ${error.message}`);
  }
  
  return data;
}

// Helper to create order in Supabase
export async function createOrderInSupabase(orderData: {
  userId: string;
  photoUrl: string;
  style: string;
  engravingText?: string;
  fontStyle?: string;
  color?: string;
  quality?: string;
  totalAmount: string;
  specifications?: any;
  stripePaymentIntentId?: string;
}) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: orderData.userId,
      image_url: orderData.photoUrl,
      model_type: orderData.style,
      engraving_text: orderData.engravingText,
      font_style: orderData.fontStyle,
      color: orderData.color,
      quality: orderData.quality,
      total_amount: orderData.totalAmount,
      specifications: orderData.specifications,
      stripe_payment_intent_id: orderData.stripePaymentIntentId,
      status: 'pending'
    })
    .select()
    .single();
    
  if (error) {
    console.error('❌ Supabase order creation error:', error);
    throw new Error(`Failed to create order: ${error.message}`);
  }
  
  return data;
}