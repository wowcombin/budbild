import { useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

// Простой и надежный хук для синхронизации
export function useSupabaseSync(userId, data, setData) {
  const initialized = useRef(false);
  const saveTimeout = useRef(null);

  // Загрузка данных ОДИН РАЗ при монтировании
  useEffect(() => {
    if (!userId || initialized.current) return;
    initialized.current = true;

    // Загружаем из localStorage
    const storageKey = `budgetData_${userId}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData({
          monthlyIncome: parsed.monthlyIncome || '',
          currentMonth: parsed.currentMonth || new Date().toISOString().slice(0, 7),
          baseExpenses: parsed.baseExpenses || [
            { id: 1, name: 'Аренда', amount: '' },
            { id: 2, name: 'Коммуналка', amount: '' },
            { id: 3, name: 'Страховки', amount: '' },
            { id: 4, name: 'Еда (базовая)', amount: '' },
          ],
          categories: parsed.categories || [
            { id: 1, name: 'Новый бизнес', percent: 50, balance: 0, carryOver: true },
            { id: 2, name: 'Путешествия', percent: 20, balance: 0, carryOver: true },
            { id: 3, name: 'Одежда', percent: 15, balance: 0, carryOver: false },
            { id: 4, name: 'Развлечения', percent: 15, balance: 0, carryOver: false },
          ],
          transactions: parsed.transactions || [],
          goals: parsed.goals || []
        });
        console.log('📱 Данные загружены из localStorage');
      } catch (e) {
        console.error('Ошибка чтения localStorage:', e);
      }
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Сохранение в localStorage при каждом изменении data
  useEffect(() => {
    if (!userId || !initialized.current) return;

    // Дебаунс - ждем 500ms перед сохранением
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = setTimeout(() => {
      const storageKey = `budgetData_${userId}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
        console.log('💾 Данные сохранены в localStorage');
      } catch (e) {
        console.error('Ошибка сохранения в localStorage:', e);
      }
    }, 500);

    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, [userId, data]);

  // Пустые функции-заглушки (Supabase пока отключен)
  const saveToSupabase = async () => {
    // Ничего не делаем - все сохраняется в localStorage
  };

  const addTransactionToSupabase = async (transaction) => {
    // Просто добавляем транзакцию в локальное состояние
    setData(prev => ({
      ...prev,
      transactions: [{
        id: Date.now(),
        ...transaction
      }, ...prev.transactions]
    }));
  };

  return { saveToSupabase, addTransactionToSupabase };
}
