import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { AppUser } from "./User";
import { Pet } from "./Pet";

@Entity()
export class Match {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** who is swiping */
  @ManyToOne(() => AppUser, (u) => u.matches, { onDelete: "CASCADE" })
  user!: AppUser;

  /** which pet was presented */
  @ManyToOne(() => Pet, (p) => p.matches, { onDelete: "CASCADE" })
  pet!: Pet;

  /** when it was shown */
  @CreateDateColumn()
  matchedAt!: Date;
}
