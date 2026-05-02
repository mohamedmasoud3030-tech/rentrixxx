# Rentrix — Smart Property Management System

**Rentrix** is an enterprise-grade, multi-tenant SaaS platform designed for modern property management. Built with a focus on financial integrity, automation, and AI-driven insights, it provides a comprehensive solution for property owners, managers, and tenants.

[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-green.svg)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-UNLICENSED-red.svg)](LICENSE)

---

## 🌟 Key Features

- **Automated Financials**: Atomic posting of receipts, automated invoice generation, and real-time balance tracking.
- **Immutable Ledger**: Bank-grade financial security with cryptographic hash-chaining of all transactions.
- **Smart AI Assistant**: Integrated Google Gemini 2.0 for property analysis, legal advice, and summarization.
- **Owner Portal**: Secure, passwordless access for owners to view real-time performance and financial statements.
- **Multi-Tenant Architecture**: Robust data isolation using PostgreSQL Row Level Security (RLS).
- **Comprehensive Reporting**: Real-time Trial Balance, Income Statements, and Rent Rolls.

---

## 📚 Documentation

We have provided comprehensive technical documentation to help you understand, deploy, and extend the platform:

| Document | Description |
|----------|-------------|
| [**Architecture**](./docs/ARCHITECTURE.md) | High-level system design, patterns, and data flows. |
| [**Database Schema**](./docs/DATABASE.md) | Detailed table structures, RLS policies, and triggers. |
| [**API Reference**](./docs/API.md) | Documentation for RPC functions, Edge Functions, and Public API. |
| [**Developer Guide**](./docs/DEVELOPER-GUIDE.md) | Local setup, coding standards, and project structure. |
| [**Deployment Guide**](./docs/DEPLOYMENT.md) | Step-by-step instructions for production deployment. |

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 22
- pnpm (recommended)

### Installation
```bash
# Clone the repository
git clone https://github.com/mohamedmasoud3030-tech/rentrixxx.git
cd rentrixxx

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
pnpm dev
```

---

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts.
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage).
- **AI**: Google Gemini 2.0 Flash.
- **Testing**: Vitest, React Testing Library.

---

## 🔒 Security

Rentrix is built with security as a first-class citizen:
- **Data Isolation**: Multi-tenant isolation at the database layer via RLS.
- **Financial Integrity**: Closed accounting periods and immutable event logs.
- **Access Control**: Granular Role-Based Access Control (RBAC).

---

## 📄 License

This project is currently **UNLICENSED**. All rights reserved.

---

Developed with ❤️ by [Mohamed Masoud](https://github.com/mohamedmasoud3030)
