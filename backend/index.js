// server.js corregido
const express = require('express');
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());

// Middleware de autenticación vulnerable
const vulnerableAuth = (req, res, next) => {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Vulnerabilidad: No verificar la firma del JWT
    const decoded = jwt.decode(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ROUTE: Registro de usuario vulnerable
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  
  const checkUserSql = `SELECT * FROM users WHERE username = '${username}'`;
  
  db.get(checkUserSql, (err, row) => {
    if (err) return res.status(500).json({ error: 'db error' });
    
    if (row) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    bcrypt.hash(password, 5, (err, hash) => {
      if (err) return res.status(500).json({ error: 'hash error' });
      
      const insertSql = `INSERT INTO users (username, password) VALUES ('${username}', '${hash}')`;
      
      db.run(insertSql, function(err) {
        if (err) return res.status(500).json({ error: 'db error' });
        res.json({ message: 'User created', id: this.lastID });
      });
    });
  });
});

// ROUTE: Login vulnerable
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const sql = `SELECT * FROM users WHERE username = '${username}'`;
  
  db.get(sql, async (err, user) => {
    if (err) return res.status(500).json({ error: 'db error' });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    try {
      const valid = await bcrypt.compare(password, user.password);
      
      if (valid) {
        const token = jwt.sign(
          { id: user.id, username: user.username }, 
          'weaksecret',
          { algorithm: 'HS256' }
        );
        
        res.json({ token, user: { id: user.id, username: user.username } });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      res.status(500).json({ error: 'auth error' });
    }
  });
});

// ROUTE: listar todas las tareas
app.get('/api/todos', vulnerableAuth, (req, res) => {
  db.all('SELECT * FROM todos', (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

// ROUTE: crear tarea vulnerable
app.post('/api/todos', vulnerableAuth, (req, res) => {
  const { title, description, owner } = req.body;
  
  // CORREGIDO: No incluir user_id en el INSERT
  const q = `INSERT INTO todos (title, description, owner) VALUES ('${title}', '${description}', '${owner}')`;
  
  db.run(q, function(err) {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json({ id: this.lastID });
  });
});

// ROUTE: buscar por título
app.get('/api/search', vulnerableAuth, (req, res) => {
  const q = req.query.q || '';
  const sql = `SELECT * FROM todos WHERE title LIKE '%${q}%' OR description LIKE '%${q}%'`;
  
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

// ROUTE: borrar por id
app.delete('/api/todos/:id', vulnerableAuth, (req, res) => {
  const id = req.params.id;
  db.run(`DELETE FROM todos WHERE id = ${id}`, function(err) {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json({ deleted: this.changes });
  });
});

// ROUTE: Obtener usuario por ID
app.get('/api/users/:id', vulnerableAuth, (req, res) => {
  const userId = req.params.id;
  const sql = `SELECT id, username, created_at FROM users WHERE id = ${userId}`;
  
  db.get(sql, (err, user) => {
    if (err) return res.status(500).json({ error: 'db error' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });
});

app.listen(3001, () => console.log('Backend (vulnerable) en :3001'));