export function fail(message, status = 500) {
  const error = new Error(message);
  error.statusCode = status;
  throw error;
}

// Routes stay flat: throw through fail() and let this turn it into the shape
// every existing endpoint already returns.
export function sendError(res, error, fallback) {
  res.status(error.statusCode || 500).json({
    error: true,
    message: error.message || fallback,
  });
}
