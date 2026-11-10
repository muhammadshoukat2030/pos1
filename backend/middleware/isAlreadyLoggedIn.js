import jwt from "jsonwebtoken";

// Middleware to prevent logged-in users from visiting login page
export const isAlreadyLoggedIn = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) return next(); // not logged in, allow login page

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded; // attach info just in case
    return res.redirect("/home"); // all users go to same /home
  } catch (err) {
    next(); // invalid token, allow login page
  }
};


