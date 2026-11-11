import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://jucuderwsunqktiwpfyj.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_gc6egwWm525DXoCv6uxYhQ_CDuCzfi6';

export const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;
