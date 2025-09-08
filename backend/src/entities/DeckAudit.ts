import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { AppUser } from "./User";

@Entity()
export class DeckAudit {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => AppUser, { onDelete: "CASCADE" })
  user!: AppUser;

  @Column({ type: "integer" })
  size!: number;

  @Column({ type: "varchar", length: 100 })
  strategy!: string;

  @Column({ type: "jsonb", nullable: true })
  meta?: any;

  @CreateDateColumn()
  createdAt!: Date;
}