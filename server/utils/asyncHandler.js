/* Wraps an async route handler so a rejected promise reaches Express's
   error middleware (server/index.js) instead of every route repeating
   its own try/catch. */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
