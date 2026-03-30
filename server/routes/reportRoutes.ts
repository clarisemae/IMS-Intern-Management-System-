import { Router } from "express";
import {
  createReport,
  downloadReport,
  getReport,
  getReports,
  updateReport,
} from "../controllers/reportController";
import { requireAuth, requireRole } from "../middleware/authMiddleware";

const router = Router();

router.use(requireAuth);

router.get("/", getReports);
router.get("/:id/download", downloadReport);
router.get("/:id", getReport);
router.post("/", requireRole("intern"), createReport);
router.put("/:id", requireRole("intern"), updateReport);

export default router;
