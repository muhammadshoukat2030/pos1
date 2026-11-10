import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

// Middleware to check if user is logged in, exists in DB, and is active
export const isLoggedIn = async (req, res, next) => {
  let token = req.cookies?.token;

  // Support Authorization: Bearer <token>
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Support express-session user
  if (!token && req.session?.user) {
    req.user = req.session.user;
    return next();
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY || "universal_pos_secret_key_session");

    // Real-Time Database Verification: Reject deleted or deactivated accounts immediately
    const dbUser = await Admin.findById(decoded.id).select("role isActive username branchId fullName").lean();
    if (!dbUser) {
      return res.status(401).json({ success: false, message: "User account no longer exists. Access revoked." });
    }

    if (dbUser.isActive === false) {
      return res.status(403).json({ success: false, message: "Account has been deactivated. Access revoked." });
    }

    // Attach latest live user data (so role promotions/demotions take effect immediately)
    req.user = {
      id: dbUser._id.toString(),
      username: dbUser.username,
      role: dbUser.role,
      branchId: dbUser.branchId,
      fullName: dbUser.fullName || dbUser.username,
      isActive: dbUser.isActive
    };

    if (req.session) {
      req.session.user = req.user;
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired session. Please log in again." });
  }
};
