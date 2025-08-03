import { env } from "@/env";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () => createBrowserClient(supabaseUrl!, supabaseKey!);
