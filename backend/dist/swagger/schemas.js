"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.components = void 0;
exports.components = {
    schemas: {
        AppUser: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    format: "uuid",
                    description: "Unique user identifier",
                },
                email: {
                    type: "string",
                    format: "email",
                    description: "User's login email (unique)",
                },
                name: {
                    type: "string",
                    nullable: true,
                    description: "Full name",
                },
                dob: {
                    type: "string",
                    format: "date",
                    nullable: true,
                    description: "Date of birth",
                },
                bio: {
                    type: "string",
                    nullable: true,
                    description: "Short user biography",
                },
                avatarUrl: {
                    type: "string",
                    format: "uri",
                    nullable: true,
                    description: "URL to user's avatar image",
                },
                matches: {
                    type: "array",
                    description: "Array of Match objects",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string", format: "uuid" },
                            pet: {
                                type: "object",
                                properties: {
                                    id: { type: "string", format: "uuid" },
                                    name: { type: "string" },
                                    type: { type: "string" },
                                },
                                required: ["id", "name", "type"],
                            },
                            matchedAt: {
                                type: "string",
                                format: "date-time",
                            },
                        },
                    },
                },
                swipes: {
                    type: "array",
                    description: "Array of Swipe objects",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string", format: "uuid" },
                            pet: {
                                type: "object",
                                properties: {
                                    id: { type: "string", format: "uuid" },
                                    name: { type: "string" },
                                    type: { type: "string" },
                                    photoUrl: { type: "string", format: "uri", nullable: true },
                                },
                                required: ["id", "name", "type"],
                            },
                            liked: { type: "boolean" },
                            swipedAt: { type: "string", format: "date-time" },
                        },
                    },
                },
                createdAt: {
                    type: "string",
                    format: "date-time",
                    description: "When the user was created",
                },
                updatedAt: {
                    type: "string",
                    format: "date-time",
                    description: "When the user was last updated",
                },
            },
        },
        Pet: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    format: "uuid",
                    description: "Unique pet identifier",
                },
                name: {
                    type: "string",
                    description: 'e.g. "Buddy" or "Whiskers"',
                },
                type: {
                    type: "string",
                    description: 'Species or category, e.g. "Dog", "Cat"',
                },
                description: {
                    type: "string",
                    nullable: true,
                    description: "Breed, color, age, personality, etc.",
                },
                photoUrl: {
                    type: "string",
                    format: "uri",
                    nullable: true,
                    description: "URL to pet’s photo",
                },
                shelterName: {
                    type: "string",
                    nullable: true,
                    description: "The shelter this pet is from",
                },
                shelterContact: {
                    type: "string",
                    nullable: true,
                    description: "Contact info for the shelter (email or phone)",
                },
                shelterAddress: {
                    type: "string",
                    nullable: true,
                    description: "Physical address of the shelter",
                },
                createdBy: {
                    type: "string",
                    format: "email",
                    description: "Email of the uploader/creator (used for edit permissions)",
                    default: "test@unc.edu",
                },
                matches: {
                    type: "array",
                    description: "Array of Match objects",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string", format: "uuid" },
                            user: {
                                type: "object",
                                properties: {
                                    id: { type: "string", format: "uuid" },
                                    email: { type: "string", format: "email" },
                                },
                                required: ["id", "email"],
                            },
                            matchedAt: { type: "string", format: "date-time" },
                        },
                    },
                },
                swipes: {
                    type: "array",
                    description: "Array of Swipe objects",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string", format: "uuid" },
                            user: {
                                type: "object",
                                properties: {
                                    id: { type: "string", format: "uuid" },
                                    email: { type: "string", format: "email" },
                                },
                                required: ["id", "email"],
                            },
                            liked: { type: "boolean" },
                            swipedAt: { type: "string", format: "date-time" },
                        },
                    },
                },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
            },
        },
        Match: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    format: "uuid",
                    description: "Unique match identifier",
                },
                user: {
                    type: "object",
                    description: "The user who saw this pet",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        email: { type: "string", format: "email" },
                        name: { type: "string", nullable: true },
                    },
                    required: ["id", "email"],
                },
                pet: {
                    type: "object",
                    description: "The pet that was shown",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        type: { type: "string" },
                    },
                    required: ["id", "name", "type"],
                },
                matchedAt: {
                    type: "string",
                    format: "date-time",
                    description: "Timestamp when the match was created",
                },
            },
        },
        Swipe: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    format: "uuid",
                    description: "Unique swipe identifier",
                },
                user: {
                    type: "object",
                    description: "The user who swiped",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        email: { type: "string", format: "email" },
                    },
                    required: ["id", "email"],
                },
                pet: {
                    type: "object",
                    description: "The pet that was swiped on",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        type: { type: "string" },
                        photoUrl: { type: "string", format: "uri", nullable: true },
                    },
                    required: ["id", "name", "type"],
                },
                liked: {
                    type: "boolean",
                    description: "true = “Yes, adopt!”, false = “Pass”",
                },
                swipedAt: {
                    type: "string",
                    format: "date-time",
                    description: "Timestamp when the swipe occurred",
                },
            },
        },
    },
};
