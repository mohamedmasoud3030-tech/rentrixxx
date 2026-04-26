import { getSupabaseClient } from '@/services/api/supabaseClient';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

export class AuthService {
  static async login(credentials: AuthCredentials): Promise<any> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;
    return data;
  }

  static async register(credentials: AuthCredentials): Promise<any> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp(credentials);
    if (error) throw error;
    return data;
  }

  static async logout(): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user ? { id: user.id, email: user.email, user_metadata: user.user_metadata } : null;
  }

  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    const supabase = getSupabaseClient();
    return supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      callback(user ? { id: user.id, email: user.email, user_metadata: user.user_metadata } : null);
    });
  }
}
