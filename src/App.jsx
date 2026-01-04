import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

function App({ onLogout }) {
  // Состояние для базовых настроек
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [baseExpenses, setBaseExpenses] = useState([
    { id: 1, name: 'Аренда', amount: '' },
    { id: 2, name: 'Коммуналка', amount: '' },
    { id: 3, name: 'Страховки', amount: '' },
    { id: 4, name: 'Еда (базовая)', amount: '' },
  ]);

  // Категории с процентами
  const [categories, setCategories] = useState([
    { id: 1, name: 'Новый бизнес', percent: 50, balance: 0, carryOver: true },
    { id: 2, name: 'Путешествия', percent: 20, balance: 0, carryOver: true },
    { id: 3, name: 'Одежда', percent: 15, balance: 0, carryOver: false },
    { id: 4, name: 'Развлечения', percent: 15, balance: 0, carryOver: false },
  ]);

  // История транзакций
  const [transactions, setTransactions] = useState([]);
  
  // Активный месяц
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // UI состояния
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Загрузка данных из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('budgetData');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.monthlyIncome) setMonthlyIncome(data.monthlyIncome);
      if (data.baseExpenses) setBaseExpenses(data.baseExpenses);
      if (data.categories) setCategories(data.categories);
      if (data.transactions) setTransactions(data.transactions);
      if (data.currentMonth) setCurrentMonth(data.currentMonth);
    }
  }, []);

  // Сохранение в localStorage
  useEffect(() => {
    localStorage.setItem('budgetData', JSON.stringify({
      monthlyIncome,
      baseExpenses,
      categories,
      transactions,
      currentMonth
    }));
  }, [monthlyIncome, baseExpenses, categories, transactions, currentMonth]);

  // Расчеты
  const totalBaseExpenses = baseExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  const remainingAfterBase = (parseFloat(monthlyIncome) || 0) - totalBaseExpenses;
  
  // Распределение по категориям (первые 50% идут в бизнес, остальные 50% распределяются)
  const businessAmount = remainingAfterBase * 0.5;
  const distributionBase = remainingAfterBase * 0.5;

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
  const distributeBudget = () => {
    if (remainingAfterBase <= 0) {
      alert('Доход должен быть больше базовых расходов!');
      return;
    }

    const newCategories = categories.map((cat, index) => {
      let allocated = 0;
      if (index === 0) {
        allocated = businessAmount;
      } else {
        allocated = distributionBase * (cat.percent / 100);
      }
      
      // Если категория переносится, добавляем к текущему балансу (может быть отрицательным)
      // Если не переносится, устанавливаем новую сумму
      return {
        ...cat,
        balance: cat.carryOver ? cat.balance + allocated : allocated
      };
    });

    setCategories(newCategories);
    
    setTransactions([...transactions, {
      id: Date.now(),
      type: 'distribution',
      date: new Date().toISOString(),
      month: currentMonth,
      amount: remainingAfterBase,
      description: `Распределение бюджета за ${currentMonth}`
    }]);

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
  const addTransaction = (categoryId, amount, description) => {
    const numAmount = parseFloat(amount);
    const category = categories.find(c => c.id === categoryId);
    
    if (!category) return;

    // Обновляем баланс категории (может уйти в минус - дефицит)
    setCategories(categories.map(cat => 
      cat.id === categoryId 
        ? { ...cat, balance: cat.balance - numAmount }
        : cat
    ));

    setTransactions([...transactions, {
      id: Date.now(),
      type: 'expense',
      date: new Date().toISOString(),
      month: currentMonth,
      categoryId,
      categoryName: category.name,
      amount: numAmount,
      description
    }]);

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

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
      <div>
          <h1>💰 Планировщик Бюджета</h1>
          <p>Месяц: {currentMonth} <span style={{ color: '#4caf50', marginLeft: '1rem' }}>🔒 Вход выполнен</span></p>
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
            <div className="grid">
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
                {categories.map(cat => (
                  <div key={cat.id} className="category-item">
                    <div className="category-header">
                      <div className="category-info">
                        <h3>{cat.name}</h3>
                        <p style={{ fontSize: '0.875rem', color: '#666' }}>
                          {cat.carryOver ? '♻️ Переносится на следующий месяц' : '📅 Сбрасывается каждый месяц'}
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
                          width: `${Math.min(Math.max((cat.balance / (remainingAfterBase * cat.percent / 100)) * 100, 0), 100)}%`,
                          backgroundColor: cat.balance < 0 ? '#f44336' : '#5c6bc0'
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
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
                        onChange={(e) => updateCategory(cat.id, 'percent', parseFloat(e.target.value))}
                        placeholder="%"
                        disabled={index === 0}
                        className="input"
                        style={{ width: '100px' }}
                      />
                      <button onClick={() => removeCategory(cat.id)} className="btn btn-danger">
                        🗑️
                      </button>
      </div>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={cat.carryOver}
                        onChange={(e) => updateCategory(cat.id, 'carryOver', e.target.checked)}
                      />
                      Переносить остаток на следующий месяц
                    </label>
                    {index === 0 && (
                      <p className="info-text">
                        ℹ️ Первая категория получает 50% от остатка, остальные делят вторую половину
                      </p>
                    )}
                  </div>
                ))}
              </div>
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
                {[...transactions].reverse().map(tr => (
                  <div key={tr.id} className="transaction-item">
                    <div className="transaction-header">
                      <div>
                        <div className="transaction-type">
                          {tr.type === 'distribution' ? '🔄 Распределение' : '💸 Расход'}
                        </div>
                        <div className="transaction-desc">{tr.description || tr.categoryName}</div>
                        <div className="transaction-date">
                          {new Date(tr.date).toLocaleString('ru-RU')}
                        </div>
                      </div>
                        <div className={`transaction-amount ${tr.type === 'distribution' ? 'positive' : 'negative'}`}>
                          {tr.type === 'distribution' ? '+' : '-'}{tr.amount.toLocaleString('de-DE')} €
                        </div>
                    </div>
                  </div>
                ))}
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
                    {categories.map(cat => (
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
    </div>
  );
}

export default App;
