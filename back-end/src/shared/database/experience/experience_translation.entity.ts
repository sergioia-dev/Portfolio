import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import Language from "../language/language.entity";
import Experience from "./experience.entity";

@Entity({ name: "experiences" })
export default class ExperienceTranslation {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "varchar", length: 1000 })
  description!: string;

  @PrimaryColumn("uuid", { name: "language_id" })
  languageId!: string;

  @ManyToOne(() => Experience, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "id" })
  experience!: Experience;

  @ManyToOne(() => Language, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "language_id" })
  language!: Language;
}
