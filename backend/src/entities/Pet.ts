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
import { AdoptionJourney } from "./AdoptionJourney";

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

  /** The shelter this pet is from */
  @Column({ type: "varchar", nullable: true })
  shelterName!: string;

  /** Contact info for the shelter (email or phone) */
  @Column({ type: "text", nullable: true })
  shelterContact?: string;

  /** Physical address of the shelter */
  @Column({ type: "text", nullable: true })
  shelterAddress?: string;

  /** Email of the uploader/creator (used for edit permissions) */
  @Column({ type: "varchar", length: 255, default: "test@unc.edu" })
  createdBy!: string;

  @OneToMany(() => Match, (m) => m.pet)
  matches!: Match[];

  @OneToMany(() => Swipe, (s) => s.pet)
  swipes!: Swipe[];

  @OneToMany(() => AdoptionJourney, (journey) => journey.pet)
  adoptionJourneys!: AdoptionJourney[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
