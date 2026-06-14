import "react-native-url-polyfill/polyfill";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qvkebjzecafnkcvplysk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2a2VianplY2FmbmtjdnBseXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Njg5NDgsImV4cCI6MjA5NzA0NDk0OH0.SlFLIH7ToEaTaI4EaE-i_KAxp0K5WIPmiEzgGLgcmVQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
