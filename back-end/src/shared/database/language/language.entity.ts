import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "languages" })
export default class Language {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255, default: "100" })
  name!: string;
}
