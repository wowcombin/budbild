-- ============================================
-- BUDGET PLANNER - DATABASE SETUP
-- ============================================
-- Этот скрипт создает все необходимые таблицы для приложения

-- 1. Таблица для хранения основных настроек бюджета
CREATE TABLE IF NOT EXISTS budget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_income DECIMAL(10, 2) DEFAULT 0,
  current_month TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Таблица для базовых расходов (аренда, коммуналка и т.д.)
CREATE TABLE IF NOT EXISTS base_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Таблица для категорий расходов
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- Это позволит обоим пользователям видеть изменения в реальном времени

ALTER PUBLICATION supabase_realtime ADD TABLE budget_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE base_expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- ============================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ (Row Level Security)
-- ============================================
-- Разрешаем всем читать и писать (так как у нас общий бюджет)

-- Включаем RLS
ALTER TABLE budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Создаем политики (разрешаем все операции для всех)
CREATE POLICY "Allow all for budget_settings" ON budget_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for base_expenses" ON base_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ВСТАВЛЯЕМ НАЧАЛЬНЫЕ ДАННЫЕ
-- ============================================

-- Создаем запись с настройками по умолчанию
INSERT INTO budget_settings (monthly_income, current_month) 
VALUES (0, '2026-01') 
ON CONFLICT DO NOTHING;

-- Создаем базовые расходы по умолчанию
INSERT INTO base_expenses (name, amount, sort_order) VALUES
  ('Аренда', 0, 1),
  ('Коммуналка', 0, 2),
  ('Страховки', 0, 3),
  ('Еда (базовая)', 0, 4)
ON CONFLICT DO NOTHING;

-- Создаем категории по умолчанию
INSERT INTO categories (name, percent, balance, carry_over, sort_order) VALUES
  ('Новый бизнес', 50, 0, true, 1),
  ('Путешествия', 20, 0, true, 2),
  ('Одежда', 15, 0, false, 3),
  ('Развлечения', 15, 0, false, 4)
ON CONFLICT DO NOTHING;

