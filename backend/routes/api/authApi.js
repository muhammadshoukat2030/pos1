import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import Admin from "../../models/Admin.js";
import { isLoggedIn } from "../../middleware/isLoggedIn.js";
import { allowRoles } from "../../middleware/allowRoles.js";
import { checkIPBlocked } from "../../middleware/checkIPBlocked.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 15,
  message: { success: false, message: "Too many login attempts. Please wait 2 minutes." }
});

const VALID_ROLES = ["superadmin", "admin", "manager", "cashier", "inventory", "accountant", "worker"];

// POST /api/auth/login
router.post("/login", checkIPBlocked, loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required." });
    }

    const user = await Admin.findOne({ username: username.trim() }).populate("branchId", "name code address");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: "Account is deactivated. Please contact system administrator." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, branchId: user.branchId?._id || user.branchId },
      process.env.SECRET_KEY || "universal_pos_secret_key_session",
      { expiresIn: "365d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 365 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName || user.username,
        email: user.email || "",
        phone: user.phone || "",
        role: user.role,
        branch: user.branchId || null,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error("Login API Error:", err);
    return res.status(500).json({ success: false, message: "Server error during login." });
  }
});

// GET /api/auth/me
router.get("/me", isLoggedIn, async (req, res) => {
  try {
    const user = await Admin.findById(req.user.id)
      .populate("branchId", "name code address")
      .select("-password")
      .lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  if (req.session) {
    req.session.destroy(() => {});
  }
  return res.json({ success: true, message: "Logged out successfully." });
});

// GET /api/auth/users (Admin / Superadmin only)
router.get("/users", isLoggedIn, allowRoles("superadmin", "admin"), async (req, res) => {
  try {
    const users = await Admin.find()
      .populate("branchId", "name code address")
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/create-user (Admin / Superadmin only)
router.post("/create-user", isLoggedIn, allowRoles("superadmin", "admin"), async (req, res) => {
  try {
    const { username, password, role, fullName, email, phone, branchId, isActive } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ success: false, message: "Username, password and role are required." });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid role. Allowed roles are: ${VALID_ROLES.join(", ")}.` 
      });
    }

    // Privilege escalation prevention
    if (role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Only a Super Admin can create another Super Admin account." });
    }

    const existing = await Admin.findOne({ username: username.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "A user with this username already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await Admin.create({
      username: username.trim(),
      password: hashedPassword,
      role,
      fullName: fullName ? fullName.trim() : username.trim(),
      email: email ? email.trim() : "",
      phone: phone ? phone.trim() : "",
      branchId: branchId || null,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    const populatedUser = await Admin.findById(newUser._id)
      .populate("branchId", "name code address")
      .select("-password")
      .lean();

    return res.json({
      success: true,
      message: `User account '${newUser.username}' created successfully!`,
      user: populatedUser
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/auth/user/:id (Admin / Superadmin only)
router.put("/user/:id", isLoggedIn, allowRoles("superadmin", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { role, fullName, email, phone, branchId, isActive, password } = req.body;

    const targetUser = await Admin.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Protection against modifying superadmin unless caller is superadmin
    if (targetUser.role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Only a Super Admin can modify a Super Admin account." });
    }

    // Privilege escalation prevention
    if (role && role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Only a Super Admin can grant Super Admin role." });
    }

    if (role) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ success: false, message: `Invalid role. Allowed roles: ${VALID_ROLES.join(", ")}.` });
      }
      targetUser.role = role;
    }

    if (fullName !== undefined) targetUser.fullName = fullName.trim();
    if (email !== undefined) targetUser.email = email.trim();
    if (phone !== undefined) targetUser.phone = phone.trim();
    if (branchId !== undefined) targetUser.branchId = branchId || null;
    if (isActive !== undefined) targetUser.isActive = Boolean(isActive);

    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      targetUser.password = await bcrypt.hash(password.trim(), salt);
    }

    await targetUser.save();

    const updatedUser = await Admin.findById(id)
      .populate("branchId", "name code address")
      .select("-password")
      .lean();

    return res.json({
      success: true,
      message: "User profile updated successfully!",
      user: updatedUser
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/auth/user/:id (Admin / Superadmin only)
router.delete("/user/:id", isLoggedIn, allowRoles("superadmin", "admin"), async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account." });
    }

    const targetUser = await Admin.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Non-superadmin cannot delete a superadmin
    if (targetUser.role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Only a Super Admin can delete another Super Admin." });
    }

    await Admin.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: "User removed successfully." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/change-password
router.post("/change-password", isLoggedIn, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required." });
    }

    const user = await Admin.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect current password." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.json({ success: true, message: "Password updated successfully!" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
