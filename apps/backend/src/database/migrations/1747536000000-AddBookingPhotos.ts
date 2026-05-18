import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingPhotos1747536000000 implements MigrationInterface {
  name = 'AddBookingPhotos1747536000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`booking_photos\` (
        \`id\`           int          NOT NULL AUTO_INCREMENT,
        \`bookingId\`    int          NOT NULL,
        \`uploadedById\` int          NULL,
        \`dataUrl\`      mediumtext   NOT NULL,
        \`mimeType\`     varchar(50)  NOT NULL,
        \`caption\`      varchar(200) NULL,
        \`createdAt\`    datetime(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_booking_photos_booking\` (\`bookingId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      ALTER TABLE \`booking_photos\`
        ADD CONSTRAINT \`FK_booking_photos_booking\`
          FOREIGN KEY (\`bookingId\`) REFERENCES \`bookings\`(\`id\`) ON DELETE CASCADE,
        ADD CONSTRAINT \`FK_booking_photos_uploader\`
          FOREIGN KEY (\`uploadedById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`booking_photos\``);
  }
}
