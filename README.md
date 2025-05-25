# 🐾 PetSwipe

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)
![TypeORM](https://img.shields.io/badge/TypeORM-336791?style=flat-square&logo=typeorm&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=flat-square&logo=swagger&logoColor=black)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?style=flat-square&logo=amazonaws&logoColor=white)

**PetSwipe** is a swipe-to-adopt platform connecting prospective pet parents with shelter animals. Users can browse pets, swipe to adopt or pass, and manage profiles. The tech stack leverages Next.js, Express, PostgreSQL on AWS RDS, S3 for photos, and Tailwind CSS.

---

## 📋 Table of Contents

1. [Features](#-features)
2. [Tech Stack & Architecture](#-tech-stack--architecture)
3. [Database Schema (TypeORM Entities)](#-database-schema-typeorm-entities)
4. [Getting Started](#-getting-started)

- [Prerequisites](#prerequisites)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)

5. [API Reference](#-api-reference)
6. [AWS Deployment](#-aws-deployment)
7. [Scripts & Utilities](#-scripts--utilities)
8. [Contributing](#-contributing)
9. [License](#-license)

---

## 🚀 Features

- **User Authentication** (signup, login, email verification, password reset)
- **Swipe Interface**: Right = Adopt, Left = Pass
- **Personalized Deck**: `/matches/me` for your pet matches
- **History**: View all swipes & liked (adopted) pets
- **Admin Tools**:

  - Bulk upload pets via CSV
  - Export pets data
  - Photo uploads to S3
  - Manual match assignment

- **Responsive UI**: Next.js + Tailwind + shadcn/ui
- **Dark Mode** & Accessibility-ready
- **Real-time Animations**: Framer Motion & swipe gestures
- **Analytics**: Countups of swipes, matches, adoptions

---

## 🏛 Tech Stack & Architecture

| Layer           | Technology                                                              |
| --------------- | ----------------------------------------------------------------------- |
| Frontend        | Next.js, TypeScript, React, Tailwind CSS, shadcn/ui, framer-motion, SWR |
| Backend         | Node.js, Express, TypeScript, TypeORM, PostgreSQL                       |
| Storage         | AWS RDS (PostgreSQL), AWS S3                                            |
| Auth & Security | JSON Web Tokens, bcryptjs, cookie-parser                                |
| Docs & API      | Swagger (OpenAPI v3)                                                    |
| DevOps          | AWS Elastic Beanstalk / ECS, Docker (optional)                          |

```
[User's Browser]
        │
        ▼
 [Next.js Frontend] ←→ [Express API Backend] ←→ [PostgreSQL on AWS RDS]
        │                                   ↕
        │                                   → AWS S3 (pet photos)
        ▼
      Vercel (Frontend)                 Elastic Beanstalk / ECS (Backend)
```

---

## 🗄 Database Schema (TypeORM Entities)

### `AppUser`

```ts
@Entity()
export class AppUser {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ unique: true }) email!: string;
  @Column({ nullable: true }) password?: string;
  @Column({ nullable: true }) name?: string;
  @Column({ type: "date", nullable: true }) dob?: string;
  @Column({ type: "text", nullable: true }) bio?: string;
  @Column({ type: "text", nullable: true }) avatarUrl?: string;
  @OneToMany(() => Match, (m) => m.user) matches!: Match[];
  @OneToMany(() => Swipe, (s) => s.user) swipes!: Swipe[];
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
```

### `Pet`

```ts
@Entity()
export class Pet {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() name!: string;
  @Column() type!: string;
  @Column({ type: "text", nullable: true }) description?: string;
  @Column({ type: "text", nullable: true }) photoUrl?: string;
  @OneToMany(() => Match, (m) => m.pet) matches!: Match[];
  @OneToMany(() => Swipe, (s) => s.pet) swipes!: Swipe[];
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
```

### `Match`

```ts
@Entity()
export class Match {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => AppUser, (u) => u.matches, { onDelete: "CASCADE" })
  user!: AppUser;
  @ManyToOne(() => Pet, (p) => p.matches, { onDelete: "CASCADE" }) pet!: Pet;
  @CreateDateColumn() matchedAt!: Date;
}
```

### `Swipe`

```ts
@Entity()
export class Swipe {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => AppUser, (u) => u.swipes, { onDelete: "CASCADE" })
  user!: AppUser;
  @ManyToOne(() => Pet, (p) => p.swipes, { onDelete: "CASCADE" }) pet!: Pet;
  @Column() liked!: boolean;
  @CreateDateColumn() swipedAt!: Date;
}
```

---

## 🏁 Getting Started

### Prerequisites

- **Node.js** ≥ v18
- **npm** ≥ v8 or **Yarn**
- **PostgreSQL** (AWS RDS recommended)
- **AWS CLI** & IAM credentials for S3, RDS
- **Docker** (optional, for local Postgres container)

> ⚠️ **Note**: Due to `shadcn/ui` peerDeps, install frontend dependencies with:
>
> ```bash
> npm install --legacy-peer-deps
> # or
> yarn install --ignore-engines
> ```

---

### 🛠 Backend Setup

1. **Clone & Install**

   ```bash
   git clone https://github.com/hoangsonww/petswipe-backend.git
   cd pawswipe-backend
   npm install
   ```

2. **Environment**
   Copy and configure:

   ```bash
   cp .env.example .env
   ```

- `DATABASE_URL`: your AWS RDS Postgres connection string
- `JWT_SECRET`, `COOKIE_SECRET`
- AWS: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`

3. **Database Migrations**

   ```bash
   npm run typeorm migration:run
   ```

4. **Seed Sample Pets** (optional)

   ```bash
   npm run seed:pets
   ```

5. **Run in Development**

   ```bash
   npm run dev
   ```

   API available at `http://localhost:5001/api`

6. **Build & Production**

   ```bash
   npm run build
   npm run start
   ```

---

### 🖥 Frontend Setup

1. **Clone & Install**

   ```bash
   git clone https://github.com/hoangsonww/petswipe-frontend.git
   cd frontend
   npm install --legacy-peer-deps
   ```

2. **Environment**
   Create `.env.local`:

   ```ini
   NEXT_PUBLIC_API_URL=http://localhost:5001/api
   ```

3. **Run in Development**

   ```bash
   npm run dev
   ```

   Frontend available at `http://localhost:3000`

4. **Build & Production**

   ```bash
   npm run build
   npm run start
   ```

---

## 📚 API Reference

Swagger docs at `http://localhost:5001/api-docs.json`.

### Authentication

- **POST** `/api/auth/signup`
- **POST** `/api/auth/login`
- **POST** `/api/auth/logout`
- **POST** `/api/auth/verify-email`
- **POST** `/api/auth/reset-password`

### Matches

- **POST** `/api/matches`
- **GET** `/api/matches`
- **GET** `/api/matches/me`

### Pets

- **GET** `/api/pets`
- **POST** `/api/pets`
- **GET** `/api/pets/export`
- **POST** `/api/pets/:petId/photo`
- **POST** `/api/pets/upload`

### Swipes

- **POST** `/api/swipes`
- **GET** `/api/swipes/me`
- **GET** `/api/swipes/me/liked`
- **GET** `/api/swipes`

### Users

- **GET** `/api/users/me`
- **PUT** `/api/users/me`
- **POST** `/api/users/me/avatar`
- **DELETE** `/api/users/me/avatar`

---

## ☁️ AWS Deployment

- **RDS**: PostgreSQL instance for data
- **S3**: Bucket for pet photo storage
- **Elastic Beanstalk** or **ECS** for backend
- **Vercel** for frontend

**Tip**: Use IAM roles for EC2/ECS to grant S3 & RDS access securely.

---

## 🛠 Scripts & Utilities

- **Seed Pets**: `npm run seed:pets`
- **Assign Pets**: `npm run assign:user`
- **TypeORM CLI**: `npm run typeorm <command>`
- **Swagger**: Auto-generated OpenAPI spec

---

## 🤝 Contributing

1. Fork the repo & clone
2. Create a feature branch
3. Code, lint, test
4. Open a Pull Request

**Please** follow the existing code style (ESLint, Prettier, TypeScript).

---

## 📝 License

© {new Date().getFullYear()} **Son Nguyen**
Licensed under the **MIT License**.

---

❤️ _Thank you for helping pets find their forever homes!_
