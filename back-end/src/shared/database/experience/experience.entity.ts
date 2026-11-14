import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import User from "../user/user.entity";
import ExperienceTranslation from "./experience_translation.entity";

@Entity({ name: "experiences_id" })
export default class Experience {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "website_url", type: "varchar", length: 2048, nullable: true })
  websiteUrl!: string | null;

  @Column({ name: "start_date", type: "date" })
  startDate!: string;

  @Column({ name: "end_date", type: "date", nullable: true })
  endDate!: string | null;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;

  @OneToMany(
    () => ExperienceTranslation,
    (translation) => translation.experience,
  )
  translations!: ExperienceTranslation[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
