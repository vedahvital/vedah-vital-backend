const jwt = require('jsonwebtoken');

function signCmsToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET');
  }

  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

function verifyCmsToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET');
  }

  return jwt.verify(token, secret);
}

module.exports = { signCmsToken, verifyCmsToken };
