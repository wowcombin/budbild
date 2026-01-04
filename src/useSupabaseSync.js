import { useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';

// Хук для синхронизации с Supabase
export function useSupabaseSync(userId, data, setData) {
  const initialized = useRef(false);
  const saveTimeout = useRef(null);
  const isLoading = useRef(false);

  // Загрузка данных при монтировании
  useEffect(() => {
    if (!userId || initialized.current) return;
    initialized.current = true;
    isLoading.current = true;

    const loadData = async () => {
      console.log('🔄 Загрузка данных для пользователя:', userId);
      
      try {
        // Пробуем загрузить из Supabase
        const [settingsRes, expensesRes, catsRes, transRes] = await Promise.all([
          supabase.from('budget_settings').select('*').eq('user_id', userId).maybeSingle(),
          supabase.from('base_expenses').select('*').eq('user_id', userId).order('sort_order'),
          supabase.from('categories').select('*').eq('user_id', userId).order('sort_order'),
          supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false })
        ]);

        const settings = settingsRes.data;
        const expenses = expensesRes.data;
        const cats = catsRes.data;
        const trans = transRes.data;

        // Проверяем есть ли данные в Supabase
        const hasSupabaseData = settings || (expenses && expenses.length > 0) || (cats && cats.length > 0);

        if (hasSupabaseData) {
          console.log('✅ Данные загружены из Supabase');
          setData({
            monthlyIncome: settings?.monthly_income?.toString() || '',
            currentMonth: settings?.current_month || new Date().toISOString().slice(0, 7),
            baseExpenses: expenses && expenses.length > 0 ? expenses.map(e => ({
              id: e.id,
              name: e.name,
              amount: e.amount?.toString() || ''
            })) : [
              { id: 1, name: 'Аренда', amount: '' },
              { id: 2, name: 'Коммуналка', amount: '' },
              { id: 3, name: 'Страховки', amount: '' },
              { id: 4, name: 'Еда (базовая)', amount: '' },
            ],
            categories: cats && cats.length > 0 ? cats.map(c => ({
              id: c.id,
              name: c.name,
              percent: c.percent || 0,
              balance: c.balance || 0,
              carryOver: c.carry_over || false,
              isSavings: c.is_savings || false
            })) : [
              { id: 1, name: 'Новый бизнес', percent: 50, balance: 0, carryOver: true, isSavings: true },
              { id: 2, name: 'На черный день', percent: 10, balance: 0, carryOver: true, isSavings: true },
              { id: 3, name: 'Путешествия', percent: 20, balance: 0, carryOver: true, isSavings: false },
              { id: 4, name: 'Одежда', percent: 10, balance: 0, carryOver: false, isSavings: false },
              { id: 5, name: 'Развлечения', percent: 10, balance: 0, carryOver: false, isSavings: false },
            ],
            transactions: trans ? trans.map(t => ({
              id: t.id,
              type: t.type,
              date: t.date,
              month: t.month,
              categoryId: t.category_id,
              categoryName: t.category_name,
              amount: t.amount || 0,
              description: t.description
            })) : [],
            // Загружаем goals из localStorage (не из Supabase)
            goals: (() => {
              try {
                const goalsKey = `budgetGoals_${userId}`;
                const savedGoals = localStorage.getItem(goalsKey);
                return savedGoals ? JSON.parse(savedGoals) : [];
              } catch {
                return [];
              }
            })()
          });
        } else {
          // Если в Supabase пусто - загружаем из localStorage
          console.log('📱 Supabase пуст, загружаем из localStorage');
          const storageKey = `budgetData_${userId}`;
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            setData(parsed);
          }
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки из Supabase:', error);
        // Fallback на localStorage
        const storageKey = `budgetData_${userId}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setData(JSON.parse(saved));
        }
      }
      
      isLoading.current = false;
    };

    loadData();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Сохранение данных при изменении
  useEffect(() => {
    if (!userId || !initialized.current || isLoading.current) return;
    
    // Пропускаем начальные данные
    if (!data.monthlyIncome && data.categories.every(c => c.balance === 0)) {
      return;
    }

    // Дебаунс
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = setTimeout(async () => {
      console.log('💾 Сохранение данных...');
      
      // Сохраняем в localStorage
      const storageKey = `budgetData_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify(data));
      
      // Сохраняем goals отдельно
      const goalsKey = `budgetGoals_${userId}`;
      localStorage.setItem(goalsKey, JSON.stringify(data.goals || []));

      // Сохраняем в Supabase
      try {
        // Настройки бюджета
        await supabase.from('budget_settings').upsert({
          user_id: userId,
          monthly_income: parseFloat(data.monthlyIncome) || 0,
          current_month: data.currentMonth,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

        // Базовые расходы - удаляем старые и добавляем новые
        await supabase.from('base_expenses').delete().eq('user_id', userId);
        if (data.baseExpenses && data.baseExpenses.length > 0) {
          await supabase.from('base_expenses').insert(
            data.baseExpenses.map((exp, index) => ({
              user_id: userId,
              name: exp.name,
              amount: parseFloat(exp.amount) || 0,
              sort_order: index
            }))
          );
        }

        // Категории - удаляем старые и добавляем новые
        await supabase.from('categories').delete().eq('user_id', userId);
        if (data.categories && data.categories.length > 0) {
          await supabase.from('categories').insert(
            data.categories.map((cat, index) => ({
              user_id: userId,
              name: cat.name,
              percent: cat.percent || 0,
              balance: cat.balance || 0,
              carry_over: cat.carryOver || false,
              is_savings: cat.isSavings || false,
              sort_order: index
            }))
          );
        }

        console.log('✅ Данные сохранены в Supabase');
      } catch (error) {
        console.error('❌ Ошибка сохранения в Supabase:', error);
      }
    }, 1000);

    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, [userId, data]);

  // Добавление транзакции
  const addTransactionToSupabase = useCallback(async (transaction) => {
    const newTransaction = {
      id: Date.now(),
      ...transaction
    };

    // Добавляем в локальное состояние
    setData(prev => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions]
    }));

    // Сохраняем в Supabase
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
      console.log('✅ Транзакция сохранена в Supabase');
    } catch (error) {
      console.error('❌ Ошибка сохранения транзакции:', error);
    }
  }, [userId, setData]);

  return { addTransactionToSupabase };
}
