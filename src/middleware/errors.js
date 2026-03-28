function notFoundHandler(req, res, next) {
  res.status(404).json({ error: 'Not found' });
}

function errorHandler(err, req, res, next) {
  if (err && err.name === 'ZodError') {
    return res.status(400).json({ error: 'Invalid request', details: err.errors });
  }

  const status = err.statusCode || 500;

  // For client errors (4xx) pass the message through — it is intentional.
  // For server errors (5xx) log the real error and return a safe generic message.
  if (status >= 500) {
    console.error('[server error]', err);
    return res.status(status).json({ error: 'Something went wrong. Please try again later.' });
  }

  return res.status(status).json({ error: err.message || 'Request failed.' });
}

module.exports = { notFoundHandler, errorHandler };
