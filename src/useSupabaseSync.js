import { useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';

// Хук для синхронизации с Supabase (с fallback на localStorage)
export function useSupabaseSync(userId, data, setData) {
  const isInitialLoad = useRef(true);
  const supabaseWorking = useRef(false);

  // Загрузка из localStorage
  const loadFromLocalStorage = useCallback(() => {
    try {
      const storageKey = `budgetData_${userId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setData(prev => ({
          ...prev,
          monthlyIncome: parsed.monthlyIncome || '',
          currentMonth: parsed.currentMonth || new Date().toISOString().slice(0, 7),
          baseExpenses: parsed.baseExpenses || prev.baseExpenses,
          categories: parsed.categories || prev.categories,
          transactions: parsed.transactions || [],
          goals: parsed.goals || []
        }));
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }, [userId, setData]);

  // Сохранение в localStorage
  const saveToLocalStorage = useCallback(() => {
    try {
      const storageKey = `budgetData_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [userId, data]);

  // Загрузка из Supabase
  const loadFromSupabase = useCallback(async () => {
    if (!userId) return false;

    try {
      // Проверяем доступность Supabase
      const { data: settings, error: settingsError } = await supabase
        .from('budget_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (settingsError) {
        console.log('Supabase not available, using localStorage:', settingsError.message);
        return false;
      }

      // Загружаем остальные данные
      const { data: expenses } = await supabase
        .from('base_expenses')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order');

      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order');

      const { data: trans } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      // Если есть данные из БД
      if (settings || (expenses && expenses.length > 0) || (cats && cats.length > 0)) {
        supabaseWorking.current = true;
        
        setData(prev => ({
          monthlyIncome: settings?.monthly_income?.toString() || prev.monthlyIncome || '',
          currentMonth: settings?.current_month || prev.currentMonth || new Date().toISOString().slice(0, 7),
          baseExpenses: (expenses && expenses.length > 0) ? expenses.map(e => ({
            id: e.id,
            name: e.name,
            amount: e.amount?.toString() || ''
          })) : prev.baseExpenses,
          categories: (cats && cats.length > 0) ? cats.map(c => ({
            id: c.id,
            name: c.name,
            percent: c.percent || 0,
            balance: c.balance || 0,
            carryOver: c.carry_over || false
          })) : prev.categories,
          transactions: trans ? trans.map(t => ({
            id: t.id,
            type: t.type,
            date: t.date,
            month: t.month,
            categoryId: t.category_id,
            categoryName: t.category_name,
            amount: t.amount || 0,
            description: t.description
          })) : prev.transactions,
          goals: prev.goals || []
        }));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error loading from Supabase:', error);
      return false;
    }
  }, [userId, setData]);

  // Сохранение в Supabase
  const saveToSupabase = useCallback(async () => {
    if (!userId || !data || isInitialLoad.current) return;

    // Всегда сохраняем в localStorage как backup
    saveToLocalStorage();

    // Если Supabase не работает, не пытаемся сохранять
    if (!supabaseWorking.current) return;

    try {
      // Сохраняем настройки
      await supabase
        .from('budget_settings')
        .upsert({
          user_id: userId,
          monthly_income: parseFloat(data.monthlyIncome) || 0,
          current_month: data.currentMonth,
          updated_at: new Date().toISOString()
        });

      // Удаляем и добавляем базовые расходы
      await supabase.from('base_expenses').delete().eq('user_id', userId);
      if (data.baseExpenses?.length > 0) {
        await supabase.from('base_expenses').insert(
          data.baseExpenses.map((exp, index) => ({
            user_id: userId,
            name: exp.name,
            amount: parseFloat(exp.amount) || 0,
            sort_order: index
          }))
        );
      }

      // Удаляем и добавляем категории
      await supabase.from('categories').delete().eq('user_id', userId);
      if (data.categories?.length > 0) {
        await supabase.from('categories').insert(
          data.categories.map((cat, index) => ({
            user_id: userId,
            name: cat.name,
            percent: cat.percent || 0,
            balance: cat.balance || 0,
            carry_over: cat.carryOver || false,
            sort_order: index
          }))
        );
      }
    } catch (error) {
      console.error('Error saving to Supabase:', error);
    }
  }, [userId, data, saveToLocalStorage]);

  // Добавление транзакции
  const addTransactionToSupabase = useCallback(async (transaction) => {
    // Добавляем в локальное состояние сразу
    setData(prev => ({
      ...prev,
      transactions: [{
        id: Date.now(),
        ...transaction
      }, ...prev.transactions]
    }));

    // Если Supabase работает, добавляем туда тоже
    if (supabaseWorking.current) {
      try {
        await supabase.from('transactions').insert({
          user_id: userId,
          type: transaction.type,
          date: transaction.date,
          month: transaction.month,
          category_id: transaction.categoryId,
          category_name: transaction.categoryName,
          amount: transaction.amount,
          description: transaction.description
        });
      } catch (error) {
        console.error('Error adding transaction to Supabase:', error);
      }
    }
  }, [userId, setData]);

  // Инициализация при монтировании
  useEffect(() => {
    if (!userId) return;

    const init = async () => {
      // Сначала загружаем из localStorage (быстро)
      loadFromLocalStorage();
      
      // Затем пробуем Supabase
      const supabaseLoaded = await loadFromSupabase();
      
      if (supabaseLoaded) {
        console.log('✅ Supabase синхронизация активна');
      } else {
        console.log('📱 Локальный режим (выполните SQL скрипт для синхронизации)');
      }
      
      isInitialLoad.current = false;
    };

    init();
  }, [userId, loadFromLocalStorage, loadFromSupabase]);

  return { saveToSupabase, addTransactionToSupabase };
}
