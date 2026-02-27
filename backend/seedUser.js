const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // OPTION 1: Delete ALL users (clean slate)
    const deleteAllResult = await User.deleteMany({});
    console.log(`🗑️ Deleted ${deleteAllResult.deletedCount} existing users`);


    // Create all users
    const users = [
      {
        name: 'System Admin',
        email: 'sysadmin@test.com',
        password: 'Str0ng!Pass#2024',
        role: 'admin'
      },
      {
        name: 'Regular User',
        email: 'user@test.com',
        password: 'UserPass123!',
        role: 'user'
      },
      {
        name: 'Blocked User',
        email: 'blocked@test.com',
        password: 'BlockedPass123!',
        role: 'user',
        isBlocked: true
      }
    ];

    for (const userData of users) {
      const user = new User(userData);
      await user.save(); // This triggers the pre-save hashing
      console.log(` User created: ${userData.email}`);
    }

    // Verify users were created
    const dbUsers = await User.find({}).lean();
    console.log('\n All Users in Database:');
    
    for (const dbUser of dbUsers) {
      console.log('\n-------------------');
      console.log('Email:', dbUser.email);
      console.log('Name:', dbUser.name);
      console.log('Role:', dbUser.role);
      console.log('isBlocked:', dbUser.isBlocked);
      console.log('Password (hashed):', dbUser.password.substring(0, 20) + '...');
      
      // Test password verification for each user
      let testPassword;
      if (dbUser.email === 'sysadmin@test.com') testPassword = 'Str0ng!Pass#2024';
      else if (dbUser.email === 'user@test.com') testPassword = 'UserPass123!';
      else if (dbUser.email === 'blocked@test.com') testPassword = 'BlockedPass123!';
      
      const isMatch = await bcrypt.compare(testPassword, dbUser.password);
      console.log('Password verification:', isMatch ? '✅ PASS' : '❌ FAIL');
    }

    await mongoose.disconnect();
    console.log('\n Database connection closed');
    
  } catch (error) {
    console.error(' Seeding failed:', error);
    process.exit(1);
  }
};

seed();