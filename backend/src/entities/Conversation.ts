import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from "typeorm";
import { AppUser } from "./User";
import { Pet } from "./Pet";
import { Message } from "./Message";

@Entity()
@Index(["user", "pet"], { unique: true })
export class Conversation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** The user (adopter) participating in this conversation */
  @ManyToOne(() => AppUser, { onDelete: "CASCADE" })
  user!: AppUser;

  /** The pet this conversation is about */
  @ManyToOne(() => Pet, { onDelete: "CASCADE" })
  pet!: Pet;

  /** Shelter contact email - derived from pet.shelterContact */
  @Column({ type: "varchar", nullable: true })
  shelterEmail?: string;

  /** Last message timestamp for sorting conversations */
  @Column({ type: "timestamp", nullable: true })
  lastMessageAt?: Date;

  /** All messages in this conversation */
  @OneToMany(() => Message, (m) => m.conversation)
  messages!: Message[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}