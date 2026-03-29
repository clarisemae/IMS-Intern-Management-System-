import { Router } from "express";
import { getDashboardOverview } from "../controllers/dashboardController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.use(requireAuth);
router.get("/overview", getDashboardOverview);

export default router;
