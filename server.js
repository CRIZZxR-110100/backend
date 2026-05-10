const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const gradesRoutes = require('./routes/grades.routes');
const tutorRoutes = require('./routes/tutor.routes');
const academicRoutes = require('./routes/academic.routes');

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/academic', academicRoutes);

app.set('trust proxy', 1); // Confiar en el proxy de Vercel

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    environment: process.env.USE_MOCK_DB === 'true' ? 'mock' : 'supabase' 
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal en el servidor.', details: err.message });
});

const PORT = process.env.PORT || 5000;

// Exportar la app para Vercel
module.exports = app;

// Solo iniciar el servidor si se ejecuta directamente (no como función serverless)
if (require.main === module || process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
  });
}

