import { Router } from "express";
import {
  getConversationMessages,
  getConversations,
  sendMessage,
  toggleFavoriteConversation,
} from "../controllers/messageController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.use(requireAuth);

router.get("/", getConversations);
router.put("/favorites/:userId", toggleFavoriteConversation);
router.get("/:userId", getConversationMessages);
router.post("/", sendMessage);

export default router;
