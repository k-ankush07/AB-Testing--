export const requireApiKey = (req, res, next) => {
  const key = req.headers["x-api-key"];
  const validKey = process.env.VITE_API_SECRET_KEY || process.env.API_SECRET_KEY;

  if (!key || key !== validKey) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
};