import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import ExceptionId from "./exception_id.entity";
import Language from "../language/language.entity";

@Entity({ name: "exceptions" })
export default class Exception {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 500 })
  message!: string;

  @PrimaryColumn("uuid", { name: "language_id" })
  languageId!: string;

  @ManyToOne(() => ExceptionId, { nullable: false })
  @JoinColumn({ name: "id" })
  exceptionId!: ExceptionId;

  @ManyToOne(() => Language, { nullable: false })
  @JoinColumn({ name: "language_id" })
  language!: Language;
}
