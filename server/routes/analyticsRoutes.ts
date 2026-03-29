import { Router } from "express";
import { getAnalytics } from "../controllers/analyticsController";
import { requireAuth, requireRole } from "../middleware/authMiddleware";

const router = Router();

router.use(requireAuth, requireRole("admin", "supervisor"));
router.get("/", getAnalytics);

export default router;
