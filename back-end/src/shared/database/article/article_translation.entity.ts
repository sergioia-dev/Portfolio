import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import Language from "../language/language.entity";
import Article from "./article.entity";

@Entity({ name: "articles" })
export default class ArticleTranslation {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "raw_markdown", type: "text" })
  rawMarkdown!: string;

  @Column({ name: "rendered_html", type: "text" })
  renderedHtml!: string;

  @Column({ type: "varchar", length: 100 })
  title!: string;

  @Column({ type: "varchar", length: 500 })
  description!: string;

  @Column({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @PrimaryColumn("uuid", { name: "language_id" })
  languageId!: string;

  @ManyToOne(() => Article, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "id" })
  article!: Article;

  @ManyToOne(() => Language, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "language_id" })
  language!: Language;
}
