import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class AddAdoptionJourneys1719000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.createTable(
      new Table({
        name: "adoption_journey",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          { name: "userId", type: "uuid", isNullable: false },
          { name: "petId", type: "uuid", isNullable: false },
          {
            name: "status",
            type: "enum",
            enumName: "adoption_journey_status_enum",
            enum: [
              "DISCOVERY",
              "APPLICATION_SUBMITTED",
              "MEET_AND_GREET",
              "HOME_PREP",
              "ADOPTED",
            ],
            default: "'DISCOVERY'",
          },
          { name: "notes", type: "text", isNullable: true },
          { name: "createdAt", type: "timestamptz", default: "now()" },
          { name: "updatedAt", type: "timestamptz", default: "now()" },
        ],
        foreignKeys: [
          {
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "app_user",
            onDelete: "CASCADE",
          },
          {
            columnNames: ["petId"],
            referencedColumnNames: ["id"],
            referencedTableName: "pet",
            onDelete: "CASCADE",
          },
        ],
        uniques: [
          {
            name: "UQ_adoption_journey_user_pet",
            columnNames: ["userId", "petId"],
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: "adoption_task",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          { name: "journeyId", type: "uuid", isNullable: false },
          { name: "title", type: "varchar", length: "160" },
          { name: "description", type: "text", isNullable: true },
          { name: "completed", type: "boolean", default: false },
          { name: "completedAt", type: "timestamptz", isNullable: true },
          { name: "createdAt", type: "timestamptz", default: "now()" },
          { name: "updatedAt", type: "timestamptz", default: "now()" },
        ],
        foreignKeys: [
          {
            columnNames: ["journeyId"],
            referencedColumnNames: ["id"],
            referencedTableName: "adoption_journey",
            onDelete: "CASCADE",
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("adoption_task");
    await queryRunner.dropTable("adoption_journey");
    await queryRunner.query(
      'DROP TYPE IF EXISTS "adoption_journey_status_enum"',
    );
  }
}
