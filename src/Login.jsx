import { useState } from 'react';
import { USERS, authenticateUser } from './users';
import './Login.css';

function Login({ onLogin }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setUsername(user.username);
    setPassword('');
    setError('');
  };

  const handleBack = () => {
    setSelectedUser(null);
    setUsername('');
    setPassword('');
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = authenticateUser(username, password);
    if (user) {
      onLogin(user);
    } else {
      setError('Неверный логин или пароль!');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Экран выбора пользователя
  if (!selectedUser) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-icon">💰</div>
          <h1>Планировщик Бюджета</h1>
          <p className="login-subtitle">Выберите пользователя</p>
          
          <div className="user-selection">
            {USERS.map(user => (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className="user-card"
              >
                <div className="user-icon">{user.displayName.split(' ')[0]}</div>
                <div className="user-name">{user.displayName}</div>
                <div className="user-login">@{user.username}</div>
              </button>
            ))}
          </div>
          
          <div className="login-footer">
            <p>🔒 У каждого пользователя свой личный бюджет</p>
            <p>💶 Все суммы в евро</p>
          </div>
        </div>
      </div>
    );
  }

  // Экран входа для выбранного пользователя
  return (
    <div className="login-container">
      <div className="login-card">
        <button onClick={handleBack} className="back-button">
          ← Назад
        </button>
        
        <div className="login-icon">{selectedUser.displayName.split(' ')[0]}</div>
        <h1>{selectedUser.displayName}</h1>
        <p className="login-subtitle">@{selectedUser.username}</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Пароль:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
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
          <p style={{ color: '#4caf50', fontWeight: 'bold' }}>✅ После входа пароль больше не потребуется</p>
          <p>🔒 Ваш личный бюджет</p>
        </div>
      </div>
    </div>
  );
}

export default Login;

