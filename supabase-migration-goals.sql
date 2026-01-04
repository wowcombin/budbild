-- ============================================
-- МИГРАЦИЯ: Обновление таблиц goals и transactions
-- ============================================
-- Запустите этот скрипт в Supabase SQL Editor

-- =========== ЦЕЛИ ===========
-- 1. Добавляем колонку category_name если её нет
ALTER TABLE goals ADD COLUMN IF NOT EXISTS category_name TEXT;

-- 2. Удаляем старую колонку category_id если есть
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'goals' AND column_name = 'category_id') THEN
    ALTER TABLE goals DROP COLUMN IF EXISTS category_id;
  END IF;
END $$;

-- 3. Очищаем старые цели с битыми связями
DELETE FROM goals WHERE category_name IS NULL OR category_name = '';

-- =========== ТРАНЗАКЦИИ ===========
-- 4. Добавляем колонку refund_pending для возвратов
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_pending BOOLEAN DEFAULT FALSE;

-- ============================================
-- ГОТОВО!
-- ============================================
-- Теперь:
-- - Цели связаны с категориями по ИМЕНИ (стабильнее чем UUID)
-- - Транзакции можно помечать на возврат

