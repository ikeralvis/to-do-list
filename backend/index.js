// server.js - Versión con debug completo
const express = require('express');
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const cors = require('cors');

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.options('*', cors());
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body) {
    console.log('Body:', req.body);
  }
  next();
});

const vulnerableAuth = (req, res, next) => {
  const token = req.headers.authorization;
  
  console.log('🔐 Auth Middleware - Authorization header:', req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Remover 'Bearer ' si está presente
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.decode(actualToken);
    console.log('🔓 Token decoded:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('❌ Token decode error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ROUTE: Debug - ver todos los usuarios
app.get('/api/debug/users', (req, res) => {
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    console.log('👥 Users in database:', rows);
    res.json(rows);
  });
});

// ROUTE: Debug - ver todos los todos
app.get('/api/debug/todos', (req, res) => {
  db.all('SELECT * FROM todos', (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    console.log('📝 Todos in database:', rows);
    res.json(rows);
  });
});

// ROUTE: Registro de usuario
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  
  console.log('📝 Registration attempt for:', username);
  
  const checkUserSql = `SELECT * FROM users WHERE username = '${username}'`;
  console.log('🔍 SQL Query:', checkUserSql);
  
  db.get(checkUserSql, (err, row) => {
    if (err) {
      console.error('❌ DB Error in register:', err);
      return res.status(500).json({ error: 'db error' });
    }
    
    if (row) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    bcrypt.hash(password, 5, (err, hash) => {
      if (err) return res.status(500).json({ error: 'hash error' });
      
      const insertSql = `INSERT INTO users (username, password) VALUES ('${username}', '${hash}')`;
      console.log('💾 Insert SQL:', insertSql);
      
      db.run(insertSql, function(err) {
        if (err) {
          console.error('❌ DB Error inserting user:', err);
          return res.status(500).json({ error: 'db error' });
        }
        console.log('✅ User created successfully:', username);
        res.json({ message: 'User created', id: this.lastID });
      });
    });
  });
});

// ROUTE: Login vulnerable - VERSIÓN MEJORADA
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('🔑 Login attempt - Username:', username, 'Password:', password);
  
  // VULNERABILIDAD SQL INJECTION - Esta es la línea crítica
  const sql = `SELECT * FROM users WHERE username = '${username}'`;
  console.log('🛠️ SQL Query being executed:', sql);
  
  db.get(sql, async (err, user) => {
    if (err) {
      console.error('❌ Database error:', err);
      return res.status(500).json({ error: 'db error' });
    }
    
    console.log('📊 Query result:', user);
    
    // Si no hay usuario, la inyección falló
    if (!user) {
      console.log('❌ No user found - SQL injection may have failed');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    try {
      // Para SQL Injection exitoso, necesitamos manejar el caso especial
      let valid = false;
      
      if (username.includes("' OR '1'='1") || username.includes("' OR 1=1")) {
        // Si es SQL Injection, aceptamos cualquier password
        console.log('🎯 SQL Injection detected - bypassing password check');
        valid = true;
      } else {
        // Verificación normal de password
        valid = await bcrypt.compare(password, user.password);
        console.log('🔐 Normal password validation result:', valid);
      }
      
      if (valid) {
        const token = jwt.sign(
          { id: user.id, username: user.username }, 
          'weaksecret',
          { algorithm: 'HS256' }
        );
        
        console.log('✅ Login successful for user:', user.username);
        res.json({ 
          token, 
          user: { id: user.id, username: user.username },
          message: 'Login successful (SQL Injection worked!)'
        });
      } else {
        console.log('❌ Invalid password');
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('❌ Auth error:', error);
      res.status(500).json({ error: 'auth error' });
    }
  });
});

// ROUTE: listar todas las tareas
app.get('/api/todos', vulnerableAuth, (req, res) => {
  console.log('📋 Fetching todos for user:', req.user);
  db.all('SELECT * FROM todos', (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

// ROUTE: crear tarea vulnerable
app.post('/api/todos', vulnerableAuth, (req, res) => {
  console.log('➕ Create Todo - Headers:', req.headers);
  console.log('➕ Create Todo - Body:', req.body);
  console.log('➕ Create Todo - User:', req.user);
  
  const { title, description, owner } = req.body;
  
  const q = `INSERT INTO todos (title, description, owner) VALUES ('${title}', '${description}', '${owner}')`;
  console.log('💾 Insert Todo SQL:', q);
  
  db.run(q, function(err) {
    if (err) {
      console.error('❌ DB Error creating todo:', err);
      return res.status(500).json({ error: 'db error: ' + err.message });
    }
    console.log('✅ Todo created successfully, ID:', this.lastID);
    res.json({ id: this.lastID });
  });
});


// ROUTE: buscar por título
app.get('/api/search', vulnerableAuth, (req, res) => {
  const q = req.query.q || '';
  const sql = `SELECT * FROM todos WHERE title LIKE '%${q}%' OR description LIKE '%${q}%'`;
  console.log('🔍 Search SQL:', sql);
  
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

// ROUTE: borrar por id
app.delete('/api/todos/:id', vulnerableAuth, (req, res) => {
  const id = req.params.id;
  const sql = `DELETE FROM todos WHERE id = ${id}`;
  console.log('🗑️ Delete SQL:', sql);
  
  db.run(sql, function(err) {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json({ deleted: this.changes });
  });
});

// ROUTE: Obtener usuario por ID
app.get('/api/users/:id', vulnerableAuth, (req, res) => {
  const userId = req.params.id;
  const sql = `SELECT id, username, created_at FROM users WHERE id = ${userId}`;
  console.log('👤 Get User SQL:', sql);
  
  db.get(sql, (err, user) => {
    if (err) return res.status(500).json({ error: 'db error' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });
});

// Ruta de salud mejorada
app.get('/api/health', (req, res) => {
  db.get('SELECT COUNT(*) as user_count FROM users', (err, row) => {
    if (err) {
      return res.json({ status: 'ERROR', message: 'Database error' });
    }
    res.json({ 
      status: 'OK', 
      message: 'Backend funcionando',
      user_count: row.user_count
    });
  });
});

// RUTA VULNERABLE 1: Exposición de TODOS los usuarios con información sensible
app.get('/api/users', vulnerableAuth, (req, res) => {
  console.log('👥 Fetching ALL users (Broken Access Control)');
  // MAL: Expone todos los usuarios con sus passwords hasheadas
  db.all('SELECT id, username, password, created_at FROM users', (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    console.log('⚠️ Exposed user data:', rows);
    res.json(rows);
  });
});


app.get('/api/users/:id', vulnerableAuth, (req, res) => {
  const userId = req.params.id;
  console.log('👤 Accessing user ID:', userId, 'by user:', req.user.id);
  
  // MAL: No verifica si el usuario actual tiene acceso a este recurso
  const sql = `SELECT id, username, password, created_at FROM users WHERE id = ${userId}`;
  console.log('🔍 SQL Query:', sql);
  
  db.get(sql, (err, user) => {
    if (err) return res.status(500).json({ error: 'db error' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    console.log('⚠️ Exposed user data:', user);
    res.json(user);
  });
});

app.put('/api/users/:id', vulnerableAuth, (req, res) => {
  const userId = req.params.id;
  const { username } = req.body;
  
  console.log('✏️ Attempting to update user ID:', userId, 'by user:', req.user.id);
  console.log('📝 New username:', username);
  
  // MAL: Permite que cualquier usuario modifique cualquier otro usuario
  const sql = `UPDATE users SET username = '${username}' WHERE id = ${userId}`;
  console.log('🛠️ Update SQL:', sql);
  
  db.run(sql, function(err) {
    if (err) return res.status(500).json({ error: 'db error' });
    console.log('✅ User updated by unauthorized user!');
    res.json({ 
      message: 'User updated successfully (Broken Access Control!)',
      changes: this.changes 
    });
  });
});

app.delete('/api/todos/:id', vulnerableAuth, (req, res) => {
  const id = req.params.id;
  console.log('🗑️ Deleting todo ID:', id, 'by user:', req.user.id);
  
  // MAL: No verifica la propiedad del todo
  const sql = `DELETE FROM todos WHERE id = ${id}`;
  console.log('🔍 Delete SQL:', sql);
  
  db.run(sql, function(err) {
    if (err) return res.status(500).json({ error: 'db error' });
    console.log('✅ Todo deleted (possibly by wrong user)!');
    res.json({ 
      deleted: this.changes,
      message: 'Todo deleted (No ownership verification!)'
    });
  });
});

app.post('/api/users/promote', vulnerableAuth, (req, res) => {
  const { targetUserId, role } = req.body;
  
  console.log('🎯 Promotion attempt by user:', req.user.id);
  console.log('🎯 Target user:', targetUserId, 'New role:', role);
  
  // MAL: Permite que cualquier usuario se promueva a admin
  const sql = `UPDATE users SET role = '${role}' WHERE id = ${targetUserId}`;
  
  db.run(sql, function(err) {
    if (err) {
      // Si no existe la columna role, la creamos
      db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, () => {
        db.run(sql, function(err) {
          if (err) return res.status(500).json({ error: 'db error' });
          console.log('✅ User role updated by unauthorized user!');
          res.json({ 
            message: 'User promoted to ' + role + ' (Privilege Escalation!)',
            changes: this.changes 
          });
        });
      });
      return;
    }
    console.log('✅ User role updated by unauthorized user!');
    res.json({ 
      message: 'User promoted to ' + role + ' (Privilege Escalation!)',
      changes: this.changes 
    });
  });
});



const PORT = 3001;
app.listen(PORT, () => {
  console.log('🚀 ========================================');
  console.log('✅ Backend (vulnerable) ejecutándose en: http://localhost:' + PORT);
  console.log('📊 Health check: http://localhost:' + PORT + '/api/health');
  console.log('👥 Debug users: http://localhost:' + PORT + '/api/debug/users');
  console.log('📝 Debug todos: http://localhost:' + PORT + '/api/debug/todos');
  console.log('🚀 ========================================');
});