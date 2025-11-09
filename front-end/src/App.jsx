import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [todos, setTodos] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', password: '' });
  const [todoForm, setTodoForm] = useState({ title: '', description: '', owner: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);
      fetchTodos(savedToken);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Login successful, token:', data.token);
        setToken(data.token);
        setUser(data.user);
        setIsLoggedIn(true);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        await fetchTodos(data.token);
      } else {
        setError('Login failed: ' + data.error);
      }
    } catch (error) {
      setError('Error: ' + error.message);
    }
    setLoading(false);
  };

  // 🔥 AÑADIR ESTA FUNCIÓN FALTANTE
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerForm),
      });

      const data = await response.json();

      if (response.ok) {
        alert('User registered successfully! Please login.');
        setRegisterForm({ username: '', password: '' });
      } else {
        setError('Registration failed: ' + data.error);
      }
    } catch (error) {
      setError('Error: ' + error.message);
    }
    setLoading(false);
  };

  const fetchTodos = async (authToken = token) => {
    setLoading(true);
    setError('');
    try {
      console.log('🔐 Fetching todos with token:', authToken);

      const response = await fetch('http://localhost:3001/api/todos', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Todos data received:', data);

      if (Array.isArray(data)) {
        setTodos(data);
      } else {
        console.error('Expected array but got:', data);
        setTodos([]);
        setError('Unexpected response format from server');
      }
    } catch (error) {
      console.error('❌ Error fetching todos:', error);
      setError('Error fetching todos: ' + error.message);
      setTodos([]);
    }
    setLoading(false);
  };

  const addTodo = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      console.log('🔐 Token being used:', token);
      console.log('📦 Todo data:', todoForm);

      const response = await fetch('http://localhost:3001/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(todoForm),
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Server error:', errorData);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error}`);
      }

      const data = await response.json();
      console.log('✅ Todo created successfully:', data);

      setTodoForm({ title: '', description: '', owner: '' });
      await fetchTodos();
      alert('Todo added successfully!');

    } catch (error) {
      console.error('❌ Error adding todo:', error);
      setError('Error adding todo: ' + error.message);
    }
    setLoading(false);
  };

  const checkAuthStatus = () => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    console.log('🔐 Auth Status Check:');
    console.log('- Token in localStorage:', savedToken);
    console.log('- User in localStorage:', savedUser);
    console.log('- React token state:', token);
    console.log('- React user state:', user);
    console.log('- Is logged in:', isLoggedIn);
  };



  const searchTodos = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:3001/api/search?q=${encodeURIComponent(searchTerm)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setSearchResults(data);
        setActiveTab('search');
      } else {
        setSearchResults([]);
        setError('Unexpected response format from server');
      }
    } catch (error) {
      setError('Error searching: ' + error.message);
      setSearchResults([]);
    }
    setLoading(false);
  };

  const deleteTodo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this todo?')) return;

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:3001/api/todos/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        await fetchTodos();
        if (activeTab === 'search') {
          setSearchResults(searchResults.filter(todo => todo.id !== id));
        }
        alert('Todo deleted successfully!');
      } else {
        setError('Error deleting todo: ' + data.error);
      }
    } catch (error) {
      setError('Error: ' + error.message);
    }
    setLoading(false);
  };

  const renderTodoDescription = (description) => {
    return { __html: description };
  };

  const logout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setToken('');
    setUser(null);
    setTodos([]);
    setSearchResults([]);
    setError('');
  };

  const safeTodos = Array.isArray(todos) ? todos : [];
  const safeSearchResults = Array.isArray(searchResults) ? searchResults : [];

  if (!isLoggedIn) {
    return (
      <div className="app">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h1>🚀 ToDo App</h1>
              <p>Manage your tasks</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="auth-tabs">
              <div className="tab active">Login</div>
            </div>

            <form onSubmit={handleLogin} className="auth-form">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>


          </div>

          <div className="auth-card">
            <div className="auth-header">
              <h2>📝 Register</h2>
            </div>

            <form onSubmit={handleRegister} className="auth-form">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Choose a username"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Choose a password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn-secondary" disabled={loading}>
                {loading ? 'Creating Account...' : 'Register'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>📝 To Do APP</h1>
          <div className="user-info">
            <span>Welcome, <strong>{user?.username}</strong></span>
            <button onClick={logout} className="btn-logout">Logout</button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="sidebar">
          <div className="sidebar-section">
            <h3>Navigation</h3>
            <button
              className={`nav-btn ${activeTab === 'todos' ? 'active' : ''}`}
              onClick={() => setActiveTab('todos')}
            >
              📋 My Todos
            </button>
            <button
              className={`nav-btn ${activeTab === 'add' ? 'active' : ''}`}
              onClick={() => setActiveTab('add')}
            >
              ➕ Add Todo
            </button>
            <button
              className={`nav-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              🔍 Search
            </button>
          </div>

          <div className="sidebar-section">
            <h3>Quick Stats</h3>
            <div className="stats">
              <div className="stat-item">
                <span className="stat-number">{safeTodos.length}</span>
                <span className="stat-label">Total Todos</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{safeSearchResults.length}</span>
                <span className="stat-label">Search Results</span>
              </div>
            </div>
          </div>
        </div>

        <div className="content">
          {error && <div className="error-message">{error}</div>}

          {activeTab === 'todos' && (
            <div className="tab-content">
              <div className="tab-header">
                <h2>My Todos</h2>
                <button onClick={() => fetchTodos()} className="btn-refresh" disabled={loading}>
                  🔄 Refresh
                </button>
              </div>

              {loading ? (
                <div className="loading">Loading todos...</div>
              ) : (
                <div className="todos-grid">
                  {safeTodos.map(todo => (
                    <div key={todo.id} className="todo-card">
                      <div className="todo-header">
                        <h3>{todo.title}</h3>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="btn-delete"
                          title="Delete todo"
                        >
                          🗑️
                        </button>
                      </div>
                      <div
                        className="todo-description"
                        dangerouslySetInnerHTML={renderTodoDescription(todo.description)}
                      />
                      <div className="todo-footer">
                        <span className="todo-owner">👤 {todo.owner}</span>
                        <span className="todo-date">
                          📅 {new Date(todo.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}

                  {safeTodos.length === 0 && (
                    <div className="empty-state">
                      <p>No todos found. Create your first todo!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="tab-content">
              <h2>Add New Todo</h2>
              <form onSubmit={addTodo} className="todo-form">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    placeholder="Enter todo title"
                    value={todoForm.title}
                    onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    placeholder="Enter todo description"
                    rows="4"
                    value={todoForm.description}
                    onChange={(e) => setTodoForm({ ...todoForm, description: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Owner</label>
                  <input
                    type="text"
                    placeholder="Enter owner name"
                    value={todoForm.owner}
                    onChange={(e) => setTodoForm({ ...todoForm, owner: e.target.value })}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Todo'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="tab-content">
              <h2>Search Todos</h2>
              <form onSubmit={searchTodos} className="search-form">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search by title or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Searching...' : '🔍 Search'}
                  </button>
                </div>
              </form>

              {safeSearchResults.length > 0 && (
                <div className="search-results">
                  <h3>Search Results ({safeSearchResults.length})</h3>
                  <div className="todos-grid">
                    {safeSearchResults.map(todo => (
                      <div key={todo.id} className="todo-card">
                        <div className="todo-header">
                          <h3>{todo.title}</h3>
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className="btn-delete"
                          >
                            🗑️
                          </button>
                        </div>
                        <div
                          className="todo-description"
                          dangerouslySetInnerHTML={renderTodoDescription(todo.description)}
                        />
                        <div className="todo-footer">
                          <span className="todo-owner">👤 {todo.owner}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {safeSearchResults.length === 0 && activeTab === 'search' && !loading && (
                <div className="empty-state">
                  <p>No search results. Try a different search term.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;