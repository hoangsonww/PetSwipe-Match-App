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
export class Pet {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** e.g. “Buddy” or “Whiskers” */
  @Column()
  name!: string;

  /** e.g. “Dog”, “Cat” */
  @Column()
  type!: string;

  /** breed, color, age etc. */
  @Column({ type: "text", nullable: true })
  description?: string;

  /** URL to photo(s) */
  @Column({ type: "text", nullable: true })
  photoUrl?: string;

  @OneToMany(() => Match, (m) => m.pet)
  matches!: Match[];

  @OneToMany(() => Swipe, (s) => s.pet)
  swipes!: Swipe[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
