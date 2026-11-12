import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import Provider from "./provider.entity";
import Role from "./role.entity";

@Entity({ name: "users" })
export default class User {
  @PrimaryColumn("uuid")
  id!: string;

  @ManyToOne(() => Provider, { nullable: false })
  @JoinColumn({ name: "provider_id" })
  provider!: Provider;

  @Column({ type: "varchar", length: 80, unique: true, nullable: true })
  username!: string | null;

  @Column({ type: "varchar", length: 255, unique: true, nullable: true })
  email!: string | null;

  @Column({ type: "text" })
  password!: string;

  @ManyToOne(() => Role, { nullable: false })
  @JoinColumn({ name: "rol_id" })
  rol!: Role;

  @Column({ type: "boolean", name: "deleted_at", nullable: true })
  deletedAt!: boolean | null;
}
