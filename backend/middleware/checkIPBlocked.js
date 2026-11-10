import BlockedIP from "../models/BlockedIP.js";

export const checkIPBlocked = async (req, res, next) => {
  const ip = req.ip;

  const isBlocked = await BlockedIP.findOne({ ip });
  if (isBlocked) {
    return res.status(403).json({
      success: false,
      message: `Your IP ${ip} is permanently blocked!`
    });
  }

  next();
};
