import type { MigrationInterface, QueryRunner } from "typeorm";

export class UsersSoftDeleteSchema1795300000000 implements MigrationInterface {
  name = "UsersSoftDeleteSchema1795300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE USING (CASE WHEN "deleted_at" THEN now() END)`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "is_deleted" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(
      `UPDATE "users" SET "is_deleted" = TRUE WHERE "deleted_at" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_information" ADD "business_email" character varying(2048)`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_information" ALTER COLUMN "github_url" TYPE character varying(2048)`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_information" ALTER COLUMN "gitlab_url" TYPE character varying(2048)`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_information" ALTER COLUMN "linkedin_url" TYPE character varying(2048)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_information" ALTER COLUMN "linkedin_url" TYPE text`);
    await queryRunner.query(`ALTER TABLE "user_information" ALTER COLUMN "gitlab_url" TYPE text`);
    await queryRunner.query(`ALTER TABLE "user_information" ALTER COLUMN "github_url" TYPE text`);
    await queryRunner.query(`ALTER TABLE "user_information" DROP COLUMN "business_email"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_deleted"`);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "deleted_at" TYPE boolean USING ("deleted_at" IS NOT NULL)`,
    );
  }
}
