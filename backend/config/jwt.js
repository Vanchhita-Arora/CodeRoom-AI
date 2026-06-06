/** Trim quotes/spaces from SECRET_KEY (common .env mistake). */
const getJwtSecret = () => {
  const key = process.env.SECRET_KEY || '';
  return key.trim().replace(/^["']|["']$/g, '');
};

module.exports = { getJwtSecret };
