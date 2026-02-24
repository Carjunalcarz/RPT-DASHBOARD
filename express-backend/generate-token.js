const jwt = require('jsonwebtoken');
require('dotenv').config();

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d',
  });
};

const token = signToken('1'); // Test User ID 1
console.log('Use this Bearer Token:');
console.log(token);
