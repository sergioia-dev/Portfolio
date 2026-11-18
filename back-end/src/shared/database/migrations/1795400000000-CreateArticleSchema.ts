import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateArticleSchema1795400000000 implements MigrationInterface {
  name = "CreateArticleSchema1795400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "articles_id" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "is_deleted" boolean NOT NULL DEFAULT false, "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_articles_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "articles" ("id" uuid NOT NULL, "raw_markdown" text NOT NULL, "rendered_html" text NOT NULL, "language_id" uuid NOT NULL, "title" character varying(100) NOT NULL, "description" character varying(500) NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_articles" PRIMARY KEY ("id", "language_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "article_tags" ("tag_id" uuid NOT NULL, "article_id" uuid NOT NULL, CONSTRAINT "PK_article_tags" PRIMARY KEY ("tag_id", "article_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "comments" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "article_id" uuid NOT NULL, "parent_comment" uuid, "comment" character varying(1000) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated" boolean NOT NULL DEFAULT false, "updated_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_comments" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles_id" ADD CONSTRAINT "FK_articles_id_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ADD CONSTRAINT "FK_articles_article" FOREIGN KEY ("id") REFERENCES "articles_id"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ADD CONSTRAINT "FK_articles_language" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_tags" ADD CONSTRAINT "FK_article_tags_article" FOREIGN KEY ("article_id") REFERENCES "articles_id"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_tags" ADD CONSTRAINT "FK_article_tags_tag" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_comments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_comments_article" FOREIGN KEY ("article_id") REFERENCES "articles_id"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_comments_parent" FOREIGN KEY ("parent_comment") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_comments_parent"`);
    await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_comments_article"`);
    await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_comments_user"`);
    await queryRunner.query(`ALTER TABLE "article_tags" DROP CONSTRAINT "FK_article_tags_tag"`);
    await queryRunner.query(`ALTER TABLE "article_tags" DROP CONSTRAINT "FK_article_tags_article"`);
    await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT "FK_articles_language"`);
    await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT "FK_articles_article"`);
    await queryRunner.query(`ALTER TABLE "articles_id" DROP CONSTRAINT "FK_articles_id_user"`);
    await queryRunner.query(`DROP TABLE "comments"`);
    await queryRunner.query(`DROP TABLE "article_tags"`);
    await queryRunner.query(`DROP TABLE "articles"`);
    await queryRunner.query(`DROP TABLE "articles_id"`);
  }
}
