#!/usr/bin/env node
/**
 * Parol uchun bcrypt hash generatsiya qilish
 * Ishlatish: node scripts/hash-password.js YOUR_PASSWORD
 */
const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error("Xato: parol ko'rsatilmagan");
  console.error("Ishlatish: node scripts/hash-password.js YOUR_PASSWORD");
  process.exit(1);
}

bcrypt.hash(password, 10).then((hash) => {
  console.log("\nParol hash:");
  console.log(hash);
  console.log("\n.env fayliga qo'shish:");
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
});
