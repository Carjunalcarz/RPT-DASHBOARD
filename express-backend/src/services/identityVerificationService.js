const verifyPayorIdentity = async ({ idType, idNumber }) => {
  const enabled = String(process.env.IDENTITY_VERIFICATION_ENABLED || '').toLowerCase() === 'true';
  if (!enabled) {
    return { verified: true, provider: 'none', reason: 'disabled' };
  }

  return { verified: true, provider: 'none', reason: 'not_configured' };
};

module.exports = {
  verifyPayorIdentity,
};

