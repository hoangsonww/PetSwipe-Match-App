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
exports.Swipe = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Pet_1 = require("./Pet");
let Swipe = class Swipe {
};
exports.Swipe = Swipe;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Swipe.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.AppUser, (u) => u.swipes, { onDelete: "CASCADE" }),
    __metadata("design:type", User_1.AppUser)
], Swipe.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Pet_1.Pet, (p) => p.swipes, { onDelete: "CASCADE" }),
    __metadata("design:type", Pet_1.Pet)
], Swipe.prototype, "pet", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Boolean)
], Swipe.prototype, "liked", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Swipe.prototype, "swipedAt", void 0);
exports.Swipe = Swipe = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Index)(["user", "pet"], { unique: true })
], Swipe);
