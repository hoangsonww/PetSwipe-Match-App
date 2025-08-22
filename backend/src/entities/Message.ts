import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from "typeorm";
import { AppUser } from "./User";
import { Conversation } from "./Conversation";

export enum MessageSender {
  USER = "user",
  SHELTER = "shelter",
}

@Entity()
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** The conversation this message belongs to */
  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: "CASCADE" })
  conversation!: Conversation;

  /** Who sent this message - user or shelter */
  @Column({
    type: "enum",
    enum: MessageSender,
  })
  sender!: MessageSender;

  /** The user who sent this message (if sender is USER) */
  @ManyToOne(() => AppUser, { onDelete: "SET NULL", nullable: true })
  senderUser?: AppUser;

  /** Email of shelter staff who sent this message (if sender is SHELTER) */
  @Column({ type: "varchar", nullable: true })
  senderEmail?: string;

  /** The message content */
  @Column({ type: "text" })
  content!: string;

  /** Optional image attachment URL */
  @Column({ type: "text", nullable: true })
  imageUrl?: string;

  /** Whether this message has been read by the recipient */
  @Column({ type: "boolean", default: false })
  isRead!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}