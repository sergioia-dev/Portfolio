import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from "typeorm";
import User from "../user/user.entity";
import Article from "./article.entity";

@Entity({ name: "comments" })
export default class Comment {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "article_id", type: "uuid" })
  articleId!: string;

  @ManyToOne(() => Article, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "article_id" })
  article!: Article;

  @Column({ name: "parent_comment", type: "uuid", nullable: true })
  parentCommentId!: string | null;

  @ManyToOne(() => Comment, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "parent_comment" })
  parentComment!: Comment | null;

  @OneToMany(
    () => Comment,
    (comment) => comment.parentComment,
  )
  replies!: Comment[];

  @Column({ type: "varchar", length: 1000 })
  comment!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ type: "boolean", default: false })
  updated!: boolean;

  @Column({ name: "updated_at", type: "timestamptz", nullable: true })
  updatedAt!: Date | null;
}
