require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

// Configurar conexión a PostgreSQL en Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Necesario para Render
});

// 🔹 Función para crear la tabla automáticamente si no existe
async function createTable() {
    const query = `
    CREATE TABLE IF NOT EXISTS votantes (
        id SERIAL PRIMARY KEY,
        cedula VARCHAR(20) UNIQUE NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        telefono VARCHAR(20),
        municipio VARCHAR(50),
        direccion VARCHAR(100),
        barrio VARCHAR(50),
        genero VARCHAR(20),
        edad INT,
        profesion VARCHAR(50),
        lider VARCHAR(100),
        tipoLider VARCHAR(10),
        nota TEXT,
        userId VARCHAR(50),  -- Nuevo campo para identificar a cada usuario
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

    try {
        await pool.query(query);
        console.log("✅ Tabla 'votantes' verificada/creada correctamente.");
    } catch (error) {
        console.error("❌ Error al crear la tabla:", error);
    }
}

// 🔹 Llamar a la función al iniciar el servidor
createTable();

// Ruta para registrar votantes con userId
app.post('/registrar', async (req, res) => {
    try {
        const { cedula, nombre, telefono, municipio, direccion, barrio, genero, edad, profesion, lider, tipoLider, nota, userId } = req.body;
        const fecha = new Date().toISOString();

        const result = await pool.query(
            'INSERT INTO votantes (cedula, nombre, telefono, municipio, direccion, barrio, genero, edad, profesion, lider, tipoLider, nota, "userId", fecha) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *',
            [cedula, nombre, telefono, municipio, direccion, barrio, genero, edad, profesion, lider, tipoLider, nota, userId, fecha]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error("❌ Error al registrar el votante:", error);
        res.status(500).json({ success: false, error: 'Error al registrar el votante' });
    }
});


// 🔹 Ruta para obtener SOLO los registros del usuario actual
app.get('/mis-registros', async (req, res) => {
    const { userId } = req.query;

    console.log("📥 Petición recibida en /mis-registros con userId:", userId);

    if (!userId) {
        console.log("⚠️ Error: userId no proporcionado.");
        return res.status(400).json({ success: false, error: "userId es requerido" });
    }

    try {
        const result = await pool.query('SELECT * FROM votantes WHERE "userId" = $1 ORDER BY fecha DESC', [userId]);
        console.log("📊 Registros encontrados:", result.rows.length);
        res.json(result.rows);
    } catch (error) {
        console.error("❌ Error al obtener registros:", error);
        res.status(500).json({ success: false, error: 'Error al obtener los registros' });
    }
});


// 🔹 Ruta para obtener TODOS los registros (Solo Admin)
const ADMIN_PASSWORD = "geo2025"; // Cambia esta contraseña por una segura

app.get('/admin/registros', async (req, res) => {
    const { password } = req.query;

    if (password !== ADMIN_PASSWORD) {
        return res.status(403).json({ success: false, error: "Acceso denegado" });
    }

    try {
        const result = await pool.query('SELECT * FROM votantes ORDER BY fecha DESC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error al obtener los registros' });
    }
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);

});
