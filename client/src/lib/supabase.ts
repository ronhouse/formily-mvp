import { createClient } from '@supabase/supabase-js';

// Supabase configuration with placeholder values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
