-- Isolasi data operasional BIYA/BOS per Supabase Auth user.
-- Jalankan setelah backup. Migration tidak menghapus atau mengklaim data lama.
-- Row lama dengan user_id NULL tetap tersimpan, tetapi tidak dapat dibaca user biasa
-- sampai di-backfill secara eksplisit ke UUID owner yang benar.

begin;

DO $migration$
DECLARE
  table_name text;
  legacy_policy record;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'raw_material',
    'raw_material_categories',
    'preparations',
    'preparation_items',
    'preparation_categories',
    'menus',
    'menu_items',
    'menu_categories',
    'menu_subcategories',
    'cost_settings'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      RAISE NOTICE 'Tabel public.% tidak ditemukan; dilewati.', table_name;
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE',
      table_name
    );
    -- Jika user_id sudah pernah dibuat tanpa FK, tambahkan FK NOT VALID agar
    -- row lama tidak dihapus dan migration tetap dapat dilanjutkan sebelum backfill.
    IF NOT EXISTS (
      SELECT 1
        FROM pg_constraint c
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
       WHERE c.contype = 'f'
         AND c.conrelid = to_regclass(format('public.%I', table_name))
         AND c.confrelid = 'auth.users'::regclass
         AND a.attname = 'user_id'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID',
        table_name, table_name || '_user_id_fkey'
      );
    END IF;

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (user_id)', table_name || '_user_id_idx', table_name);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    -- Semua policy lama pada tabel operasional diganti secara sengaja. Policy
    -- permissive lama akan digabung dengan OR oleh PostgreSQL dan dapat membocorkan
    -- data lintas user walaupun policy ownership baru sudah ada.
    FOR legacy_policy IN
      SELECT policyname
        FROM pg_policies
       WHERE schemaname = 'public' AND tablename = table_name
    LOOP
      RAISE NOTICE 'Mengganti policy lama %.%: %', 'public', table_name, legacy_policy.policyname;
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', legacy_policy.policyname, table_name);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id)',
      'BIYA users can view own data', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id)',
      'BIYA users can insert own data', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id)',
      'BIYA users can update own data', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id)',
      'BIYA users can delete own data', table_name
    );
  END LOOP;
END
$migration$;

-- Settings lama memakai business_id. Untuk mode satu bisnis per akun, business_id
-- tetap dipertahankan demi kompatibilitas dan frontend mengisinya dengan auth.users.id.
DO $$
BEGIN
  IF to_regclass('public.cost_settings') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS cost_settings_user_id_unique
      ON public.cost_settings (user_id);
  END IF;
END
$$;

-- Detail preparation wajib menunjuk preparation dan raw material milik user yang sama.
CREATE OR REPLACE FUNCTION public.biya_validate_preparation_item_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'user_id preparation item tidak sesuai dengan user login.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.preparations p WHERE p.id = NEW.preparation_id AND p.user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Preparation tidak ditemukan atau bukan milik user login.' USING ERRCODE = '42501';
  END IF;
  IF NEW.raw_material_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.raw_material r WHERE r.id = NEW.raw_material_id AND r.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Raw Material tidak ditemukan atau bukan milik user login.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.preparation_items') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS biya_validate_preparation_item_owner ON public.preparation_items;
    CREATE TRIGGER biya_validate_preparation_item_owner
      BEFORE INSERT OR UPDATE ON public.preparation_items
      FOR EACH ROW EXECUTE FUNCTION public.biya_validate_preparation_item_owner();
  END IF;
END
$$;

-- menu_items.ingredient_id bersifat polymorphic; trigger memvalidasi owner parent
-- serta Raw Material/Preparation sesuai ingredient_type.
CREATE OR REPLACE FUNCTION public.biya_validate_menu_item_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  normalized_type text := lower(replace(COALESCE(NEW.ingredient_type, ''), ' ', '_'));
BEGIN
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'user_id menu item tidak sesuai dengan user login.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.menus m WHERE m.id = NEW.menu_id AND m.user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Menu tidak ditemukan atau bukan milik user login.' USING ERRCODE = '42501';
  END IF;
  IF normalized_type = 'raw_material' AND NOT EXISTS (
    SELECT 1 FROM public.raw_material r WHERE r.id::text = NEW.ingredient_id::text AND r.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Raw Material menu tidak ditemukan atau bukan milik user login.' USING ERRCODE = '42501';
  ELSIF normalized_type = 'preparation' AND NOT EXISTS (
    SELECT 1 FROM public.preparations p WHERE p.id::text = NEW.ingredient_id::text AND p.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Preparation menu tidak ditemukan atau bukan milik user login.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.menu_items') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS biya_validate_menu_item_owner ON public.menu_items;
    CREATE TRIGGER biya_validate_menu_item_owner
      BEFORE INSERT OR UPDATE ON public.menu_items
      FOR EACH ROW EXECUTE FUNCTION public.biya_validate_menu_item_owner();
  END IF;
END
$$;

-- Harden trigger delete lama agar pencarian referensi tidak melintasi tenant.
CREATE OR REPLACE FUNCTION public.prevent_referenced_raw_material_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  preparation_names text;
  menu_names text;
BEGIN
  IF OLD.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Raw Material bukan milik user login.' USING ERRCODE = '42501';
  END IF;

  SELECT string_agg(DISTINCT COALESCE(p.nama, pi.preparation_id::text), ', ')
    INTO preparation_names
    FROM public.preparation_items pi
    LEFT JOIN public.preparations p
      ON p.id = pi.preparation_id AND p.user_id = OLD.user_id
   WHERE pi.raw_material_id = OLD.id
     AND pi.user_id = OLD.user_id;

  SELECT string_agg(DISTINCT COALESCE(m.nama, mi.menu_id::text), ', ')
    INTO menu_names
    FROM public.menu_items mi
    LEFT JOIN public.menus m
      ON m.id = mi.menu_id AND m.user_id = OLD.user_id
   WHERE lower(replace(mi.ingredient_type, ' ', '_')) = 'raw_material'
     AND mi.ingredient_id::text = OLD.id::text
     AND mi.user_id = OLD.user_id;

  IF preparation_names IS NOT NULL OR menu_names IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Raw Material masih digunakan pada resep Preparation atau Menu.',
      DETAIL = concat_ws('; ',
        CASE WHEN preparation_names IS NOT NULL THEN 'Preparation: ' || preparation_names END,
        CASE WHEN menu_names IS NOT NULL THEN 'Menu: ' || menu_names END
      );
  END IF;
  RETURN OLD;
END
$$;
REVOKE ALL ON FUNCTION public.prevent_referenced_raw_material_delete() FROM PUBLIC;

-- Ganti RPC usage lama dengan versi authenticated dan tenant-scoped.
DO $migration$
DECLARE
  raw_material_id_type text;
  create_function_sql text;
BEGIN
  IF to_regclass('public.raw_material') IS NULL THEN
    RETURN;
  END IF;
  SELECT pg_catalog.format_type(a.atttypid, a.atttypmod)
    INTO raw_material_id_type
    FROM pg_catalog.pg_attribute a
   WHERE a.attrelid = 'public.raw_material'::regclass
     AND a.attname = 'id' AND a.attnum > 0 AND NOT a.attisdropped;

  create_function_sql := format($function$
    CREATE OR REPLACE FUNCTION public.get_raw_material_usage(p_raw_material_id %s)
    RETURNS TABLE (
      used_in_preparation boolean, used_in_menu boolean,
      preparation_count bigint, menu_count bigint,
      preparation_names text[], menu_names text[]
    )
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
    AS $body$
      WITH owned_raw AS (
        SELECT id FROM public.raw_material
         WHERE id = p_raw_material_id AND user_id = auth.uid()
      ),
      preparation_usage AS (
        SELECT DISTINCT pi.preparation_id, COALESCE(p.nama, pi.preparation_id::text) recipe_name
          FROM public.preparation_items pi
          JOIN owned_raw r ON r.id = pi.raw_material_id
          LEFT JOIN public.preparations p ON p.id = pi.preparation_id AND p.user_id = auth.uid()
         WHERE pi.user_id = auth.uid()
      ),
      menu_usage AS (
        SELECT DISTINCT mi.menu_id, COALESCE(m.nama, mi.menu_id::text) recipe_name
          FROM public.menu_items mi
          JOIN owned_raw r ON mi.ingredient_id::text = r.id::text
          LEFT JOIN public.menus m ON m.id = mi.menu_id AND m.user_id = auth.uid()
         WHERE mi.user_id = auth.uid()
           AND lower(replace(mi.ingredient_type, ' ', '_')) = 'raw_material'
      )
      SELECT EXISTS (SELECT 1 FROM preparation_usage), EXISTS (SELECT 1 FROM menu_usage),
             (SELECT count(*) FROM preparation_usage), (SELECT count(*) FROM menu_usage),
             COALESCE(ARRAY(SELECT recipe_name FROM preparation_usage ORDER BY recipe_name), ARRAY[]::text[]),
             COALESCE(ARRAY(SELECT recipe_name FROM menu_usage ORDER BY recipe_name), ARRAY[]::text[]);
    $body$;
  $function$, raw_material_id_type);
  EXECUTE create_function_sql;
  EXECUTE format('REVOKE ALL ON FUNCTION public.get_raw_material_usage(%s) FROM PUBLIC', raw_material_id_type);
  EXECUTE format('REVOKE ALL ON FUNCTION public.get_raw_material_usage(%s) FROM anon', raw_material_id_type);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.get_raw_material_usage(%s) TO authenticated', raw_material_id_type);
END
$migration$;

-- Storage: object key harus diawali UUID user, misalnya
-- {user_id}/logos/logo.png atau {user_id}/menu/{file}.png.
DROP POLICY IF EXISTS "BIYA users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "BIYA users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "BIYA users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "BIYA users can delete own files" ON storage.objects;

CREATE POLICY "BIYA users can view own files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('business-logos', 'menu-photos', 'user-exports')
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
CREATE POLICY "BIYA users can upload own files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('business-logos', 'menu-photos', 'user-exports')
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
CREATE POLICY "BIYA users can update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('business-logos', 'menu-photos', 'user-exports')
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id IN ('business-logos', 'menu-photos', 'user-exports')
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
CREATE POLICY "BIYA users can delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('business-logos', 'menu-photos', 'user-exports')
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

commit;

-- BACKFILL MANUAL (jangan jalankan tanpa menentukan owner yang benar):
-- update public.raw_material set user_id = '<auth-user-uuid>' where user_id is null;
-- Ulangi untuk tabel parent, lalu tabel detail. Untuk akun demo gunakan UUID akun
-- demo Supabase, bukan UUID hardcoded di frontend.
