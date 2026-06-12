-- Jalankan melalui Supabase SQL Editor atau migration pipeline setelah melakukan backup.
-- Migration ini gagal dengan pesan eksplisit bila menemukan preparation_items yatim.

begin;

DO $$
BEGIN
  IF to_regclass('public.raw_material') IS NULL
    OR to_regclass('public.preparation_items') IS NULL
    OR to_regclass('public.menu_items') IS NULL
    OR to_regclass('public.preparations') IS NULL
    OR to_regclass('public.menus') IS NULL THEN
    RAISE EXCEPTION 'Migration dibatalkan: tabel Raw Material atau tabel resep terkait tidak ditemukan.';
  END IF;
END
$$;

lock table public.raw_material in share row exclusive mode;
lock table public.preparation_items in share row exclusive mode;
lock table public.menu_items in share row exclusive mode;

DO $$
DECLARE
  existing_fk_oid oid;
  existing_fk_name name;
  existing_fk_delete_action text;
  existing_fk_validated boolean;
  orphan_count bigint;
BEGIN
  SELECT count(*)
    INTO orphan_count
    FROM public.preparation_items pi
    LEFT JOIN public.raw_material rm ON rm.id = pi.raw_material_id
   WHERE pi.raw_material_id IS NOT NULL
     AND rm.id IS NULL;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Migration dibatalkan: ditemukan % preparation_items dengan raw_material_id yatim. Perbaiki data tersebut sebelum menjalankan ulang migration.', orphan_count;
  END IF;

  SELECT c.oid, c.conname, c.confdeltype::text, c.convalidated
    INTO existing_fk_oid, existing_fk_name, existing_fk_delete_action, existing_fk_validated
    FROM pg_constraint c
    JOIN pg_attribute child_column
      ON child_column.attrelid = c.conrelid
     AND child_column.attnum = ANY (c.conkey)
    JOIN pg_attribute parent_column
      ON parent_column.attrelid = c.confrelid
     AND parent_column.attnum = ANY (c.confkey)
   WHERE c.contype = 'f'
     AND c.conrelid = 'public.preparation_items'::regclass
     AND c.confrelid = 'public.raw_material'::regclass
     AND child_column.attname = 'raw_material_id'
     AND parent_column.attname = 'id'
   LIMIT 1;

  IF existing_fk_oid IS NOT NULL AND existing_fk_delete_action NOT IN ('a', 'r') THEN
    EXECUTE format(
      'ALTER TABLE public.preparation_items DROP CONSTRAINT %I',
      existing_fk_name
    );
    existing_fk_oid := NULL;
  END IF;

  IF existing_fk_oid IS NOT NULL AND NOT existing_fk_validated THEN
    EXECUTE format(
      'ALTER TABLE public.preparation_items VALIDATE CONSTRAINT %I',
      existing_fk_name
    );
  END IF;

  IF existing_fk_oid IS NULL THEN
    ALTER TABLE public.preparation_items
      ADD CONSTRAINT preparation_items_raw_material_id_fkey
      FOREIGN KEY (raw_material_id)
      REFERENCES public.raw_material(id)
      ON DELETE RESTRICT
      NOT VALID;

    ALTER TABLE public.preparation_items
      VALIDATE CONSTRAINT preparation_items_raw_material_id_fkey;
  END IF;
END
$$;

-- menu_items.ingredient_id bersifat polymorphic (Raw Material atau Preparation),
-- sehingga PostgreSQL tidak dapat menerapkan partial foreign key pada kolom itu.
-- Trigger berikut memberi proteksi database ekuivalen khusus untuk Raw Material.
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
  SELECT string_agg(DISTINCT COALESCE(p.nama, pi.preparation_id::text), ', ')
    INTO preparation_names
    FROM public.preparation_items pi
    LEFT JOIN public.preparations p ON p.id = pi.preparation_id
   WHERE pi.raw_material_id = OLD.id;

  SELECT string_agg(DISTINCT COALESCE(m.nama, mi.menu_id::text), ', ')
    INTO menu_names
    FROM public.menu_items mi
    LEFT JOIN public.menus m ON m.id = mi.menu_id
   WHERE lower(replace(mi.ingredient_type, ' ', '_')) = 'raw_material'
     AND mi.ingredient_id::text = OLD.id::text;

  IF preparation_names IS NOT NULL OR menu_names IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Raw Material masih digunakan pada resep Preparation atau Menu.',
      DETAIL = concat_ws('; ',
        CASE WHEN preparation_names IS NOT NULL THEN 'Preparation: ' || preparation_names END,
        CASE WHEN menu_names IS NOT NULL THEN 'Menu: ' || menu_names END
      ),
      HINT = 'Hapus atau ganti komponen resep terkait sebelum menghapus Raw Material.';
  END IF;

  RETURN OLD;
END
$$;

REVOKE ALL ON FUNCTION public.prevent_referenced_raw_material_delete() FROM PUBLIC;

DROP TRIGGER IF EXISTS protect_referenced_raw_material_delete ON public.raw_material;
CREATE TRIGGER protect_referenced_raw_material_delete
BEFORE DELETE ON public.raw_material
FOR EACH ROW
EXECUTE FUNCTION public.prevent_referenced_raw_material_delete();

commit;
