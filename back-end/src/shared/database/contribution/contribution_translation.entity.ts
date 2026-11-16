import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import Language from "../language/language.entity";
import Contribution from "./contribution.entity";

@Entity({ name: "contributions" })
export default class ContributionTranslation {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "varchar", length: 500 })
  description!: string;

  @PrimaryColumn("uuid", { name: "language_id" })
  languageId!: string;

  @ManyToOne(() => Contribution, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "id" })
  contribution!: Contribution;

  @ManyToOne(() => Language, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "language_id" })
  language!: Language;
}
