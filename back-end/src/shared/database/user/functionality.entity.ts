import { Column, Entity, ManyToMany, PrimaryColumn } from "typeorm";
import Role from "./role.entity";

@Entity({ name: "functionalities" })
export default class Functionality {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100, unique: true, nullable: false })
  name!: string;

  @Column({ type: "varchar", length: 500, nullable: false })
  description!: string;

  @ManyToMany(
    () => Role,
    (role) => role.functionalities,
  )
  roles!: Role[];
}
