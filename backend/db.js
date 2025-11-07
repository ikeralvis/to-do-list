// db.js corregido
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'todo.sqlite');
const fs = require('fs');

// Asegurar que la carpeta data existe
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const db = new sqlite3.Database(dbPath);

// Inicializar tablas si no existen
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // CORREGIDO: Tabla todos sin user_id
  db.run(`CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    owner TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Insertar usuario de prueba
  const bcrypt = require('bcrypt');
  const testHash = bcrypt.hashSync('password123', 5);
  
  // Limpiar e insertar datos de prueba
  db.run(`DELETE FROM users WHERE username IN ('admin', 'test')`);
  db.run(`INSERT INTO users (username, password) VALUES ('admin', '${testHash}')`);
  db.run(`INSERT INTO users (username, password) VALUES ('test', '${testHash}')`);
  
  // Limpiar e insertar todos de prueba
  db.run(`DELETE FROM todos`);
  db.run(`INSERT INTO todos (title, description, owner) VALUES 
    ('Tarea importante', 'Esta es una tarea muy importante', 'admin'),
    ('Compras del supermercado', 'Comprar leche, pan y huevos', 'test'),
    ('Reunión de trabajo', '<script>alert("XSS")</script>Preparar presentación para la reunión', 'admin'),
    ('Estudiar seguridad', 'Investigar sobre SQL Injection y XSS', 'test')
  `);
});

module.exports = db;