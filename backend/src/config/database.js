const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Dùng Service Role Key cho Backend để có full quyền

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Thiếu biến môi trường Supabase! Vui lòng kiểm tra file .env');
}

// Khởi tạo Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = supabase;
