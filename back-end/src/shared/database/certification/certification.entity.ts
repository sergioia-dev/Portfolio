import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import User from "../user/user.entity";

@Entity({ name: "certifications" })
export default class Certification {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 150 })
  title!: string;

  @Column({ type: "varchar", length: 1000 })
  description!: string;

  @Column({ name: "document_url", type: "varchar", length: 2048 })
  documentUrl!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
