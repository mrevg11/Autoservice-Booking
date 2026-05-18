import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceInterval1747536060000 implements MigrationInterface {
  name = 'AddServiceInterval1747536060000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `services` ADD COLUMN `recommendedIntervalDays` int NULL DEFAULT 180',
    );
    // Set meaningful intervals for common service types
    await queryRunner.query(`
      UPDATE \`services\` SET \`recommendedIntervalDays\` =
        CASE
          WHEN LOWER(\`name\`) LIKE '%олива%' OR LOWER(\`name\`) LIKE '%фільтр%' THEN 180
          WHEN LOWER(\`name\`) LIKE '%гальм%'                                     THEN 365
          WHEN LOWER(\`name\`) LIKE '%шин%' OR LOWER(\`name\`) LIKE '%колес%'     THEN 180
          WHEN LOWER(\`name\`) LIKE '%діагностик%'                                THEN 365
          WHEN LOWER(\`name\`) LIKE '%акумулят%'                                  THEN 730
          WHEN LOWER(\`name\`) LIKE '%ремінь%'                                    THEN 730
          ELSE 365
        END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `services` DROP COLUMN `recommendedIntervalDays`',
    );
  }
}
