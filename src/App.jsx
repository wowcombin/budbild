import { useState, useEffect } from 'react';
import { useSupabaseSync } from './useSupabaseSync';
import './App.css';

function App({ onLogout, currentUser }) {
  // Все данные в одном объекте для синхронизации
  const [data, setData] = useState({
    monthlyIncome: '',
    currentMonth: new Date().toISOString().slice(0, 7),
    baseExpenses: [
      { id: 1, name: 'Аренда', amount: '' },
      { id: 2, name: 'Коммуналка', amount: '' },
      { id: 3, name: 'Страховки', amount: '' },
      { id: 4, name: 'Еда (базовая)', amount: '' },
    ],
    categories: [
      { id: 1, name: 'Новый бизнес', percent: 50, balance: 0, carryOver: true, isSavings: true },
      { id: 2, name: 'На черный день', percent: 10, balance: 0, carryOver: true, isSavings: true },
      { id: 3, name: 'Путешествия', percent: 20, balance: 0, carryOver: true, isSavings: false },
      { id: 4, name: 'Одежда', percent: 10, balance: 0, carryOver: false, isSavings: false },
      { id: 5, name: 'Развлечения', percent: 10, balance: 0, carryOver: false, isSavings: false },
    ],
    transactions: [],
    goals: []
  });
  
  // UI состояния
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const TRANSACTIONS_PER_PAGE = 20;
  
  // Подключаем синхронизацию (localStorage + Supabase в будущем)
  const { addTransactionToSupabase } = useSupabaseSync(currentUser.id, data, setData);
  
  // Удобные геттеры
  const monthlyIncome = data.monthlyIncome;
  const currentMonth = data.currentMonth;
  const baseExpenses = data.baseExpenses;
  const categories = data.categories;
  const transactions = data.transactions;
  const goals = data.goals;
  
  // Удобные сеттеры (используем функциональную форму!)
  const setMonthlyIncome = (value) => setData(prev => ({...prev, monthlyIncome: value}));
  const setCurrentMonth = (value) => setData(prev => ({...prev, currentMonth: value}));
  const setBaseExpenses = (value) => setData(prev => ({...prev, baseExpenses: value}));
  const setCategories = (value) => setData(prev => ({...prev, categories: value}));
  const setTransactions = (value) => setData(prev => ({...prev, transactions: value}));
  const setGoals = (value) => setData(prev => ({...prev, goals: value}));

  // Сохранение происходит автоматически в хуке useSupabaseSync

  // Расчеты
  const totalBaseExpenses = baseExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  const remainingAfterBase = (parseFloat(monthlyIncome) || 0) - totalBaseExpenses;
  
  // Общее накопление - сумма всех положительных балансов в категориях
  const totalSavings = categories.reduce((sum, cat) => sum + Math.max(0, cat.balance), 0);
  
  // Сумма всех процентов (для проверки)
  const totalPercent = categories.reduce((sum, cat) => sum + (cat.percent || 0), 0);
  
  // Расчет суммы для категории по её проценту
  const getAmountForCategory = (cat) => {
    return remainingAfterBase * (cat.percent / 100);
  };

  // Добавление базового расхода
  const addBaseExpense = () => {
    setBaseExpenses([...baseExpenses, { id: Date.now(), name: '', amount: '' }]);
  };

  // Удаление базового расхода
  const removeBaseExpense = (id) => {
    setBaseExpenses(baseExpenses.filter(exp => exp.id !== id));
  };

  // Обновление базового расхода
  const updateBaseExpense = (id, field, value) => {
    setBaseExpenses(baseExpenses.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    ));
  };

  // Добавление категории
  const addCategory = () => {
    setCategories([...categories, { 
      id: Date.now(), 
      name: '', 
      percent: 0, 
      balance: 0,
      carryOver: false 
    }]);
  };

  // Удаление категории
  const removeCategory = (id) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };

  // Обновление категории
  const updateCategory = (id, field, value) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, [field]: value } : cat
    ));
  };

  // Распределение бюджета
  const distributeBudget = async () => {
    if (remainingAfterBase <= 0) {
      alert('Доход должен быть больше базовых расходов!');
      return;
    }

    // Проверяем количество распределений в текущем месяце (максимум 2)
    const distributionsThisMonth = transactions.filter(
      tr => tr.type === 'distribution' && tr.month === currentMonth
    ).length;
    
    if (distributionsThisMonth >= 2) {
      alert(`Вы уже распределили бюджет ${distributionsThisMonth} раз(а) в этом месяце.\nМаксимум 2 распределения в месяц.`);
      return;
    }

    const newCategories = categories.map((cat) => {
      // Каждая категория получает свой процент от остатка
      const allocated = getAmountForCategory(cat);
      
      // Если категория переносится, добавляем к текущему балансу (может быть отрицательным)
      // Если не переносится, устанавливаем новую сумму
      return {
        ...cat,
        balance: cat.carryOver ? cat.balance + allocated : allocated
      };
    });

    setCategories(newCategories);
    
    // Добавляем транзакцию о распределении через Supabase
    await addTransactionToSupabase({
      type: 'distribution',
      date: new Date().toISOString(),
      month: currentMonth,
      amount: remainingAfterBase,
      description: `Распределение бюджета за ${currentMonth}`
    });

    // Показываем информацию о дефицитах
    const deficits = newCategories.filter(cat => cat.balance < 0);
    if (deficits.length > 0) {
      const deficitInfo = deficits.map(cat => 
        `${cat.name}: ${cat.balance.toLocaleString('de-DE')} €`
      ).join('\n');
      alert(`Бюджет распределен!\n\n⚠️ Категории с дефицитом:\n${deficitInfo}`);
    } else {
      alert('Бюджет успешно распределен!');
    }
  };

  // Добавление расхода
  const addTransaction = async (categoryId, amount, description) => {
    const numAmount = parseFloat(amount);
    const category = categories.find(c => c.id === categoryId);
    
    if (!category) return;

    // Обновляем баланс категории (может уйти в минус - дефицит)
    const newCategories = categories.map(cat => 
      cat.id === categoryId 
        ? { ...cat, balance: cat.balance - numAmount }
        : cat
    );
    setCategories(newCategories);

    // Добавляем транзакцию через Supabase
    const transaction = {
      type: 'expense',
      date: new Date().toISOString(),
      month: currentMonth,
      categoryId,
      categoryName: category.name,
      amount: numAmount,
      description
    };

    await addTransactionToSupabase(transaction);
    setShowAddExpense(false);
  };

  // Переход на новый месяц
  const moveToNextMonth = () => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() + 1);
    const newMonth = date.toISOString().slice(0, 7);
    
    const updatedCategories = categories.map(cat => ({
      ...cat,
      balance: cat.carryOver ? cat.balance : 0
    }));
    
    setCategories(updatedCategories);
    setCurrentMonth(newMonth);
    alert(`Переход на ${newMonth}`);
  };

  // Добавление цели
  const addGoal = (goalData) => {
    const newGoal = {
      id: Date.now(),
      ...goalData,
      createdAt: new Date().toISOString(),
      startBalance: categories.find(c => c.id === parseInt(goalData.categoryId))?.balance || 0
    };
    setGoals([...goals, newGoal]);
    setShowAddGoal(false);
  };

  // Удаление цели
  const deleteGoal = (goalId) => {
    if (confirm('Удалить эту цель?')) {
      setGoals(goals.filter(g => g.id !== goalId));
    }
  };

  // Расчет прогресса цели
  const calculateGoalProgress = (goal) => {
    const category = categories.find(c => c.id === parseInt(goal.categoryId));
    if (!category) return { progress: 0, remaining: goal.targetAmount, percent: 0, daysLeft: 0, weeksLeft: 0 };

    const currentBalance = category.balance;
    const progress = currentBalance - goal.startBalance;
    const remaining = goal.targetAmount - progress;
    const percent = Math.min((progress / goal.targetAmount) * 100, 100);

    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    const daysLeft = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    const weeksLeft = Math.ceil(daysLeft / 7);

    return { progress, remaining, percent, daysLeft, weeksLeft, currentBalance };
  };

  // Мотивационное сообщение
  const getMotivationalMessage = (percent) => {
    if (percent >= 100) return { text: 'Цель достигнута! 🎉', emoji: '🏆', color: '#4caf50' };
    if (percent >= 75) return { text: 'Почти у цели! 💪', emoji: '🔥', color: '#ff9800' };
    if (percent >= 50) return { text: 'Отличный прогресс! 🚀', emoji: '⭐', color: '#2196f3' };
    if (percent >= 25) return { text: 'Продолжай в том же духе! 👍', emoji: '💫', color: '#9c27b0' };
    return { text: 'Начало положено! 🎯', emoji: '🌱', color: '#607d8b' };
  };

  // Группировка транзакций по датам
  const groupTransactionsByDate = (transactions) => {
    const grouped = {};
    
    [...transactions].reverse().forEach(tr => {
      const date = new Date(tr.date);
      const dateKey = date.toLocaleDateString('ru-RU', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      });
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(tr);
    });
    
    return grouped;
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
      <div>
          <h1>💰 Планировщик Бюджета</h1>
          <p>
            <span style={{ fontWeight: 'bold', color: '#5c6bc0' }}>{currentUser.displayName}</span>
            <span style={{ margin: '0 0.5rem', color: '#ccc' }}>•</span>
            Месяц: {currentMonth}
          </p>
      </div>
        <button onClick={onLogout} className="btn btn-secondary" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
          🚪 Выход
        </button>
      </header>

      {/* Navigation */}
      <nav className="nav">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          📊 Обзор
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`nav-btn ${activeTab === 'goals' ? 'active' : ''}`}
        >
          🎯 Цели
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
        >
          ⚙️ Настройки
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`}
        >
          📜 История
        </button>
      </nav>

      {/* Main Content */}
      <main className="container">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Summary Cards */}
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              <div className="stat-card">
                <h3>Доход за месяц</h3>
                <div className="amount income">
                  {parseFloat(monthlyIncome || 0).toLocaleString('de-DE')} €
                </div>
              </div>
              <div className="stat-card">
                <h3>Базовые расходы</h3>
                <div className="amount expense">
                  {totalBaseExpenses.toLocaleString('de-DE')} €
                </div>
              </div>
              <div className="stat-card">
                <h3>Остаток для распределения</h3>
                <div className="amount balance">
                  {remainingAfterBase.toLocaleString('de-DE')} €
                </div>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)', color: 'white' }}>
                <h3 style={{ color: 'rgba(255,255,255,0.9)' }}>💰 Общее накопление</h3>
                <div className="amount" style={{ color: 'white' }}>
                  {totalSavings.toLocaleString('de-DE')} €
                </div>
              </div>
            </div>

            {/* Distribute Button */}
            <div className="card">
              <button onClick={distributeBudget} className="btn btn-primary btn-full">
                🔄 Распределить бюджет
              </button>
            </div>

            {/* Categories */}
            <div className="card">
              <div className="card-header">
                <h2>Категории расходов</h2>
                <button onClick={() => setShowAddExpense(true)} className="btn btn-success">
                  + Добавить расход
                </button>
              </div>
              <div>
                {categories.map((cat, index) => {
                  // Расчет ожидаемой суммы при распределении
                  const expectedAmount = getAmountForCategory(cat);
                  
                  return (
                    <div key={cat.id} className="category-item">
                      <div className="category-header">
                        <div className="category-info">
                          <h3>{cat.name}</h3>
                          <p style={{ fontSize: '0.875rem', color: '#666' }}>
                            {cat.carryOver ? '♻️ Переносится на следующий месяц' : '📅 Сбрасывается каждый месяц'}
                          </p>
                          {/* Показываем ожидаемую сумму при распределении */}
                          <p style={{ fontSize: '0.875rem', color: '#4caf50' }}>
                            📊 При распределении: +{expectedAmount.toLocaleString('de-DE')} €
                          </p>
                          {cat.balance < 0 && (
                            <p style={{ fontSize: '0.875rem', color: '#f44336', fontWeight: 'bold' }}>
                              ⚠️ Дефицит - будет покрыт в следующем месяце
                            </p>
                          )}
                        </div>
                        <div className="category-balance">
                          <div className="amount" style={{ color: cat.balance < 0 ? '#f44336' : '#5c6bc0' }}>
                            {cat.balance.toLocaleString('de-DE')} €
                          </div>
                          <div className="percent">{cat.percent}%</div>
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ 
                            width: `${Math.min(Math.max((cat.balance / expectedAmount) * 100, 0), 100)}%`,
                            backgroundColor: cat.balance < 0 ? '#f44336' : '#5c6bc0'
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Next Month Button */}
            <button onClick={moveToNextMonth} className="btn btn-secondary btn-full">
              ⏭️ Перейти к следующему месяцу
            </button>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            {/* Income */}
            <div className="card">
              <h2>💵 Месячный доход</h2>
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                placeholder="Введите ваш доход"
                className="input"
              />
            </div>

            {/* Base Expenses */}
            <div className="card">
              <div className="card-header">
                <h2>🏠 Базовые расходы</h2>
                <button onClick={addBaseExpense} className="btn btn-primary">
                  + Добавить
                </button>
              </div>
              <div>
                {baseExpenses.map(exp => (
                  <div key={exp.id} className="expense-item">
                    <input
                      type="text"
                      value={exp.name}
                      onChange={(e) => updateBaseExpense(exp.id, 'name', e.target.value)}
                      placeholder="Название"
                      className="input"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      value={exp.amount}
                      onChange={(e) => updateBaseExpense(exp.id, 'amount', e.target.value)}
                      placeholder="Сумма"
                      className="input"
                      style={{ width: '150px' }}
                    />
                    <button onClick={() => removeBaseExpense(exp.id)} className="btn btn-danger">
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
              <div className="summary-row">
                <span>Итого базовых расходов:</span>
                <span className="amount">
                  {totalBaseExpenses.toLocaleString('de-DE')} €
                </span>
              </div>
            </div>

            {/* Categories */}
            <div className="card">
              <div className="card-header">
                <h2>📁 Категории</h2>
                <button onClick={addCategory} className="btn btn-primary">
                  + Добавить
                </button>
              </div>
              <div>
                {categories.map((cat, index) => (
                  <div key={cat.id} className="category-item">
                    <div className="expense-item">
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => updateCategory(cat.id, 'name', e.target.value)}
                        placeholder="Название категории"
                        className="input"
                        style={{ flex: 1 }}
                      />
                      <input
                        type="number"
                        value={cat.percent}
                        onChange={(e) => updateCategory(cat.id, 'percent', parseFloat(e.target.value) || 0)}
                        placeholder="%"
                        className="input"
                        style={{ width: '80px' }}
                      />
                      <span style={{ fontSize: '0.875rem', color: '#666' }}>%</span>
                      <button onClick={() => removeCategory(cat.id)} className="btn btn-danger">
                        🗑️
                      </button>
                    </div>
                    <div className="expense-item" style={{ marginTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.875rem', color: '#666', marginRight: '0.5rem' }}>
                        💰 Текущий баланс:
                      </label>
                      <input
                        type="number"
                        value={cat.balance}
                        onChange={(e) => updateCategory(cat.id, 'balance', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="input"
                        style={{ width: '150px' }}
                      />
                      <span style={{ fontSize: '0.875rem', color: '#666' }}>€</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={cat.carryOver}
                          onChange={(e) => updateCategory(cat.id, 'carryOver', e.target.checked)}
                        />
                        ♻️ Переносить остаток
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={cat.isSavings || false}
                          onChange={(e) => updateCategory(cat.id, 'isSavings', e.target.checked)}
                        />
                        💰 Накопительная (без трат)
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div>
            <div className="card">
              <div className="card-header">
                <h2>🎯 Мои цели</h2>
                <button onClick={() => setShowAddGoal(true)} className="btn btn-success">
                  + Создать цель
                </button>
              </div>
              
              {goals.length === 0 ? (
                <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎯</div>
                  <h3 style={{ marginBottom: '0.5rem' }}>Пока нет целей</h3>
                  <p style={{ color: '#666' }}>Создайте свою первую цель и следите за прогрессом!</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  {goals.map(goal => {
                    const progress = calculateGoalProgress(goal);
                    const motivation = getMotivationalMessage(progress.percent);
                    const category = categories.find(c => c.id === parseInt(goal.categoryId));
                    
                    return (
                      <div key={goal.id} style={{
                        border: '2px solid ' + motivation.color,
                        borderRadius: '12px',
                        padding: '1.5rem',
                        background: 'linear-gradient(135deg, ' + motivation.color + '15 0%, white 100%)'
                      }}>
                        {/* Заголовок цели */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                          <div>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                              {goal.icon} {goal.name}
                            </h3>
                            <p style={{ color: '#666', fontSize: '0.9rem' }}>
                              Категория: {category?.name} • До: {new Date(goal.targetDate).toLocaleDateString('ru-RU')}
        </p>
      </div>
                          <button
                            onClick={() => deleteGoal(goal.id)}
                            className="btn btn-danger"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                          >
                            🗑️
                          </button>
                        </div>

                        {/* Прогресс-бар */}
                        <div style={{ marginBottom: '1rem' }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            marginBottom: '0.5rem',
                            fontWeight: 'bold'
                          }}>
                            <span>{progress.percent.toFixed(1)}% выполнено</span>
                            <span style={{ color: motivation.color }}>{motivation.text} {motivation.emoji}</span>
                          </div>
                          <div style={{
                            width: '100%',
                            height: '24px',
                            background: '#e0e0e0',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            position: 'relative'
                          }}>
                            <div style={{
                              width: progress.percent + '%',
                              height: '100%',
                              background: 'linear-gradient(90deg, ' + motivation.color + ' 0%, ' + motivation.color + 'dd 100%)',
                              transition: 'width 0.5s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              paddingRight: '0.5rem',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.8rem'
                            }}>
                              {progress.percent >= 10 && motivation.emoji}
                            </div>
                          </div>
                        </div>

                        {/* Статистика */}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                          gap: '1rem',
                          marginBottom: '1rem'
                        }}>
                          <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>Текущий баланс</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: motivation.color }}>
                              {progress.currentBalance.toLocaleString('de-DE')} €
                            </div>
                          </div>
                          <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>Цель</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                              {goal.targetAmount.toLocaleString('de-DE')} €
                            </div>
                          </div>
                          <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>Осталось</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: progress.remaining > 0 ? '#f44336' : '#4caf50' }}>
                              {Math.max(0, progress.remaining).toLocaleString('de-DE')} €
                            </div>
                          </div>
                          <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>Времени</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                              {progress.weeksLeft > 0 ? `${progress.weeksLeft} нед` : `${progress.daysLeft} дн`}
                            </div>
                          </div>
                        </div>

                        {/* Описание */}
                        {goal.description && (
                          <div style={{ 
                            background: 'white', 
                            padding: '1rem', 
                            borderRadius: '8px',
                            fontStyle: 'italic',
                            color: '#666'
                          }}>
                            💬 {goal.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="card">
            <h2>История транзакций</h2>
            {transactions.length === 0 ? (
              <p className="empty-state">Пока нет транзакций</p>
            ) : (
              <div>
                {/* Сортируем транзакции: новые сверху */}
                {(() => {
                  const sortedTransactions = [...transactions].sort((a, b) => 
                    new Date(b.date) - new Date(a.date)
                  );
                  
                  // Пагинация
                  const totalPages = Math.ceil(sortedTransactions.length / TRANSACTIONS_PER_PAGE);
                  const startIndex = (historyPage - 1) * TRANSACTIONS_PER_PAGE;
                  const paginatedTransactions = sortedTransactions.slice(startIndex, startIndex + TRANSACTIONS_PER_PAGE);
                  
                  // Группируем по датам
                  const grouped = groupTransactionsByDate(paginatedTransactions);
                  
                  return (
                    <>
                      {Object.entries(grouped).map(([dateKey, dayTransactions]) => (
                        <div key={dateKey} style={{ marginBottom: '2rem' }}>
                          {/* Заголовок дня */}
                          <div style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            fontWeight: 'bold',
                            fontSize: '0.95rem'
                          }}>
                            📅 {dateKey}
                          </div>
                          
                          {/* Транзакции за день (новые сверху) */}
                          {dayTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(tr => (
                            <div key={tr.id} className="transaction-item">
                              <div className="transaction-header">
                                <div>
                                  <div className="transaction-type">
                                    {tr.type === 'distribution' ? '🔄 Распределение' : '💸 Расход'}
                                  </div>
                                  <div className="transaction-desc">{tr.description || tr.categoryName}</div>
                                  <div className="transaction-date">
                                    {new Date(tr.date).toLocaleTimeString('ru-RU', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </div>
                                </div>
                                <div className={`transaction-amount ${tr.type === 'distribution' ? 'positive' : 'negative'}`}>
                                  {tr.type === 'distribution' ? '+' : '-'}{tr.amount.toLocaleString('de-DE')} €
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Итого за день */}
                          <div style={{
                            borderTop: '2px solid #e0e0e0',
                            paddingTop: '0.75rem',
                            marginTop: '0.75rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.95rem'
                          }}>
                            <span>Итого за день:</span>
                            <span style={{ 
                              color: dayTransactions.reduce((sum, tr) => {
                                return sum + (tr.type === 'expense' ? -tr.amount : tr.amount);
                              }, 0) < 0 ? '#f44336' : '#4caf50'
                            }}>
                              {dayTransactions.reduce((sum, tr) => {
                                return sum + (tr.type === 'expense' ? -tr.amount : tr.amount);
                              }, 0).toLocaleString('de-DE')} €
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {/* Пагинация */}
                      {totalPages > 1 && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '1rem',
                          marginTop: '2rem',
                          padding: '1rem',
                          borderTop: '1px solid #e0e0e0'
                        }}>
                          <button 
                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                            disabled={historyPage === 1}
                            className="btn btn-secondary"
                            style={{ opacity: historyPage === 1 ? 0.5 : 1 }}
                          >
                            ← Назад
                          </button>
                          <span style={{ fontSize: '0.9rem', color: '#666' }}>
                            Страница {historyPage} из {totalPages}
                          </span>
                          <button 
                            onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                            disabled={historyPage === totalPages}
                            className="btn btn-secondary"
                            style={{ opacity: historyPage === totalPages ? 0.5 : 1 }}
                          >
                            Вперед →
                          </button>
                        </div>
                      )}
                      
                      {/* Информация о количестве */}
                      <div style={{ 
                        textAlign: 'center', 
                        color: '#666', 
                        fontSize: '0.85rem',
                        marginTop: '1rem'
                      }}>
                        Показано {paginatedTransactions.length} из {sortedTransactions.length} транзакций
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Добавить расход</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                addTransaction(
                  parseInt(formData.get('category')),
                  formData.get('amount'),
                  formData.get('description')
                );
              }}
            >
              <div className="form-group">
                <label>Категория</label>
                  <select name="category" required className="input">
                    {categories
                      .filter(cat => !cat.isSavings && cat.name !== 'Новый бизнес' && cat.name !== 'На черный день') // Исключаем накопительные категории
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.balance.toLocaleString('de-DE')} €{cat.balance < 0 ? ' - ДЕФИЦИТ' : ''})
                        </option>
                      ))}
                  </select>
              </div>
              <div className="form-group">
                <label>Сумма</label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="0"
                  step="0.01"
                  className="input"
                />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <input
                  type="text"
                  name="description"
                  required
                  className="input"
                  placeholder="Например: Супермаркет, Бензин, Кафе"
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="btn btn-secondary"
                >
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>🎯 Создать новую цель</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                addGoal({
                  name: formData.get('name'),
                  description: formData.get('description'),
                  categoryId: formData.get('category'),
                  targetAmount: parseFloat(formData.get('targetAmount')),
                  targetDate: formData.get('targetDate'),
                  icon: formData.get('icon') || '🎯'
                });
              }}
            >
              <div className="form-group">
                <label>Название цели</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="input"
                  placeholder="Например: Отпуск в Италии, Новый ноутбук"
                />
              </div>

              <div className="form-group">
                <label>Иконка (необязательно)</label>
                <input
                  type="text"
                  name="icon"
                  className="input"
                  placeholder="Эмодзи: 🏖️ 💻 🚗 🏠"
                  maxLength="2"
                />
              </div>

              <div className="form-group">
                <label>Категория для накопления</label>
                <select name="category" required className="input">
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.balance.toLocaleString('de-DE')} €)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Целевая сумма (€)</label>
                <input
                  type="number"
                  name="targetAmount"
                  required
                  min="1"
                  step="1"
                  className="input"
                  placeholder="Сколько нужно накопить?"
                />
              </div>

              <div className="form-group">
                <label>Срок достижения</label>
                <input
                  type="date"
                  name="targetDate"
                  required
                  className="input"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>Описание (необязательно)</label>
                <textarea
                  name="description"
                  className="input"
                  rows="3"
                  placeholder="Зачем вам эта цель? Что вы получите?"
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowAddGoal(false)}
                  className="btn btn-secondary"
                >
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  Создать цель
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
