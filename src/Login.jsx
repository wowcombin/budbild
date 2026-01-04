import { useState } from 'react';
import { APP_PASSWORD } from './supabaseClient';
import './Login.css';

function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === APP_PASSWORD) {
      // Сохраняем в localStorage что пользователь вошел
      localStorage.setItem('isAuthenticated', 'true');
      onLogin();
    } else {
      setError('Неверный пароль!');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-icon">💰</div>
        <h1>Планировщик Бюджета</h1>
        <p className="login-subtitle">Общий бюджет для двоих</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Введите пароль:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              className="input"
              autoFocus
              required
            />
          </div>
          
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
          
          <button type="submit" className="btn btn-primary btn-full">
            🔓 Войти
          </button>
        </form>
        
        <div className="login-footer">
          <p>🔒 Все данные синхронизируются между устройствами</p>
          <p>💶 Используется общий бюджет в евро</p>
        </div>
      </div>
    </div>
  );
}

export default Login;

