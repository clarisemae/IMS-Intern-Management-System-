import { Router } from "express";
import { getAttendance, timeIn, timeOut } from "../controllers/attendanceController";
import { requireAuth, requireRole } from "../middleware/authMiddleware";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole("intern"), getAttendance);
router.post("/time-in", requireRole("intern"), timeIn);
router.post("/time-out", requireRole("intern"), timeOut);

export default router;
