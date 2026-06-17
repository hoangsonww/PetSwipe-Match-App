import { Router } from "express";
import { authMiddleware } from "../middlewares/auth";
import {
  getConversations,
  getMessages,
  sendMessage,
  createConversation,
} from "../controllers/conversationController";

const router = Router();

// All conversation routes require authentication
router.use(authMiddleware);

// GET /api/conversations - list user's conversations
router.get("/", getConversations);

// POST /api/conversations - create new conversation
router.post("/", createConversation);

// GET /api/conversations/:id/messages - get messages in a conversation
router.get("/:id/messages", getMessages);

// POST /api/conversations/:id/messages - send a message
router.post("/:id/messages", sendMessage);

export default router;