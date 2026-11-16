import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProjectSchema1795000000000 implements MigrationInterface {
  name = "CreateProjectSchema1795000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "projects_id" ("id" uuid NOT NULL, "repository_url" text NOT NULL, "website_url" text, "user_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_projects_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "projects" ("id" uuid NOT NULL, "title" character varying(255) NOT NULL, "description" character varying(500) NOT NULL, "language_id" uuid NOT NULL, CONSTRAINT "PK_projects" PRIMARY KEY ("id", "language_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_tags" ("project_id" uuid NOT NULL, "tag_id" uuid NOT NULL, CONSTRAINT "PK_project_tags" PRIMARY KEY ("project_id", "tag_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects_id" ADD CONSTRAINT "FK_projects_id_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_project" FOREIGN KEY ("id") REFERENCES "projects_id"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_language" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_tags" ADD CONSTRAINT "FK_project_tags_project" FOREIGN KEY ("project_id") REFERENCES "projects_id"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_tags" ADD CONSTRAINT "FK_project_tags_tag" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project_tags" DROP CONSTRAINT "FK_project_tags_tag"`);
    await queryRunner.query(`ALTER TABLE "project_tags" DROP CONSTRAINT "FK_project_tags_project"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_language"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_project"`);
    await queryRunner.query(`ALTER TABLE "projects_id" DROP CONSTRAINT "FK_projects_id_user"`);
    await queryRunner.query(`DROP TABLE "project_tags"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP TABLE "projects_id"`);
  }
}
