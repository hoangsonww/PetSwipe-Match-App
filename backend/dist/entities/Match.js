"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Match = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Pet_1 = require("./Pet");
let Match = class Match {
};
exports.Match = Match;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Match.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.AppUser, (u) => u.matches, { onDelete: "CASCADE" }),
    __metadata("design:type", User_1.AppUser)
], Match.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Pet_1.Pet, (p) => p.matches, { onDelete: "CASCADE" }),
    __metadata("design:type", Pet_1.Pet)
], Match.prototype, "pet", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Match.prototype, "matchedAt", void 0);
exports.Match = Match = __decorate([
    (0, typeorm_1.Entity)()
], Match);
