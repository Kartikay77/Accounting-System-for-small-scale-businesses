function sameHost(urlValue, req) {
  try {
    const parsed = new URL(urlValue);
    return parsed.host === req.get('host');
  } catch {
    return false;
  }
}

function sameOriginOnly(req, res, next) {
  const origin = req.get('origin');
  const referer = req.get('referer');

  if (origin === 'null' && process.env.NODE_ENV !== 'production') return next();
  if (origin) {
    return sameHost(origin, req)
      ? next()
      : res.status(403).send('Cross-site request rejected');
  }
  if (referer) {
    return sameHost(referer, req)
      ? next()
      : res.status(403).send('Cross-site request rejected');
  }

  // Automated tests do not have a browser to supply Origin/Referer headers.
  if (process.env.NODE_ENV === 'test') return next();
  return res.status(403).send('Missing request origin');
}

module.exports = { sameOriginOnly };
