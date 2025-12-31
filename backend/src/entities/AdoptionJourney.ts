import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { AppUser } from "./User";
import { Pet } from "./Pet";
import { AdoptionTask } from "./AdoptionTask";

export enum JourneyStatus {
  DISCOVERY = "DISCOVERY",
  APPLICATION_SUBMITTED = "APPLICATION_SUBMITTED",
  MEET_AND_GREET = "MEET_AND_GREET",
  HOME_PREP = "HOME_PREP",
  ADOPTED = "ADOPTED",
}

@Entity()
@Index(["user", "pet"], { unique: true })
export class AdoptionJourney {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => AppUser, (user) => user.adoptionJourneys, {
    onDelete: "CASCADE",
  })
  user!: AppUser;

  @ManyToOne(() => Pet, (pet) => pet.adoptionJourneys, {
    onDelete: "CASCADE",
  })
  pet!: Pet;

  @Column({
    type: "enum",
    enum: JourneyStatus,
    default: JourneyStatus.DISCOVERY,
  })
  status!: JourneyStatus;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @OneToMany(() => AdoptionTask, (task) => task.journey, {
    cascade: true,
  })
  tasks!: AdoptionTask[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
