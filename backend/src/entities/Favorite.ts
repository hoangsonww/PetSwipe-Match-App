import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Index,
} from "typeorm";
import { AppUser } from "./User";
import { Pet } from "./Pet";

@Entity()
@Index(["user", "pet"], { unique: true })
export class Favorite {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** who favorited */
  @ManyToOne(() => AppUser, (u) => u.favorites, { onDelete: "CASCADE" })
  user!: AppUser;

  /** which pet was favorited */
  @ManyToOne(() => Pet, (p) => p.favorites, { onDelete: "CASCADE" })
  pet!: Pet;

  /** when it was favorited */
  @CreateDateColumn()
  favoritedAt!: Date;
}

