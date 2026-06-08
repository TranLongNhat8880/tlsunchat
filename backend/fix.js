require('dotenv').config();
const supabase = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function fixPassword() {
  const hash = await bcrypt.hash('Admin@123456', 12);
  const { data, error } = await supabase
    .from('users')
    .update({ password_hash: hash })
    .eq('email', 'admin@tlsunchat.com')
    .select();

  if (error) {
    console.error('Lỗi khi update password:', error.message);
  } else {
    console.log('Update password thành công!', data);
  }
}

fixPassword();
