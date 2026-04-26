# Rentrix — نظام إدارة الممتلكات

نظام SaaS متكامل لإدارة الممتلكات العقارية باللغة العربية.

## 🚀 Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + RPC)
- **Deployment:** Vercel

## ⚙️ Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

## 🔑 Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 📁 Architecture

```
src/services/           # Domain services + React hooks
├── api/                # Supabase client
├── auth/               # Authentication
├── tenants/            # Tenant management
├── contracts/          # Contract lifecycle
├── properties/         # Property management
├── owners/             # Owner management
├── finance/            # Financial operations (RPC)
├── invoices/           # Invoice management
├── receipts/           # Receipt operations
├── maintenance/        # Maintenance requests
├── expenses/           # Expense tracking
└── utils/              # Validators, formatters, error handler

src/features/           # UI feature pages
```

## 🗄️ Database

- 48 tables with full RLS
- 25+ RPC functions
- Atomic financial operations

## 🔒 Security

- Row Level Security on all tables
- SECURITY DEFINER with locked search_path
- JWT authentication via Supabase Auth
