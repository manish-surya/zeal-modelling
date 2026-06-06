-- ============================================================
-- Zeal Modelling — Supabase SQL Schema
-- Run this in the Supabase SQL Editor, in order.
-- ============================================================

-- 1. PROFILES (mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model_type TEXT NOT NULL CHECK (model_type IN ('ml_supervised', 'deep_learning')),
  problem_type TEXT CHECK (problem_type IN ('classification', 'regression')),
  current_step INTEGER DEFAULT 1 CHECK (current_step BETWEEN 1 AND 5),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','in_progress','completed','exported')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 3. DATASETS
CREATE TABLE IF NOT EXISTS public.datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  row_count INTEGER,
  column_count INTEGER,
  column_meta JSONB,
  target_column TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PIPELINES
CREATE TABLE IF NOT EXISTS public.pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  config JSONB NOT NULL DEFAULT '[]',
  template TEXT CHECK (template IN ('classification','regression','time_series','nlp','blank')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS pipelines_updated_at ON public.pipelines;
CREATE TRIGGER pipelines_updated_at
  BEFORE UPDATE ON public.pipelines
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 5. TRAINING JOBS
CREATE TABLE IF NOT EXISTS public.training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES public.pipelines(id),
  model_type TEXT NOT NULL,
  hyperparameters JSONB NOT NULL DEFAULT '{}',
  train_val_split FLOAT DEFAULT 0.8,
  random_seed INTEGER DEFAULT 42,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued','running','complete','failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metrics JSONB,
  model_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_jobs ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- PROJECTS
CREATE POLICY "projects_all_own" ON public.projects
  FOR ALL USING (auth.uid() = user_id);

-- DATASETS (via project ownership)
CREATE POLICY "datasets_all_own" ON public.datasets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = datasets.project_id AND user_id = auth.uid()
    )
  );

-- PIPELINES
CREATE POLICY "pipelines_all_own" ON public.pipelines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = pipelines.project_id AND user_id = auth.uid()
    )
  );

-- TRAINING JOBS
CREATE POLICY "training_jobs_all_own" ON public.training_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = training_jobs.project_id AND user_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE BUCKETS (run these separately in Supabase dashboard
-- Storage section, or via the Supabase CLI)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('user-datasets', 'user-datasets', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('model-artefacts', 'model-artefacts', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('exports', 'exports', false);

-- Storage policies (run after creating buckets)
-- CREATE POLICY "user_datasets_own" ON storage.objects
--   FOR ALL USING (auth.uid()::text = (storage.foldername(name))[1]);
