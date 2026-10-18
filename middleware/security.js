function sameOriginOnly(req, res, next) {
  const origin = req.get('origin');
  if (!origin) return next();

  // Safari and some local-development navigations may send `Origin: null`.
  // Allow that only outside production so local Docker testing works without
  // weakening the production same-origin policy.
  if (origin === 'null' && process.env.NODE_ENV !== 'production') {
    return next();
  }

  try {
    const originUrl = new URL(origin);
    if (originUrl.host !== req.get('host')) {
      return res.status(403).send('Cross-site request rejected');
    }
    return next();
  } catch {
    return res.status(403).send('Invalid request origin');
  }
}

module.exports = { sameOriginOnly };
