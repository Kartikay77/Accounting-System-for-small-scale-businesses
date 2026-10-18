function sameOriginOnly(req, res, next) {
  const origin = req.get('origin');
  if (!origin) return next();

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
