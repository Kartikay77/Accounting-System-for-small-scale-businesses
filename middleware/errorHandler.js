function notFound(req, res) {
  res.status(404).send('Not Found');
}

function classifyError(err) {
  if (err?.status) return { status: err.status, message: err.message };
  if (err?.code === 11000) return { status: 409, message: 'A record with the same unique value already exists' };
  if (err?.name === 'CastError') return { status: 400, message: `Invalid ${err.path || 'identifier'}` };
  if (err?.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((entry) => entry.message).filter(Boolean);
    return { status: 400, message: details.join('; ') || 'Validation failed' };
  }
  if (err instanceof TypeError) return { status: 400, message: err.message || 'Invalid request' };

  const message = String(err?.message || '');
  if (/invalid|required|must be|cannot be|select a valid|not found:/i.test(message)) {
    return { status: 400, message };
  }
  if (/closed|insufficient stock|already exists|cannot exceed|would make stock negative/i.test(message)) {
    return { status: 409, message };
  }
  return { status: 500, message: err?.message || 'Internal Server Error' };
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const { status, message } = classifyError(err);
  if (status >= 500) console.error(err);
  const safeMessage = process.env.NODE_ENV === 'production' && status >= 500
    ? 'Internal Server Error'
    : message;

  return res.status(status).send(safeMessage);
}

module.exports = { notFound, errorHandler, classifyError };
