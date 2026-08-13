function throwIfSupabaseError(error, operation) {
  if (!error) {
    return;
  }

  console.error(`Supabase ${operation} failed:`, error.message);

  const databaseError = new Error('We could not complete that request. Please try again.');
  databaseError.status = 500;
  throw databaseError;
}

function isJsonRequest(req) {
  return Boolean(
    req.xhr ||
      (req.headers.accept && req.headers.accept.includes('application/json'))
  );
}

module.exports = {
  throwIfSupabaseError,
  isJsonRequest
};
