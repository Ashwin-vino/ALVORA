module.exports = function isAdmin(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    if (req.session) {
      req.session.returnTo = req.originalUrl;
    }
    return res.redirect('/auth/login');
  }

  const safeUser = req.user || {};
  const isOgAdmin = safeUser.email && safeUser.email.toLowerCase() === 'ashwinvino8@gmail.com';
  
  // Expose for subsequent middleware if needed
  safeUser.isOgAdmin = isOgAdmin;
  
  // Any authenticated non-owner is considered a Sub-Admin
  const isSubAdmin = !isOgAdmin;

  // OG Admin always passes. Sub-Admins pass ONLY if they toggled Admin Mode.
  if (isOgAdmin || (isSubAdmin && req.session.adminMode === true)) {
    return next();
  }

  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges or Admin Mode required.'
    });
  }

  return res.status(403).render('error', {
    title: '403 - Forbidden | ALVORA',
    error: {
      status: 403,
      message: 'Access Denied. You do not have administrative permissions or Admin Mode is inactive.'
    }
  });
};
