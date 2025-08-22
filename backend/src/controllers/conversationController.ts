import { RequestHandler } from "express";
import { Repository } from "typeorm";
import { AppDataSource } from "../index";
import { Conversation } from "../entities/Conversation";
import { Message, MessageSender } from "../entities/Message";
import { Pet } from "../entities/Pet";
import { AppUser } from "../entities/User";

const conversationRepo = () => AppDataSource.getRepository(Conversation);
const messageRepo = () => AppDataSource.getRepository(Message);
const petRepo = () => AppDataSource.getRepository(Pet);

/**
 * @openapi
 * /api/conversations:
 *   get:
 *     summary: Get all conversations for the authenticated user
 *     description: Returns a list of conversations for the current user, ordered by last message timestamp
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   pet:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       photoUrl:
 *                         type: string
 *                       shelterName:
 *                         type: string
 *                   lastMessageAt:
 *                     type: string
 *                     format: date-time
 *                   unreadCount:
 *                     type: number
 *                   lastMessage:
 *                     type: object
 *                     properties:
 *                       content:
 *                         type: string
 *                       sender:
 *                         type: string
 *                         enum: [user, shelter]
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       '401':
 *         description: Unauthorized
 */
export const getConversations: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const conversations = await conversationRepo().find({
      where: { user: { id: req.user.id } },
      relations: ["pet"],
      order: { lastMessageAt: "DESC" },
    });

    const conversationsWithData = await Promise.all(
      conversations.map(async (conv) => {
        // Get last message
        const lastMessage = await messageRepo().findOne({
          where: { conversation: { id: conv.id } },
          order: { createdAt: "DESC" },
        });

        // Get unread count (messages from shelter that user hasn't read)
        const unreadCount = await messageRepo().count({
          where: {
            conversation: { id: conv.id },
            sender: MessageSender.SHELTER,
            isRead: false,
          },
        });

        return {
          id: conv.id,
          pet: {
            id: conv.pet.id,
            name: conv.pet.name,
            photoUrl: conv.pet.photoUrl,
            shelterName: conv.pet.shelterName,
          },
          lastMessageAt: conv.lastMessageAt,
          unreadCount,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                sender: lastMessage.sender,
                createdAt: lastMessage.createdAt,
              }
            : null,
        };
      })
    );

    res.json(conversationsWithData);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/conversations/{id}/messages:
 *   get:
 *     summary: Get messages in a conversation
 *     description: Returns all messages in a specific conversation
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       '200':
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   content:
 *                     type: string
 *                   sender:
 *                     type: string
 *                     enum: [user, shelter]
 *                   senderEmail:
 *                     type: string
 *                   imageUrl:
 *                     type: string
 *                   isRead:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Access denied - not your conversation
 *       '404':
 *         description: Conversation not found
 */
export const getMessages: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { id } = req.params;

    // Verify user has access to this conversation
    const conversation = await conversationRepo().findOne({
      where: { id, user: { id: req.user.id } },
    });

    if (!conversation) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }

    const messages = await messageRepo().find({
      where: { conversation: { id } },
      order: { createdAt: "ASC" },
    });

    // Mark messages from shelter as read
    await messageRepo().update(
      {
        conversation: { id },
        sender: MessageSender.SHELTER,
        isRead: false,
      },
      { isRead: true }
    );

    res.json(messages);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/conversations/{id}/messages:
 *   post:
 *     summary: Send a message in a conversation
 *     description: Send a new message in a specific conversation
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Message content
 *               imageUrl:
 *                 type: string
 *                 description: Optional image attachment URL
 *             required:
 *               - content
 *     responses:
 *       '201':
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 content:
 *                   type: string
 *                 sender:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       '400':
 *         description: Bad request
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Conversation not found
 */
export const sendMessage: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { content, imageUrl } = req.body;

    if (!content?.trim()) {
      res.status(400).json({ message: "Message content is required" });
      return;
    }

    // Verify user has access to this conversation
    const conversation = await conversationRepo().findOne({
      where: { id, user: { id: req.user.id } },
    });

    if (!conversation) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }

    const message = messageRepo().create({
      conversation,
      sender: MessageSender.USER,
      senderUser: req.user,
      content: content.trim(),
      imageUrl,
    });

    await messageRepo().save(message);

    // Update conversation's lastMessageAt
    await conversationRepo().update(id, { lastMessageAt: new Date() });

    res.status(201).json({
      id: message.id,
      content: message.content,
      sender: message.sender,
      imageUrl: message.imageUrl,
      createdAt: message.createdAt,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/conversations:
 *   post:
 *     summary: Create a new conversation
 *     description: Create a conversation between user and shelter for a specific pet
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               petId:
 *                 type: string
 *                 description: ID of the pet to start conversation about
 *             required:
 *               - petId
 *     responses:
 *       '201':
 *         description: Conversation created successfully
 *       '400':
 *         description: Bad request
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Pet not found
 *       '409':
 *         description: Conversation already exists
 */
export const createConversation: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { petId } = req.body;

    if (!petId) {
      res.status(400).json({ message: "petId is required" });
      return;
    }

    const pet = await petRepo().findOne({ where: { id: petId } });
    if (!pet) {
      res.status(404).json({ message: "Pet not found" });
      return;
    }

    // Check if conversation already exists
    const existingConversation = await conversationRepo().findOne({
      where: { user: { id: req.user.id }, pet: { id: petId } },
    });

    if (existingConversation) {
      res.status(409).json({
        message: "Conversation already exists",
        conversationId: existingConversation.id,
      });
      return;
    }

    const conversation = conversationRepo().create({
      user: req.user,
      pet,
      shelterEmail: pet.shelterContact,
    });

    await conversationRepo().save(conversation);

    res.status(201).json({
      id: conversation.id,
      petId: pet.id,
      petName: pet.name,
      shelterName: pet.shelterName,
    });
  } catch (err) {
    next(err);
  }
};