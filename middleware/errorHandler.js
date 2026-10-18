function notFound(req, res) {
  res.status(404).send('Not Found');
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  console.error(err);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status >= 500
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  return res.status(status).send(message);
}

module.exports = { notFound, errorHandler };
