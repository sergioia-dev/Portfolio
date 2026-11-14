import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateExperienceSchema1794690874998 implements MigrationInterface {
  name = "CreateExperienceSchema1794690874998";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "experiences_id" ("id" uuid NOT NULL, "website_url" character varying(2048), "start_date" date NOT NULL, "end_date" date, "user_id" uuid NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b4feba7956970bd85883e6e7ca1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "experiences" ("id" uuid NOT NULL, "title" character varying(255) NOT NULL, "description" character varying(1000) NOT NULL, "language_id" uuid NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_5826788f3f438429e2f8453d7d4" PRIMARY KEY ("id", "language_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences_id" ADD CONSTRAINT "FK_76b84859ad8d2f2b4c8f07eee65" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD CONSTRAINT "FK_884f0913a63882712ea578e7c85" FOREIGN KEY ("id") REFERENCES "experiences_id"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD CONSTRAINT "FK_aded155c8087e2bf71146e75d96" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP CONSTRAINT "FK_aded155c8087e2bf71146e75d96"`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP CONSTRAINT "FK_884f0913a63882712ea578e7c85"`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences_id" DROP CONSTRAINT "FK_76b84859ad8d2f2b4c8f07eee65"`,
    );
    await queryRunner.query(`DROP TABLE "experiences"`);
    await queryRunner.query(`DROP TABLE "experiences_id"`);
  }
}
