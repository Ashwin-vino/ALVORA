module.exports = function isLoggedIn(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // Store return URL for seamless post-login redirection
  if (req.session) {
    req.session.returnTo = req.originalUrl;
  }

  // Handle JSON / AJAX requests gracefully
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in to continue.',
      redirectUrl: '/auth/login'
    });
  }

  return res.redirect('/auth/login');
};