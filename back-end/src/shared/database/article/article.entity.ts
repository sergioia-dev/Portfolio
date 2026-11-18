import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from "typeorm";
import Tag from "../tag/tag.entity";
import User from "../user/user.entity";
import ArticleTranslation from "./article_translation.entity";

@Entity({ name: "articles_id" })
export default class Article {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "is_deleted", type: "boolean", default: false })
  isDeleted!: boolean;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;

  @ManyToMany(() => Tag)
  @JoinTable({
    name: "article_tags",
    joinColumn: { name: "article_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "tag_id", referencedColumnName: "id" },
  })
  tags!: Tag[];

  @OneToMany(
    () => ArticleTranslation,
    (translation) => translation.article,
  )
  translations!: ArticleTranslation[];
}
