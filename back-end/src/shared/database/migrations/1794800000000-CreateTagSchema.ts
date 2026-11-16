import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTagSchema1794800000000 implements MigrationInterface {
  name = "CreateTagSchema1794800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tags" ("id" uuid NOT NULL, "name" character varying(50) NOT NULL, "filterable" boolean NOT NULL DEFAULT true, "image_url" character varying(2048), "user_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_tags" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_tags_user_name" ON "tags" ("user_id", LOWER("name"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "tags" ADD CONSTRAINT "FK_tags_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tags" DROP CONSTRAINT "FK_tags_user"`);
    await queryRunner.query(`DROP INDEX "UQ_tags_user_name"`);
    await queryRunner.query(`DROP TABLE "tags"`);
  }
}
