import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from "typeorm";
import Tag from "../tag/tag.entity";
import User from "../user/user.entity";
import ProjectTranslation from "./project_translation.entity";

@Entity({ name: "projects_id" })
export default class Project {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "repository_url", type: "text" })
  repositoryUrl!: string;

  @Column({ name: "website_url", type: "text", nullable: true })
  websiteUrl!: string | null;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToMany(() => Tag)
  @JoinTable({
    name: "project_tags",
    joinColumn: { name: "project_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "tag_id", referencedColumnName: "id" },
  })
  tags!: Tag[];

  @OneToMany(
    () => ProjectTranslation,
    (translation) => translation.project,
  )
  translations!: ProjectTranslation[];
}
