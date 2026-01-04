import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export function useBudgetSync() {
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [baseExpenses, setBaseExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Загрузка данных из Supabase при монтировании
  useEffect(() => {
    loadDataFromSupabase();
    
    // Подписка на изменения в реальном времени
    const setupRealtimeSubscriptions = () => {
      // Подписка на изменения настроек
      const settingsChannel = supabase
        .channel('budget_settings_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_settings' }, () => {
          loadSettings();
        })
        .subscribe();

      // Подписка на изменения базовых расходов
      const expensesChannel = supabase
        .channel('base_expenses_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'base_expenses' }, () => {
          loadBaseExpenses();
        })
        .subscribe();

      // Подписка на изменения категорий
      const categoriesChannel = supabase
        .channel('categories_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
          loadCategories();
        })
        .subscribe();

      // Подписка на изменения транзакций
      const transactionsChannel = supabase
        .channel('transactions_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
          loadTransactions();
        })
        .subscribe();

      return () => {
        settingsChannel.unsubscribe();
        expensesChannel.unsubscribe();
        categoriesChannel.unsubscribe();
        transactionsChannel.unsubscribe();
      };
    };

    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
  }, []);

  // Загрузка всех данных
  const loadDataFromSupabase = async () => {
    try {
      await Promise.all([
        loadSettings(),
        loadBaseExpenses(),
        loadCategories(),
        loadTransactions()
      ]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setIsLoading(false);
    }
  };

  // Загрузка настроек
  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('budget_settings')
      .select('*')
      .single();

    if (data && !error) {
      setMonthlyIncome(data.monthly_income?.toString() || '');
      setCurrentMonth(data.current_month || new Date().toISOString().slice(0, 7));
    }
  };

  // Загрузка базовых расходов
  const loadBaseExpenses = async () => {
    const { data, error } = await supabase
      .from('base_expenses')
      .select('*')
      .order('sort_order', { ascending: true });

    if (data && !error) {
      setBaseExpenses(data.map(exp => ({
        id: exp.id,
        name: exp.name,
        amount: exp.amount?.toString() || ''
      })));
    }
  };

  // Загрузка категорий
  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (data && !error) {
      setCategories(data.map(cat => ({
        id: cat.id,
        name: cat.name,
        percent: cat.percent || 0,
        balance: cat.balance || 0,
        carryOver: cat.carry_over || false
      })));
    }
  };

  // Загрузка транзакций
  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (data && !error) {
      setTransactions(data.map(tr => ({
        id: tr.id,
        type: tr.type,
        date: tr.date,
        month: tr.month,
        categoryId: tr.category_id,
        categoryName: tr.category_name,
        amount: tr.amount || 0,
        description: tr.description
      })));
    }
  };

  // Сохранение дохода и месяца
  const saveSettings = async (income, month) => {
    const { data, error } = await supabase
      .from('budget_settings')
      .upsert({
        id: await getSettingsId(),
        monthly_income: parseFloat(income) || 0,
        current_month: month,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (!error) {
      setMonthlyIncome(income);
      setCurrentMonth(month);
    }
    return { data, error };
  };

  // Получение ID настроек (всегда одна запись)
  const getSettingsId = async () => {
    const { data } = await supabase
      .from('budget_settings')
      .select('id')
      .single();
    return data?.id;
  };

  // Сохранение базовых расходов
  const saveBaseExpenses = async (expenses) => {
    // Удаляем все старые
    await supabase.from('base_expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Добавляем новые
    const { error } = await supabase
      .from('base_expenses')
      .insert(
        expenses.map((exp, index) => ({
          id: exp.id,
          name: exp.name,
          amount: parseFloat(exp.amount) || 0,
          sort_order: index
        }))
      );

    if (!error) {
      setBaseExpenses(expenses);
    }
  };

  // Сохранение категорий
  const saveCategories = async (cats) => {
    // Удаляем все старые
    await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Добавляем новые
    const { error } = await supabase
      .from('categories')
      .insert(
        cats.map((cat, index) => ({
          id: cat.id,
          name: cat.name,
          percent: cat.percent || 0,
          balance: cat.balance || 0,
          carry_over: cat.carryOver || false,
          sort_order: index
        }))
      );

    if (!error) {
      setCategories(cats);
    }
  };

  // Добавление транзакции
  const addTransaction = async (transaction) => {
    const { error } = await supabase
      .from('transactions')
      .insert({
        type: transaction.type,
        date: transaction.date,
        month: transaction.month,
        category_id: transaction.categoryId,
        category_name: transaction.categoryName,
        amount: transaction.amount,
        description: transaction.description
      });

    if (!error) {
      await loadTransactions();
    }
  };

  return {
    isLoading,
    monthlyIncome,
    currentMonth,
    baseExpenses,
    categories,
    transactions,
    setMonthlyIncome: (income) => saveSettings(income, currentMonth),
    setCurrentMonth: (month) => saveSettings(monthlyIncome, month),
    setBaseExpenses: saveBaseExpenses,
    setCategories: saveCategories,
    setTransactions: (newTransactions) => setTransactions(newTransactions),
    addTransaction
  };
}

