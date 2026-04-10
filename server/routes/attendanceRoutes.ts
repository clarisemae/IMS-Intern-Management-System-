import { Router } from "express";
import { getAttendance, supervisorTimeIn, supervisorTimeOut, timeIn, timeOut, updateInternAttendanceRemark, updateInternSchedule } from "../controllers/attendanceController";
import { requireAuth, requireRole } from "../middleware/authMiddleware";

const router = Router();

router.use(requireAuth);

router.put("/manage/:internId/schedule", requireRole("supervisor", "admin"), updateInternSchedule);
router.post("/manage/:internId/time-in", requireRole("supervisor", "admin"), supervisorTimeIn);
router.post("/manage/:internId/time-out", requireRole("supervisor", "admin"), supervisorTimeOut);
router.put("/manage/:internId/remark", requireRole("supervisor", "admin"), updateInternAttendanceRemark);
router.get("/", requireRole("intern"), getAttendance);
router.post("/time-in", requireRole("intern"), timeIn);
router.post("/time-out", requireRole("intern"), timeOut);

export default router;
