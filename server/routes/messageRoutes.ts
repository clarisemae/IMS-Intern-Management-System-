import { Router } from "express";
import { getConversationMessages, getConversations, sendMessage } from "../controllers/messageController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.use(requireAuth);

router.get("/", getConversations);
router.get("/:userId", getConversationMessages);
router.post("/", sendMessage);

export default router;
