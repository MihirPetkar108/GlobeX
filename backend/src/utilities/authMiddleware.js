const { supabase, useMock } = require('../config/db');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization header provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token found in authorization header' });
  }

  // If in mock mode, bypass real verification
  if (useMock) {
    // Treat the token as a simple user identity (e.g. ID or email) for demonstration
    req.user = { id: token, email: 'mock@example.com', role: 'admin' };
    return next();
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ message: 'Invalid or expired session token', error: error?.message });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[AuthMiddleware] Error:', err.message);
    res.status(500).json({ message: 'Authentication internal server error' });
  }
};

module.exports = authMiddleware;
