import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCreatedByToPet1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "pet",
      new TableColumn({
        name: "createdBy",
        type: "varchar",
        length: "255",
        isNullable: false,
        default: "'test@unc.edu'",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("pet", "createdBy");
  }
}
