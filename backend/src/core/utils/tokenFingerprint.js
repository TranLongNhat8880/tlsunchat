const crypto = require('crypto');

exports.getPasswordTokenVersion = (passwordHash) => {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'local-secret')
    .update(passwordHash || '')
    .digest('hex')
    .slice(0, 32);
};
