/**
 * Authentication Controller
 * Manages Google OAuth flow, login view rendering, and session termination.
 */

// Render Login Page
exports.renderLogin = (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect('/');
  }

  res.render('login', {
    title: 'Sign In | ALVORA MAISON',
    user: req.user || null
  });
};

// Post-Google Authentication Callback Handler
exports.googleCallback = (req, res) => {
  const returnTo = req.session.returnTo;
  const redirectUrl =
    typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
      ? returnTo
      : '/';
  delete req.session.returnTo;
  res.redirect(redirectUrl);
};

// User Logout Handler
exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      console.error('Passport Logout Error:', err);
      return next(err);
    }

    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error('Session Destruction Error:', sessionErr);
      }
      res.clearCookie('connect.sid', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
      return res.redirect('/');
    });
  });
};
