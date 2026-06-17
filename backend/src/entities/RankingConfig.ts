import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class RankingConfig {
  @PrimaryColumn({ type: "text" })
  key!: string;

  @Column({ type: "jsonb" })
  value!: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}