import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

export const supabasePublic: SupabaseClient | null =
  supabaseUrl && publishableKey ? createClient(supabaseUrl, publishableKey) : null;

export const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && secretKey ? createClient(supabaseUrl, secretKey) : null;

export async function isSupabaseSchemaReady(): Promise<boolean> {
  if (!supabasePublic) return false;
  try {
    const { error } = await supabasePublic.from('profile').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
