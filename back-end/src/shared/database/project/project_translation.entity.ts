import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import Language from "../language/language.entity";
import Project from "./project.entity";

@Entity({ name: "projects" })
export default class ProjectTranslation {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "varchar", length: 500 })
  description!: string;

  @PrimaryColumn("uuid", { name: "language_id" })
  languageId!: string;

  @ManyToOne(() => Project, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "id" })
  project!: Project;

  @ManyToOne(() => Language, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "language_id" })
  language!: Language;
}
