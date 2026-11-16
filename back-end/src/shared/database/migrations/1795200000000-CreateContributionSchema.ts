import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateContributionSchema1795200000000 implements MigrationInterface {
  name = "CreateContributionSchema1795200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "contributions_id" ("id" uuid NOT NULL, "project_url" character varying(2048), "pull_request_url" character varying(2048), "user_id" uuid NOT NULL, CONSTRAINT "PK_contributions_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "contributions" ("id" uuid NOT NULL, "title" character varying(255) NOT NULL, "description" character varying(500) NOT NULL, "language_id" uuid NOT NULL, CONSTRAINT "PK_contributions" PRIMARY KEY ("id", "language_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "contributions_id" ADD CONSTRAINT "FK_contributions_id_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contributions" ADD CONSTRAINT "FK_contributions_contribution" FOREIGN KEY ("id") REFERENCES "contributions_id"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contributions" ADD CONSTRAINT "FK_contributions_language" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contributions" DROP CONSTRAINT "FK_contributions_language"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contributions" DROP CONSTRAINT "FK_contributions_contribution"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contributions_id" DROP CONSTRAINT "FK_contributions_id_user"`,
    );
    await queryRunner.query(`DROP TABLE "contributions"`);
    await queryRunner.query(`DROP TABLE "contributions_id"`);
  }
}
