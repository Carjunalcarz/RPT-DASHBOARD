-- Supabase Database Schema Setup for RPT Dashboard
-- This script sets up the custom user tables, RBAC, RLS policies, and triggers.

-- 1. Create Tables (if not using Prisma, otherwise these exist)
-- Ensure 'users' table exists and links to auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user', -- Legacy simple role
  municipality_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Create Roles table for RBAC
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create User Roles junction table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Define RLS Policies

-- Users Table Policies
-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

-- Allow admins (or service role) to view all profiles
-- Note: Service role bypasses RLS, but this is for authenticated admins via API
CREATE POLICY "Admins can view all profiles" 
ON public.users FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  ) OR 
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' -- Fallback to legacy role
);

-- Roles Table Policies
-- Allow everyone to read roles (needed for UI)
CREATE POLICY "Roles are viewable by everyone" 
ON public.roles FOR SELECT 
USING (true);

-- Only admins can manage roles
CREATE POLICY "Admins can insert roles" 
ON public.roles FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  )
);

CREATE POLICY "Admins can update roles" 
ON public.roles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  )
);

-- User Roles Table Policies
-- Users can view their own roles
CREATE POLICY "Users can view own roles" 
ON public.user_roles FOR SELECT 
USING (user_id = auth.uid());

-- Admins can view all user roles
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  )
);

-- Admins can manage user roles
CREATE POLICY "Admins can manage user roles" 
ON public.user_roles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  )
);

-- 4. Triggers for Automatic User Creation

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, created_at, updated_at)
  VALUES (
    new.id, 
    new.email, 
    'user', -- Default role
    NOW(), 
    NOW()
  );
  
  -- Assign default role in user_roles table if 'user' role exists
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT new.id, id FROM public.roles WHERE name = 'user'
  ON CONFLICT DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to sync user updates (optional, e.g., email change)
CREATE OR REPLACE FUNCTION public.handle_user_update() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET 
    email = new.email,
    updated_at = NOW()
  WHERE id = new.id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- 5. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_municipality ON public.users(municipality_code);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);

-- 6. Initial Data Seeding (Roles)
INSERT INTO public.roles (name, description)
VALUES 
  ('admin', 'Administrator with full access'),
  ('user', 'Regular user with limited access'),
  ('appraiser', 'Can view and edit assessments'),
  ('treasurer', 'Can view and process payments')
-- 7. Audit Log RLS (Optional, if using client-side queries, though currently backend handles it)
-- Create AuditLog table if not exists (Prisma usually handles this)
CREATE TABLE IF NOT EXISTS public."AuditLog" (
  id SERIAL PRIMARY KEY,
  "tableName" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  action TEXT NOT NULL,
  "oldValues" JSONB,
  "newValues" JSONB,
  "userId" TEXT,
  "userEmail" TEXT,
  "ipAddress" TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB
);

ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view audit logs" 
ON public."AuditLog" FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  ) OR 
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- Users can view their own audit logs (actions they performed)
CREATE POLICY "Users can view own audit logs" 
ON public."AuditLog" FOR SELECT 
USING ("userId" = auth.uid()::text);

-- No one can update or delete audit logs via RLS (Append-only)
-- Insert is allowed for authenticated users (handled by backend usually, but if client-side...)
CREATE POLICY "Authenticated users can insert audit logs" 
ON public."AuditLog" FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

