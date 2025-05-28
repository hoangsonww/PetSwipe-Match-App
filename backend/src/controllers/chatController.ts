import { RequestHandler } from "express";
import { chatWithPetswipeAI } from "../utils/chatWithPetswipeAI";

interface ChatBody {
  history: {
    role: string;
    parts: { text: string }[];
  }[];
  message: string;
  userContext?: string;
}

/**
 * @openapi
 * /api/chat:
 *   post:
 *     summary: Send a message to the PetSwipe AI assistant
 *     description: |
 *       Takes the full conversation history and latest user message,
 *       forwards them to Google’s Gemini model, and returns the AI’s reply.
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: The conversation context plus the new message.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                       description: Who sent the message
 *                     parts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           text:
 *                             type: string
 *                             description: The text content of one message part
 *               message:
 *                 type: string
 *                 description: The latest user message to send
 *               userContext:
 *                 type: string
 *                 description: Optional additional context about the user
 *             required:
 *               - message
 *     responses:
 *       '200':
 *         description: The AI assistant’s reply
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 text:
 *                   type: string
 *                   description: The generated response from the assistant
 *       '400':
 *         description: Bad request (e.g., missing `message` field)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error detail
 *       '401':
 *         description: Unauthorized (user not logged in)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error detail
 */
export const chatHandler: RequestHandler<{}, any, ChatBody> = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { history = [], message, userContext } = req.body;
    if (!message) {
      res.status(400).json({ message: "Empty message" });
      return;
    }

    const reply = await chatWithPetswipeAI(history, message, userContext);
    res.json({ text: reply });
  } catch (err) {
    next(err);
  }
};
