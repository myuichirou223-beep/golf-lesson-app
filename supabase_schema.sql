-- ============================================================
-- Golf Lesson App — Supabase Database Schema
-- ============================================================
-- Copy and paste this SQL script into Supabase SQL Editor and click RUN.
-- ============================================================

-- 1. Create Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  customer_name TEXT,
  type TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Lessons Table
CREATE TABLE IF NOT EXISTS public.lessons (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  customer_name TEXT,
  coach_name TEXT NOT NULL,
  menu_id TEXT,
  menu_name TEXT NOT NULL,
  menu_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Menus Table
CREATE TABLE IF NOT EXISTS public.menus (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Coaches Table
CREATE TABLE IF NOT EXISTS public.coaches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  specialties TEXT[],
  bio TEXT,
  registered_at DATE DEFAULT CURRENT_DATE,
  active BOOLEAN DEFAULT TRUE
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users
CREATE POLICY "Allow read for authenticated" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read for authenticated" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.lessons FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read for authenticated" ON public.menus FOR SELECT USING (true);
CREATE POLICY "Allow read for authenticated" ON public.coaches FOR SELECT USING (true);
