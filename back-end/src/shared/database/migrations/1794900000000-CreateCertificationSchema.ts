import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCertificationSchema1794900000000 implements MigrationInterface {
  name = "CreateCertificationSchema1794900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "certifications" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "title" character varying(150) NOT NULL, "description" character varying(1000) NOT NULL, "document_url" character varying(2048) NOT NULL, CONSTRAINT "PK_certifications" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_certifications_user_title" ON "certifications" ("user_id", LOWER("title"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "certifications" ADD CONSTRAINT "FK_certifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certifications" DROP CONSTRAINT "FK_certifications_user"`,
    );
    await queryRunner.query(`DROP INDEX "UQ_certifications_user_title"`);
    await queryRunner.query(`DROP TABLE "certifications"`);
  }
}
