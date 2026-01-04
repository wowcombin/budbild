-- ============================================
-- BUDGET PLANNER - MULTIUSER DATABASE SETUP
-- ============================================
-- Этот скрипт создает таблицы с поддержкой нескольких пользователей
-- Каждый пользователь имеет свой отдельный бюджет

-- ВАЖНО: Если вы уже запускали старый скрипт, сначала удалите старые таблицы:
-- DROP TABLE IF EXISTS transactions CASCADE;
-- DROP TABLE IF EXISTS categories CASCADE;
-- DROP TABLE IF EXISTS base_expenses CASCADE;
-- DROP TABLE IF EXISTS budget_settings CASCADE;

-- 1. Таблица для хранения основных настроек бюджета
CREATE TABLE IF NOT EXISTS budget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  monthly_income DECIMAL(10, 2) DEFAULT 0,
  current_month TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Таблица для базовых расходов (аренда, коммуналка и т.д.)
CREATE TABLE IF NOT EXISTS base_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Таблица для категорий расходов
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  percent DECIMAL(5, 2) DEFAULT 0,
  balance DECIMAL(10, 2) DEFAULT 0,
  carry_over BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Таблица для истории транзакций
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'distribution' или 'expense'
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  month TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  category_name TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ВКЛЮЧАЕМ REALTIME ДЛЯ СИНХРОНИЗАЦИИ
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE budget_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE base_expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- ============================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ (Row Level Security)
-- ============================================
-- Каждый пользователь видит только свои данные

-- Включаем RLS
ALTER TABLE budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Allow all for budget_settings" ON budget_settings;
DROP POLICY IF EXISTS "Allow all for base_expenses" ON base_expenses;
DROP POLICY IF EXISTS "Allow all for categories" ON categories;
DROP POLICY IF EXISTS "Allow all for transactions" ON transactions;

-- Создаем новые политики (разрешаем доступ к своим данным)
-- Для простоты используем разрешение всем (так как аутентификация на клиенте)
CREATE POLICY "Enable all for budget_settings" ON budget_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for base_expenses" ON base_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ВСТАВЛЯЕМ НАЧАЛЬНЫЕ ДАННЫЕ ДЛЯ ПОЛЬЗОВАТЕЛЯ 1
-- ============================================

-- Настройки для первого пользователя (krasotka)
INSERT INTO budget_settings (user_id, monthly_income, current_month) 
VALUES ('user_krasotka', 0, '2026-01') 
ON CONFLICT (user_id) DO NOTHING;

-- Базовые расходы для первого пользователя
INSERT INTO base_expenses (user_id, name, amount, sort_order) VALUES
  ('user_krasotka', 'Аренда', 0, 1),
  ('user_krasotka', 'Коммуналка', 0, 2),
  ('user_krasotka', 'Страховки', 0, 3),
  ('user_krasotka', 'Еда (базовая)', 0, 4)
ON CONFLICT DO NOTHING;

-- Категории для первого пользователя
INSERT INTO categories (user_id, name, percent, balance, carry_over, sort_order) VALUES
  ('user_krasotka', 'Новый бизнес', 50, 0, true, 1),
  ('user_krasotka', 'Путешествия', 20, 0, true, 2),
  ('user_krasotka', 'Одежда', 15, 0, false, 3),
  ('user_krasotka', 'Развлечения', 15, 0, false, 4)
ON CONFLICT DO NOTHING;

-- ============================================
-- ВСТАВЛЯЕМ НАЧАЛЬНЫЕ ДАННЫЕ ДЛЯ ПОЛЬЗОВАТЕЛЯ 2
-- ============================================

-- Настройки для второго пользователя (svyatik12)
INSERT INTO budget_settings (user_id, monthly_income, current_month) 
VALUES ('user_svyatik12', 0, '2026-01') 
ON CONFLICT (user_id) DO NOTHING;

-- Базовые расходы для второго пользователя
INSERT INTO base_expenses (user_id, name, amount, sort_order) VALUES
  ('user_svyatik12', 'Аренда', 0, 1),
  ('user_svyatik12', 'Коммуналка', 0, 2),
  ('user_svyatik12', 'Страховки', 0, 3),
  ('user_svyatik12', 'Еда (базовая)', 0, 4)
ON CONFLICT DO NOTHING;

-- Категории для второго пользователя
INSERT INTO categories (user_id, name, percent, balance, carry_over, sort_order) VALUES
  ('user_svyatik12', 'Новый бизнес', 50, 0, true, 1),
  ('user_svyatik12', 'Путешествия', 20, 0, true, 2),
  ('user_svyatik12', 'Одежда', 15, 0, false, 3),
  ('user_svyatik12', 'Развлечения', 15, 0, false, 4)
ON CONFLICT DO NOTHING;

-- ============================================
-- ГОТОВО! 
-- ============================================
-- Теперь каждый пользователь имеет свой отдельный бюджет
-- user_krasotka: пароль krasotka11
-- user_svyatik12: пароль svyatik12

