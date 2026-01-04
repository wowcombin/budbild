import { useEffect } from 'react';
import { supabase } from './supabaseClient';

// Простой хук для синхронизации с Supabase
export function useSupabaseSync(userId, data, setData) {
  // Загрузка данных из Supabase при монтировании
  useEffect(() => {
    if (!userId) return;

    loadFromSupabase();

    // Подписка на изменения в реальном времени
    const channel = supabase
      .channel(`budget_changes_${userId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'budget_settings', filter: `user_id=eq.${userId}` }, 
        () => loadFromSupabase()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'base_expenses', filter: `user_id=eq.${userId}` }, 
        () => loadFromSupabase()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` }, 
        () => loadFromSupabase()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` }, 
        () => loadFromSupabase()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  // Загрузка данных из Supabase
  const loadFromSupabase = async () => {
    try {
      // Загружаем настройки
      const { data: settings } = await supabase
        .from('budget_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Загружаем базовые расходы
      const { data: expenses } = await supabase
        .from('base_expenses')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order');

      // Загружаем категории
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order');

      // Загружаем транзакции
      const { data: trans } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      // Обновляем состояние если есть данные из БД
      if (settings || expenses || cats || trans) {
        const newData = {
          monthlyIncome: settings?.monthly_income?.toString() || data.monthlyIncome || '',
          currentMonth: settings?.current_month || data.currentMonth || new Date().toISOString().slice(0, 7),
          baseExpenses: expenses?.map(e => ({
            id: e.id,
            name: e.name,
            amount: e.amount?.toString() || ''
          })) || data.baseExpenses || [],
          categories: cats?.map(c => ({
            id: c.id,
            name: c.name,
            percent: c.percent || 0,
            balance: c.balance || 0,
            carryOver: c.carry_over || false
          })) || data.categories || [],
          transactions: trans?.map(t => ({
            id: t.id,
            type: t.type,
            date: t.date,
            month: t.month,
            categoryId: t.category_id,
            categoryName: t.category_name,
            amount: t.amount || 0,
            description: t.description
          })) || data.transactions || [],
          goals: data.goals || []
        };
        
        setData(newData);
      }
    } catch (error) {
      console.error('Error loading from Supabase:', error);
    }
  };

  // Сохранение данных в Supabase
  const saveToSupabase = async () => {
    if (!userId || !data) return;

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

      // Удаляем старые базовые расходы
      await supabase.from('base_expenses').delete().eq('user_id', userId);
      
      // Добавляем новые базовые расходы
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

      // Удаляем старые категории
      await supabase.from('categories').delete().eq('user_id', userId);
      
      // Добавляем новые категории
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
  };

  // Добавление транзакции
  const addTransactionToSupabase = async (transaction) => {
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
      
      await loadFromSupabase();
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  return { loadFromSupabase, saveToSupabase, addTransactionToSupabase };
}

