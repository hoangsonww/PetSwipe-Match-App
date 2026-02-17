import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { AdoptionJourney } from "./AdoptionJourney";

@Entity()
export class AdoptionTask {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => AdoptionJourney, (journey) => journey.tasks, {
    onDelete: "CASCADE",
  })
  journey!: AdoptionJourney;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "boolean", default: false })
  completed!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  completedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
