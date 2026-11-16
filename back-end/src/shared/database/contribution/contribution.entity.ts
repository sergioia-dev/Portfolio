import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import User from "../user/user.entity";
import ContributionTranslation from "./contribution_translation.entity";

@Entity({ name: "contributions_id" })
export default class Contribution {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "project_url", type: "varchar", length: 2048, nullable: true })
  projectUrl!: string | null;

  @Column({ name: "pull_request_url", type: "varchar", length: 2048, nullable: true })
  pullRequestUrl!: string | null;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @OneToMany(
    () => ContributionTranslation,
    (translation) => translation.contribution,
  )
  translations!: ContributionTranslation[];
}
