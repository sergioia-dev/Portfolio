import { Column, Entity, JoinTable, ManyToMany, PrimaryColumn } from "typeorm";
import Functionality from "./functionality.entity";

@Entity({ name: "roles" })
export default class Role {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100, unique: true, nullable: false })
  name!: string;

  @Column({ type: "varchar", length: 500, nullable: false })
  description!: string;

  @ManyToMany(
    () => Functionality,
    (functionality) => functionality.roles,
  )
  @JoinTable({
    name: "rol_funcionalities",
    joinColumn: { name: "rol_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "functionality_id", referencedColumnName: "id" },
  })
  functionalities!: Functionality[];
}
