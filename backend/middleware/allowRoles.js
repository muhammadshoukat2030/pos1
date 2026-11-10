import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

// Middleware to restrict access to specific roles
export const allowRoles = (...roles) => {
  return async (req, res, next) => {
    // Role alias equivalence: "worker" === "cashier"
    const expandedRoles = new Set(roles);
    if (expandedRoles.has("cashier")) expandedRoles.add("worker");
    if (expandedRoles.has("worker")) expandedRoles.add("cashier");

    // Helper to evaluate access
    const checkRole = (userRole) => {
      if (userRole === "superadmin") return true; // Superadmin has unrestricted global clearance
      return expandedRoles.has(userRole);
    };

    // 1. If req.user is already populated and verified by isLoggedIn
    if (req.user && req.user.role) {
      if (checkRole(req.user.role)) {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: `Access denied: role '${req.user.role}' lacks required permissions (${roles.join(", ")}).`
      });
    }

    // 2. Otherwise extract token from cookie or Authorization header
    let token = req.cookies?.token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY || "universal_pos_secret_key_session");

      // Verify active user in DB
      const dbUser = await Admin.findById(decoded.id).select("role isActive username branchId fullName").lean();
      if (!dbUser) {
        return res.status(401).json({ success: false, message: "User account no longer exists. Access revoked." });
      }
      if (dbUser.isActive === false) {
        return res.status(403).json({ success: false, message: "Account has been deactivated. Access revoked." });
      }

      req.user = {
        id: dbUser._id.toString(),
        username: dbUser.username,
        role: dbUser.role,
        branchId: dbUser.branchId,
        fullName: dbUser.fullName || dbUser.username,
        isActive: dbUser.isActive
      };

      if (!checkRole(dbUser.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied: role '${dbUser.role}' lacks required permissions (${roles.join(", ")}).`
        });
      }

      next();
    } catch (err) {
      console.error("JWT verification error in allowRoles:", err.message);
      return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }
  };
};
