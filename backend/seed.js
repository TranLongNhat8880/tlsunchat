require('dotenv').config();
const supabase = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function seedUsers() {
  console.log('Đang tạo dữ liệu mẫu...');

  const passwordHash = await bcrypt.hash('123456', 12);

  const users = [
    {
      name: 'Nam Nguyễn',
      email: 'nam@company.vn',
      password_hash: passwordHash,
      role: 'member'
    },
    {
      name: 'Hoa Trần',
      email: 'hoa@company.vn',
      password_hash: passwordHash,
      role: 'member'
    },
    {
      name: 'Tuấn IT',
      email: 'tuan@company.vn',
      password_hash: passwordHash,
      role: 'member'
    }
  ];

  for (const user of users) {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select();
      
    if (error) {
      console.error(`Lỗi khi tạo user ${user.name}:`, error.message);
    } else {
      console.log(`Đã tạo thành công: ${user.name}`);
    }
  }

  console.log('Hoàn tất Seed Data!');
  process.exit(0);
}

seedUsers();
