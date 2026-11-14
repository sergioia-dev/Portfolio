import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserInformation1794679751274 implements MigrationInterface {
  name = "CreateUserInformation1794679751274";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_information" ("id" uuid NOT NULL, "full_name" character varying(255), "phone" character varying(17), "country" character varying(50), "github_url" text, "gitlab_url" text, "linkedin_url" text, CONSTRAINT "PK_f7fa43b43a7a288d5c5a1fedfec" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_information" ADD CONSTRAINT "FK_f7fa43b43a7a288d5c5a1fedfec" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_information" DROP CONSTRAINT "FK_f7fa43b43a7a288d5c5a1fedfec"`,
    );
    await queryRunner.query(`DROP TABLE "user_information"`);
  }
}
