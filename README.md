# Tamining Grove Limited — Maize Inventory (Strategic Edition v3)

Next.js + Supabase app tailored for an own-farm operation with mixed buyers:
- 10 fields, costs per field
- Moisture-adjusted batches
- Sales with **buyer type**, payment terms, expected payment dates
- **Break-even price** (KES/kg) from production costs and stored kg
- **Buyer analytics**: avg price & margins by buyer type
- **Cash flow forecast**: expected inflows + receivables aging

## Setup
1) Create a Supabase project.
2) Run `supabase/schema.sql` in Supabase SQL Editor.
3) Copy `.env.example` → `.env.local` and add your Supabase URL + anon key.
4) Run:
```bash
npm install
npm run dev
```

## Quick start data
- Add Fields (with acres), Varieties, Stores in Settings.
- Add Field Costs in Field Costs page.
- Add Harvest batches.
- Record Sales (choose buyer type + payment terms).

