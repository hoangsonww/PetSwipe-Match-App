"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCreatedByToPet1710000000000 = void 0;
const typeorm_1 = require("typeorm");
class AddCreatedByToPet1710000000000 {
    async up(queryRunner) {
        await queryRunner.addColumn("pet", new typeorm_1.TableColumn({
            name: "createdBy",
            type: "varchar",
            length: "255",
            isNullable: false,
            default: "'test@unc.edu'",
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropColumn("pet", "createdBy");
    }
}
exports.AddCreatedByToPet1710000000000 = AddCreatedByToPet1710000000000;
