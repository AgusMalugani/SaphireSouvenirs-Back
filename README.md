<div align="center">

# 💎 SaphireSouvenirs - Backend API

**Modular e-commerce backend for personalized souvenir management**

[![NestJS](https://img.shields.io/badge/NestJS-v10-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-NeonDB-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Validated with Zod](https://img.shields.io/badge/Validated%20with-Zod-3068B7?style=for-the-badge)](https://zod.dev/)
[![Swagger](https://img.shields.io/badge/Docs-Swagger_UI-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](https://swagger.io/)

</div>

---

## 📖 Introduction

SaphireSouvenirs Backend is a modular REST API built with NestJS to power an e-commerce platform focused on personalized souvenirs.

The system handles product and category management, order lifecycle, image uploads with Cloudinary, email notifications through Nodemailer, JWT-based authentication, and startup seeding for initial data.

---

## 🛠️ Tech Stack

- **NestJS v10** - Modular backend framework
- **TypeScript** - Static typing for reliable development
- **TypeORM + PostgreSQL (Neon)** - Data access and persistence
- **Cloudinary** - Image upload and storage
- **Nodemailer** - Transactional email delivery
- **Dayjs** - Date manipulation
- **Zod** - Runtime environment variable validation
- **Swagger** - Interactive API documentation

---

## 🔐 Infrastructure & Validation (Critical)

### Environment Variable Strategy

All environment variables are centralized and validated in:

`src/config/envs.ts`

This file defines a Zod schema, validates `process.env`, and exports a typed `envs` object used across the codebase.

### Fail-Fast Policy

The application follows a **Fail-Fast** policy:

- If `.env` is incomplete or invalid, startup is aborted.
- Validation errors are logged with each missing/invalid variable.
- The process exits immediately to avoid inconsistent runtime state.

---

## 🚀 Setup Guide

### Prerequisites

- Node.js (LTS recommended)
- npm
- PostgreSQL database (Neon or local)

### Installation

```bash
git clone <repository-url>
cd SaphireSouvenirs-Back
npm install
```

### Environment Setup

Use `.env.example` as the template:

```bash
cp .env.example .env
```

Then fill all required variables before running the app.

### Run in Development

```bash
npm run start:dev
```

---

## 🗄️ Database Policy

Database configuration is located in:

`src/config/typeOrm.config.ts`

Current policy:

- `synchronize: true` is enabled for development convenience.
- With this setting, entity changes are reflected automatically in the schema.
- Do not use this mode in production environments without controlled migration strategy.

---

## 📚 API Interactive Documentation

Swagger is enabled in the application bootstrap.

Access API docs at:

- `http://localhost:3000/api`

> Note: the app also uses global prefix `api/v1` for endpoints. Swagger UI is exposed at `/api`.

---

## 🧩 Project Modules

Main domains found in `src/modules`:

- **Auth** (`/auth`) - Signup and signin flows with JWT token generation
- **Users** (`/users`) - User operations, listing protected with `AuthGuard`
- **Products** (`/products`) - Product CRUD and image association
- **Categories** (`/categories`) - Category CRUD operations
- **Orders** (`/orders`) - Order creation and lifecycle management
- **Orderdetails** (`/orderdetails`) - Order line-item management
- **File Upload** (`/files`) - Direct file upload endpoints
- **Nodemailer** - Internal service module for email sending
- **Seeders** - Startup seed logic for categories, products, and admin user

---

## 🌐 API Endpoints Overview

### Auth

- `POST /auth/signup`
- `POST /auth/signin`

### Users

- `POST /users`
- `GET /users` (protected)

### Products

- `POST /products` (protected: admin)
- `GET /products`
- `GET /products/:id`
- `PUT /products/:id` (protected: admin)
- `DELETE /products/:id`
- `POST /products/upload/:id` (protected: admin)

### Categories

- `POST /categories`
- `GET /categories`
- `GET /categories/:id`
- `PUT /categories/:id`
- `DELETE /categories/:id`

### Orders

- `POST /orders`
- `GET /orders`
- `GET /orders/:id`
- `PUT /orders/:id`
- `DELETE /orders/:id`

### Order Details

- `GET /orderdetails`
- `GET /orderdetails/:id`
- `PATCH /orderdetails/:id`
- `DELETE /orderdetails/:id`

### File Upload

- `POST /files/uploadImage/:id`

---

## 🔒 Security

The project uses guard-based route protection:

- **AuthGuard** (`src/guards/auth.guard.ts`)  
  Validates Bearer JWT and injects payload into request.

- **RolesGuard** (`src/guards/roles.guard.ts`)  
  Validates required roles declared via `@Roles()` decorator.

Protected routes (e.g. product creation/update) use both `AuthGuard` and `RolesGuard`.

---

## 📦 Useful Scripts

| Script | Command | Description |
|---|---|---|
| Development | `npm run start:dev` | Run with watch mode |
| Build | `npm run build` | Compile TypeScript to `dist/` |
| Production | `npm run start:prod` | Run compiled app from `dist/main` |

---

<div align="center">
  <sub>Built with NestJS, TypeORM, PostgreSQL (Neon), Cloudinary, Nodemailer, and Zod.</sub>
</div>
