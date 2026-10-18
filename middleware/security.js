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
  const fetchSite = req.get('sec-fetch-site');

  // Some browsers can send an opaque/null Origin for a navigation.
  // Sec-Fetch-Site is browser-controlled and tells us this request
  // originated from the same origin.
  if (origin === 'null' && fetchSite === 'same-origin') {
    return next();
  }

  if (origin && origin !== 'null') {
    return sameHost(origin, req)
      ? next()
      : res.status(403).send('Cross-site request rejected');
  }

  if (referer) {
    return sameHost(referer, req)
      ? next()
      : res.status(403).send('Cross-site request rejected');
  }

  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  return res.status(403).send('Missing request origin');
}

module.exports = { sameOriginOnly };