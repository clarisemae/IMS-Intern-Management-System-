import { Router } from "express";
import { createDepartment, createUser, deleteUser, getDepartments, getUsers, updateUser } from "../controllers/userController";
import { requireAuth, requireRole } from "../middleware/authMiddleware";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/departments", getDepartments);
router.post("/departments", createDepartment);
router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
