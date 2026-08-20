# Generus Attendance Dashboard

![React](https://img.shields.io/badge/React_19-%2320232a.svg?&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript_5.9-%23007ACC.svg?&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_7-%23646CFF.svg?&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-%2306B6D4.svg?&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-%233FCF8E.svg?&logo=supabase&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand_5-%23000.svg?&logo=zustand&logoColor=white)
![Maintenance](https://img.shields.io/badge/Maintenance-Yes-green)
![Build](https://img.shields.io/badge/Build-Passing-green)
[![Deploy](https://img.shields.io/badge/Live-big--attendance.vercel.app-brightgreen)](https://generus-big.vercel.app/)

Administration dashboard for managing attendance, participants, forms, and approvals for the MuMiBig organization. Built on React 19 with Supabase as the backend and a 4-tier RBAC system (Super Admin, Admin, Team Manager, Member).

## Features

- **Attendance Tracking** -- Mobile-optimized public forms with real-time logging
- **Participant Management** -- Group-based registry with CRUD, export to Excel
- **Form System** -- Dynamic attendance forms with slug-based public URLs
- **Dashboard Analytics** -- Monthly recap with per-kelompok charts (Recharts)
- **RBAC** -- Role-based access control with Supabase RLS + client-side permission gates
- **Manage Role** -- User CRUD via Supabase Edge Function (Super Admin only)
- **Responsive UI** -- Mobile-first with light/dark mode

## Tech Stack

| Layer         | Technology                                     |
| ------------- | ---------------------------------------------- |
| Framework     | React 19 + Vite 7 (SWC)                        |
| Language      | TypeScript ~5.9                                |
| Routing       | TanStack Router v1 (file-based)                |
| Data Fetching | TanStack Query v5                              |
| Tables        | TanStack Table v8                              |
| State         | Zustand v5                                     |
| Backend       | Supabase (Postgres, Auth, Edge Functions, RLS) |
| Styling       | Tailwind CSS v4 + shadcn/ui (new-york)         |
| Forms         | react-hook-form v7 + Zod v4                    |
| Charts        | Recharts                                       |
| Icons         | Lucide React                                   |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Setup

```bash
git clone <repository-url>
pnpm install
```

Create `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

```bash
pnpm dev
```

## Project Structure

```
src/
  features/       # Feature modules (participants, attendance, forms, approvals, manage-role, dashboard)
  components/     # Shared UI (data-table, layout, shadcn primitives)
  routes/         # TanStack Router file-based routes (auto-generates routeTree.gen.ts)
  lib/            # Supabase client, schema (Zod), RBAC config, utilities
  hooks/          # usePermissions, useDialogState, useTableUrlState
  stores/         # Zustand auth store (role, kelompok from app_metadata)
  context/        # React providers (theme, layout, sidebar, search)
```

## RBAC Roles

| Role         | Scope                                      |
| ------------ | ------------------------------------------ |
| Super Admin  | Full access + user management              |
| Admin        | Full data access, view-only on Manage Role |
| Team Manager | CRUD scoped to own kelompok                |
| Member       | Read-only                                  |

Roles stored in Supabase `app_metadata` (server-only, tamper-proof). Enforced at DB level via RLS policies and at UI level via `usePermissions` hook + `PermissionGate` component.

## Scripts

| Command       | Description                              |
| ------------- | ---------------------------------------- |
| `pnpm dev`    | Start dev server                         |
| `pnpm build`  | TypeScript check + Vite production build |
| `pnpm lint`   | ESLint                                   |
| `pnpm format` | Prettier auto-fix                        |
| `pnpm knip`   | Find unused exports/dependencies         |

Created by Royanrosyad
