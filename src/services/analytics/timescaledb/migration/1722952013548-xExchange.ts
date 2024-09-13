import { MigrationInterface, QueryRunner } from "typeorm";

export class XExchange1722952013548 implements MigrationInterface {
    name = 'XExchange1722952013548'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."hyper_dex_analytics_timestamp_idx"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "hyper_dex_analytics_timestamp_idx" ON "hyper_dex_analytics" ("timestamp") `);
    }

}
