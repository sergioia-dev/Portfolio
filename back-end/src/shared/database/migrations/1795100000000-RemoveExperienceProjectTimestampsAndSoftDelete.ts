import type { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveExperienceProjectTimestampsAndSoftDelete1795100000000
  implements MigrationInterface
{
  name = "RemoveExperienceProjectTimestampsAndSoftDelete1795100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "experiences" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "experiences_id" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "experiences_id" DROP COLUMN "created_at"`);
    await queryRunner.query(`ALTER TABLE "experiences_id" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "projects_id" DROP COLUMN "created_at"`);
    await queryRunner.query(`ALTER TABLE "projects_id" DROP COLUMN "updated_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects_id" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects_id" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences_id" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences_id" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences_id" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "experiences" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
  }
}
