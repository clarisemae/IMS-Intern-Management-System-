import { Router } from "express";
import {
  createTask,
  deleteTask,
  getAssignableInterns,
  getTasks,
  updateTask,
} from "../controllers/taskController";
import { requireAuth, requireRole } from "../middleware/authMiddleware";

const router = Router();

router.use(requireAuth);

router.get("/", getTasks);
router.get("/interns", requireRole("supervisor", "admin"), getAssignableInterns);
router.post("/", requireRole("supervisor", "admin"), createTask);
router.put("/:id", updateTask);
router.delete("/:id", requireRole("supervisor", "admin"), deleteTask);

export default router;
