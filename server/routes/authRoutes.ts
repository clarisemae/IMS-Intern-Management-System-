import { Router } from "express";
import { forgotPassword, login, logout, me, resetPassword, updateProfile } from "../controllers/authController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.post("/forgot-password", forgotPassword);
router.post("/login", login);
router.post("/reset-password", resetPassword);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);
router.put("/profile", requireAuth, updateProfile);

export default router;
