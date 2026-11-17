import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import Provider from "./provider.entity";
import Role from "./role.entity";
import UserInformation from "./user_information.entity";

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

  @Column({ type: "text", nullable: false })
  password!: string;

  @ManyToOne(() => Role, { nullable: false })
  @JoinColumn({ name: "rol_id" })
  rol!: Role;

  @Column({ type: "timestamptz", name: "deleted_at", nullable: true })
  deletedAt!: Date | null;

  @Column({ type: "boolean", name: "is_deleted", nullable: false, default: false })
  isDeleted!: boolean;

  @OneToOne(
    () => UserInformation,
    (information) => information.user,
  )
  information!: UserInformation | null;
}
