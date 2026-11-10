// middleware/ensure2FA.js
// 2FA / Email OTP has been completely removed in favor of direct credentials authentication.
export function ensure2FA(req, res, next) {
  next();
}
