import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "providers" })
export default class Provider {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50, unique: true, nullable: false })
  name!: string;
}
