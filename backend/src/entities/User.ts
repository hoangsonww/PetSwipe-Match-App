import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Match } from "./Match";
import { Swipe } from "./Swipe";

@Entity()
export class AppUser {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ type: "date", nullable: true })
  dob?: string;

  @Column({ type: "text", nullable: true })
  bio?: string;

  @Column({ type: "text", nullable: true })
  avatarUrl?: string | null;

  @OneToMany(() => Match, (m) => m.user)
  matches!: Match[];

  @OneToMany(() => Swipe, (s) => s.user)
  swipes!: Swipe[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
