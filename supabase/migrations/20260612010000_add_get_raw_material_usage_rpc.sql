-- Menambahkan RPC read-only untuk memeriksa penggunaan Raw Material sebelum delete.
-- Tipe parameter diambil dari tipe aktual public.raw_material.id saat migration dijalankan.
-- Migration ini tidak dijalankan otomatis oleh aplikasi.

begin;

DO $migration$
DECLARE
  raw_material_id_type text;
  create_function_sql text;
BEGIN
  IF to_regclass('public.raw_material') IS NULL
    OR to_regclass('public.preparation_items') IS NULL
    OR to_regclass('public.menu_items') IS NULL
    OR to_regclass('public.preparations') IS NULL
    OR to_regclass('public.menus') IS NULL THEN
    RAISE EXCEPTION 'Migration dibatalkan: tabel Raw Material atau tabel resep terkait tidak ditemukan.';
  END IF;

  SELECT pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
    INTO raw_material_id_type
    FROM pg_catalog.pg_attribute attribute
   WHERE attribute.attrelid = 'public.raw_material'::regclass
     AND attribute.attname = 'id'
     AND attribute.attnum > 0
     AND NOT attribute.attisdropped;

  IF raw_material_id_type IS NULL THEN
    RAISE EXCEPTION 'Migration dibatalkan: kolom public.raw_material.id tidak ditemukan.';
  END IF;

  create_function_sql := format($function$
    CREATE OR REPLACE FUNCTION public.get_raw_material_usage(
      p_raw_material_id %s
    )
    RETURNS TABLE (
      used_in_preparation boolean,
      used_in_menu boolean,
      preparation_count bigint,
      menu_count bigint,
      preparation_names text[],
      menu_names text[]
    )
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = pg_catalog
    AS $body$
      WITH preparation_usage AS (
        SELECT DISTINCT
          pi.preparation_id,
          COALESCE(p.nama, pi.preparation_id::text) AS recipe_name
        FROM public.preparation_items AS pi
        LEFT JOIN public.preparations AS p ON p.id = pi.preparation_id
        WHERE pi.raw_material_id = p_raw_material_id
      ),
      menu_usage AS (
        SELECT DISTINCT
          mi.menu_id,
          COALESCE(m.nama, mi.menu_id::text) AS recipe_name
        FROM public.menu_items AS mi
        LEFT JOIN public.menus AS m ON m.id = mi.menu_id
        WHERE lower(replace(mi.ingredient_type, ' ', '_')) = 'raw_material'
          AND mi.ingredient_id::text = p_raw_material_id::text
      )
      SELECT
        EXISTS (SELECT 1 FROM preparation_usage),
        EXISTS (SELECT 1 FROM menu_usage),
        (SELECT count(*) FROM preparation_usage),
        (SELECT count(*) FROM menu_usage),
        COALESCE(
          ARRAY(
            SELECT preparation_usage.recipe_name
            FROM preparation_usage
            ORDER BY preparation_usage.recipe_name
          ),
          ARRAY[]::text[]
        ),
        COALESCE(
          ARRAY(
            SELECT menu_usage.recipe_name
            FROM menu_usage
            ORDER BY menu_usage.recipe_name
          ),
          ARRAY[]::text[]
        );
    $body$;
  $function$, raw_material_id_type);

  EXECUTE create_function_sql;
  EXECUTE format(
    'REVOKE EXECUTE ON FUNCTION public.get_raw_material_usage(%s) FROM PUBLIC',
    raw_material_id_type
  );
  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION public.get_raw_material_usage(%s) TO anon',
    raw_material_id_type
  );
END
$migration$;

commit;
