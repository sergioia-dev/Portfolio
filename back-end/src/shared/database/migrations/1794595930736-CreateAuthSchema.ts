import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuthSchema1794595930736 implements MigrationInterface {
  name = "CreateAuthSchema1794595930736";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "languages" ("id" uuid NOT NULL, "name" character varying(255) NOT NULL DEFAULT '100', CONSTRAINT "PK_b517f827ca496b29f4d549c631d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "exceptions_id" ("id" uuid NOT NULL, "CODE" character varying(100) NOT NULL, CONSTRAINT "UQ_e14ea98aa6c47561e993be3eb4d" UNIQUE ("CODE"), CONSTRAINT "PK_b56f62f175136289c629ee7cca6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "exceptions" ("id" uuid NOT NULL, "message" character varying(500) NOT NULL, "language_id" uuid NOT NULL, CONSTRAINT "PK_b6570bbb14adef7000e84475bbc" PRIMARY KEY ("id", "language_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" uuid NOT NULL, "name" character varying(100) NOT NULL, "description" character varying(500) NOT NULL, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "functionalities" ("id" uuid NOT NULL, "name" character varying(100) NOT NULL, "description" character varying(500) NOT NULL, CONSTRAINT "UQ_5cbdcf11160ba4aeb63972372d7" UNIQUE ("name"), CONSTRAINT "PK_d560600abe41569673b94f107d2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "providers" ("id" uuid NOT NULL, "name" character varying(50) NOT NULL, CONSTRAINT "UQ_d735474e539e674ba3702eddc44" UNIQUE ("name"), CONSTRAINT "PK_af13fc2ebf382fe0dad2e4793aa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL, "username" character varying(80), "email" character varying(255), "password" text NOT NULL, "deleted_at" boolean, "provider_id" uuid NOT NULL, "rol_id" uuid NOT NULL, CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "rol_funcionalities" ("rol_id" uuid NOT NULL, "functionality_id" uuid NOT NULL, CONSTRAINT "PK_de4a61dd165a2c6ff7342f82be6" PRIMARY KEY ("rol_id", "functionality_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ebb23f2b470950658b7e964bb2" ON "rol_funcionalities"  ("rol_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a28968bd948caa735517dbf20f" ON "rol_funcionalities"  ("functionality_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "exceptions" ADD CONSTRAINT "FK_30e436ef146011cd8a1a758069c" FOREIGN KEY ("id") REFERENCES "exceptions_id"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exceptions" ADD CONSTRAINT "FK_eecc1831d706f68fcc75f3f5e78" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_6425135effde2ab8322f8464932" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_685cb01ac5c88b5abb6bbe8aa60" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rol_funcionalities" ADD CONSTRAINT "FK_ebb23f2b470950658b7e964bb2a" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "rol_funcionalities" ADD CONSTRAINT "FK_a28968bd948caa735517dbf20fd" FOREIGN KEY ("functionality_id") REFERENCES "functionalities"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rol_funcionalities" DROP CONSTRAINT "FK_a28968bd948caa735517dbf20fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rol_funcionalities" DROP CONSTRAINT "FK_ebb23f2b470950658b7e964bb2a"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_685cb01ac5c88b5abb6bbe8aa60"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_6425135effde2ab8322f8464932"`);
    await queryRunner.query(
      `ALTER TABLE "exceptions" DROP CONSTRAINT "FK_eecc1831d706f68fcc75f3f5e78"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exceptions" DROP CONSTRAINT "FK_30e436ef146011cd8a1a758069c"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_a28968bd948caa735517dbf20f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ebb23f2b470950658b7e964bb2"`);
    await queryRunner.query(`DROP TABLE "rol_funcionalities"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "providers"`);
    await queryRunner.query(`DROP TABLE "functionalities"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "exceptions"`);
    await queryRunner.query(`DROP TABLE "exceptions_id"`);
    await queryRunner.query(`DROP TABLE "languages"`);
  }
}
