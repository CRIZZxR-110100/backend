const DB = require('../config/db');

const getMyGrades = async (req, res) => {
  try {
    const grades = await DB.getGradesByStudent(req.user.id);
    
    // Calcular estadísticas
    let approvedCount = 0;
    let failedCount = 0;
    const subjectFails = {};
    const criticalAlerts = [];

    // Consideramos aprobadas únicas para no contar dobles si las repitió
    const approvedSubjects = new Set();

    grades.forEach(g => {
      if (g.status === 'aprobada') {
        approvedSubjects.add(g.subject.toLowerCase());
      } else {
        failedCount++;
        const subKey = g.subject.toLowerCase();
        subjectFails[subKey] = (subjectFails[subKey] || 0) + 1;
      }
    });

    approvedCount = approvedSubjects.size;
    const missingCount = Math.max(0, 56 - approvedCount);

    // Revisar alertas de intentos (>= 3)
    for (const [subject, fails] of Object.entries(subjectFails)) {
      if (fails >= 3 && !approvedSubjects.has(subject)) {
        criticalAlerts.push({
          subject: subject.toUpperCase(),
          fails
        });
      }
    }

    res.json({
      grades,
      stats: {
        totalSubjects: 56,
        approvedCount,
        failedCount,
        missingCount
      },
      criticalAlerts
    });
  } catch (error) {
    console.error('Error al obtener calificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

const addOrUpdateGrade = async (req, res) => {
  try {
    const { id, semester, subject, grade } = req.body;
    
    if (!semester || !subject || grade === undefined) {
      return res.status(400).json({ error: 'Semestre, materia y calificación son requeridos.' });
    }

    if (id) {
      // Update
      const updated = await DB.updateGrade(id, { semester, subject, grade });
      return res.json({ message: 'Calificación actualizada', grade: updated });
    } else {
      // Create
      const newGrade = await DB.addGrade(req.user.id, { semester, subject, grade });
      return res.status(201).json({ message: 'Calificación registrada', grade: newGrade });
    }
  } catch (error) {
    console.error('Error al guardar calificación:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

module.exports = { getMyGrades, addOrUpdateGrade };
