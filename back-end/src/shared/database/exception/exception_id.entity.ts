import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "exceptions_id" })
export default class ExceptionId {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "CODE", type: "varchar", length: 100, unique: true })
  code!: string;
}
