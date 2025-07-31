import { createClient } from '@supabase/supabase-js';

// Supabase configuration using environment variables
// Note: The environment variables appear to be swapped in the secrets
const supabaseUrl = import.meta.env.VITE_SUPABASE_ANON_KEY; // Actually contains the URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_URL; // Actually contains the anon key

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not found. Using fallback authentication.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

// Anonymous authentication helper
export async function signInAnonymously() {
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    
    if (error) {
      console.warn('Supabase anonymous auth failed, falling back to localStorage:', error.message);
      return getFallbackAnonymousAuth();
    }
    
    return {
      user: data.user,
      session: data.session,
      isSupabaseAuth: true,
    };
  } catch (error) {
    console.warn('Supabase not configured, using fallback auth:', error);
    return getFallbackAnonymousAuth();
  }
}

// Fallback authentication using localStorage (for development)
function getFallbackAnonymousAuth() {
  let anonymousId = localStorage.getItem('formily_anonymous_id');
  if (!anonymousId) {
    anonymousId = 'anon_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('formily_anonymous_id', anonymousId);
  }
  
  return {
    user: {
      id: anonymousId,
      email: null,
      created_at: new Date().toISOString(),
    },
    session: {
      access_token: 'fallback-token',
    },
    isSupabaseAuth: false,
  };
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return getFallbackAnonymousAuth();
    }
    
    return {
      user,
      session: (await supabase.auth.getSession()).data.session,
      isSupabaseAuth: true,
    };
  } catch (error) {
    return getFallbackAnonymousAuth();
  }
}

export async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.warn('Supabase signOut failed:', error);
  }
  
  // Clear fallback data
  localStorage.removeItem('formily_anonymous_id');
}

// Legacy functions for backwards compatibility
export function generateAnonymousId(): string {
  return 'anon_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function getAnonymousId(): string {
  let anonymousId = localStorage.getItem('formily_anonymous_id');
  if (!anonymousId) {
    anonymousId = generateAnonymousId();
    localStorage.setItem('formily_anonymous_id', anonymousId);
  }
  return anonymousId;
}

export function clearAnonymousId(): void {
  localStorage.removeItem('formily_anonymous_id');
}

// Test function to verify Supabase connection
export async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Log environment variables (safely)
    console.log('📝 Environment check:');
    console.log('- VITE_SUPABASE_URL available:', !!import.meta.env.VITE_SUPABASE_URL);
    console.log('- VITE_SUPABASE_ANON_KEY available:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
    console.log('- URL used:', supabaseUrl?.substring(0, 20) + '...');
    console.log('- Key used:', supabaseAnonKey?.substring(0, 20) + '...');
    
    // Test 1: Check client initialization
    console.log('✅ Supabase client initialized:', !!supabase);
    
    // Test 2: Get current session
    console.log('🔐 Getting current session...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('Session data:', sessionData);
    if (sessionError) {
      console.log('❌ Session error:', sessionError);
    }
    
    // Test 3: Get current user
    console.log('👤 Getting current user...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    console.log('User data:', userData);
    if (userError) {
      console.log('❌ User error:', userError);
    }
    
    // Test 4: Try anonymous sign in
    console.log('🔑 Attempting anonymous sign in...');
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
    console.log('Anonymous sign in result:', anonData);
    if (anonError) {
      console.log('❌ Anonymous sign in error:', anonError);
    } else {
      console.log('✅ Anonymous authentication successful!');
    }
    
    // Test 5: Check database connection with a simple query
    console.log('🗄️  Testing database connection...');
    const { data: dbTest, error: dbError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    console.log('Database test result:', dbTest);
    if (dbError) {
      console.log('❌ Database error:', dbError);
    } else {
      console.log('✅ Database connection successful!');
    }
    
    console.log('🎉 Supabase connection test completed!');
    return { success: true, sessionData, userData, anonData, dbTest };
    
  } catch (error) {
    console.error('💥 Supabase test failed:', error);
    return { success: false, error };
  }
}

// Auto-run test when in development
if (import.meta.env.DEV) {
  // Make test function available globally for console access
  (window as any).testSupabase = testSupabaseConnection;
  console.log('🔧 Development mode: Run testSupabase() in console to test Supabase connection');
}
