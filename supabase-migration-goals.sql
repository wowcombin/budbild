-- ============================================
-- МИГРАЦИЯ: Обновление таблицы goals
-- ============================================
-- Запустите этот скрипт в Supabase SQL Editor
-- для обновления существующей таблицы goals

-- 1. Добавляем колонку category_name если её нет
ALTER TABLE goals ADD COLUMN IF NOT EXISTS category_name TEXT;

-- 2. Удаляем старую колонку category_id если есть
-- (сначала сохраняем данные)
DO $$ 
BEGIN
  -- Проверяем существует ли колонка category_id
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'goals' AND column_name = 'category_id') THEN
    -- Удаляем старую колонку
    ALTER TABLE goals DROP COLUMN IF EXISTS category_id;
  END IF;
END $$;

-- 3. Делаем category_name обязательной для новых записей
-- (но оставляем NULL для старых пока)

-- 4. Очищаем старые цели с битыми связями
DELETE FROM goals WHERE category_name IS NULL OR category_name = '';

-- ============================================
-- ГОТОВО!
-- ============================================
-- Теперь цели связаны с категориями по ИМЕНИ
-- Это стабильнее чем UUID который меняется при каждом сохранении

