import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import User from "./user.entity";

@Entity({ name: "user_information" })
export default class UserInformation {
  @PrimaryColumn("uuid")
  id!: string;

  @OneToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "id" })
  user!: User;

  @Column({ type: "varchar", length: 255, name: "full_name", nullable: true })
  fullName!: string | null;

  @Column({ type: "varchar", length: 17, nullable: true })
  phone!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  country!: string | null;

  @Column({ type: "text", name: "github_url", nullable: true })
  githubUrl!: string | null;

  @Column({ type: "text", name: "gitlab_url", nullable: true })
  gitlabUrl!: string | null;

  @Column({ type: "text", name: "linkedin_url", nullable: true })
  linkedinUrl!: string | null;
}
