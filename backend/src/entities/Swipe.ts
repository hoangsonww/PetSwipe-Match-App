import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { AppUser } from "./User";
import { Pet } from "./Pet";

@Entity()
@Index(["user", "pet"], { unique: true })
export class Swipe {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** who swiped */
  @ManyToOne(() => AppUser, (u) => u.swipes, { onDelete: "CASCADE" })
  user!: AppUser;

  /** which pet was swiped on */
  @ManyToOne(() => Pet, (p) => p.swipes, { onDelete: "CASCADE" })
  pet!: Pet;

  /** true = “Yes, adopt!”, false = “Pass” */
  @Column()
  liked!: boolean;

  @CreateDateColumn()
  swipedAt!: Date;
}
