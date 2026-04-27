import { Router } from "express";
import { forgotPassword, login, logout, me, resetPassword } from "../controllers/authController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.post("/forgot-password", forgotPassword);
router.post("/login", login);
router.post("/reset-password", resetPassword);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);

export default router;
