import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import User from "../user/user.entity";

@Entity({ name: "tags" })
export default class Tag {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50 })
  name!: string;

  @Column({ type: "boolean", default: true })
  filterable!: boolean;

  @Column({ name: "image_url", type: "varchar", length: 2048, nullable: true })
  imageUrl!: string | null;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
