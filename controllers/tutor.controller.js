const DB = require('../config/db');

// Helper para emular la antigua tabla de calificaciones finales computando orgánicamente las secuencias
const getSynthesizedGrades = async () => {
  const subjects = await DB.getAllSubjects();
  const partialGrades = await DB.getAllPartialGrades();

  return subjects.map(sub => {
    const partials = partialGrades.filter(pg => pg.subjectId === sub.id && pg.grade !== null && pg.grade !== undefined);
    const sumGrade = partials.reduce((acc, curr) => acc + parseFloat(curr.grade || 0), 0);
    
    const isFinished = partials.length >= sub.totalPartials;
    
    let status = 'en curso';
    if (isFinished) {
      status = sumGrade >= 70 ? 'aprobada' : 'reprobada';
    }
    
    return {
      id: sub.id,
      studentId: sub.studentId,
      subject: sub.name,
      grade: sumGrade, 
      status,
      totalPartials: sub.totalPartials
    };
  });
};

const getDashboardStats = async (req, res) => {
  try {
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de tutor.' });
    }

    const students = await DB.getAllStudents();
    const allGrades = await getSynthesizedGrades();

    let totalStudents = students.length;
    let studentsAtRisk = 0;
    
    // Calcular estadísticas
    const subjectStats = {};
    let totalGrades = 0;
    let failedGrades = 0;

    allGrades.forEach(grade => {
      totalGrades++;
      if (grade.status === 'reprobada') failedGrades++;
      
      if (!subjectStats[grade.subject]) {
        subjectStats[grade.subject] = { total: 0, failed: 0, sumGrade: 0 };
      }
      subjectStats[grade.subject].total++;
      if (grade.status === 'reprobada') {
        subjectStats[grade.subject].failed++;
      }
      subjectStats[grade.subject].sumGrade += parseFloat(grade.grade) || 0;
    });

    // Identificar alumnos en riesgo (con al menos 1 materia reprobada en total)
    const failedStudents = new Set();
    allGrades.filter(g => g.status === 'reprobada').forEach(g => failedStudents.add(g.studentId));
    studentsAtRisk = failedStudents.size;

    // Computar Tareas
    const allTasks = await DB.getAllTasks();
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    const now = new Date();

    allTasks.forEach(task => {
      if (task.status === 'completed') completed++;
      else {
        const taskDate = new Date(task.dueDate);
        if (taskDate >= now) pending++;
        else overdue++;
      }
    });

    const taskDistribution = [
      { name: 'Entregadas', value: completed, color: 'hsl(142, 71%, 45%)' },
      { name: 'En Tiempo', value: pending, color: 'hsl(45, 100%, 50%)' },
      { name: 'Vencidas', value: overdue, color: 'hsl(0, 84%, 60%)' }
    ];

    // Consolidado total de materias para el desglose visual y tabular
    const allSubjects = Object.keys(subjectStats).map(subject => ({
      name: subject,
      totalStudents: subjectStats[subject].total,
      failRate: Math.round((subjectStats[subject].failed / subjectStats[subject].total) * 100) || 0,
      averageGrade: parseFloat((subjectStats[subject].sumGrade / subjectStats[subject].total).toFixed(1)) || 0
    })).sort((a, b) => b.failRate - a.failRate);

    // Datos simulados para evolución (en un sistema real se calcularía por fechas)
    const performanceEvolution = [
      { name: 'Parcial 1', promedio: 7.5 },
      { name: 'Parcial 2', promedio: 8.2 },
      { name: 'Parcial 3', promedio: (totalGrades > 0 ? (totalGrades - failedGrades) / totalGrades * 10 : 7.8).toFixed(1) }
    ];

    res.json({
      totalStudents,
      studentsAtRisk,
      globalFailRate: totalGrades > 0 ? Math.round((failedGrades / totalGrades) * 100) : 0,
      taskDistribution,
      allSubjects,
      performanceEvolution,
      complianceRate: allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0
    });
  } catch (error) {
    console.error('Error al obtener stats:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

const getStudentsList = async (req, res) => {
  try {
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    const students = await DB.getAllStudents();
    const allGrades = await getSynthesizedGrades();

    // Adjuntar estado de trayectoria y promedio a cada alumno
    const enrichedStudents = students.map(student => {
      const studentGrades = allGrades.filter(g => g.studentId === student.id);
      
      let failed = 0;
      let approvedCount = 0;
      let enCursoCount = 0;

      studentGrades.forEach(g => {
        if (g.status === 'aprobada') {
          approvedCount++;
        } else if (g.status === 'reprobada') {
          failed++;
        } else {
          enCursoCount++;
        }
      });

      const activeSubjects = studentGrades.length;
      
      let average = 0;
      if (studentGrades.length > 0) {
        const sum = studentGrades.reduce((acc, curr) => acc + parseFloat(curr.grade), 0);
        average = (sum / studentGrades.length).toFixed(1);
      }

      let academicStatus = 'Normal';
      if (failed > 0) {
         academicStatus = 'Riesgo Alto';
      } else if (enCursoCount > 0) {
         academicStatus = 'En Curso';
      } else {
         academicStatus = 'Normal';
      }

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        status: student.status,
        failedSubjects: failed,
        activeSubjects,
        average,
        hasCriticalAlert: failed > 0,
        academicStatus
      };
    });

    res.json(enrichedStudents);
  } catch (error) {
    console.error('Error al obtener alumnos:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

const sendMessage = async (req, res) => {
  try {
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    const { studentId, content } = req.body;
    if (!studentId || !content) {
      return res.status(400).json({ error: 'Faltan datos del mensaje.' });
    }

    const newMsg = await DB.sendMessage(req.user.id, studentId, content);
    res.status(201).json({ message: 'Mensaje enviado', data: newMsg });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

module.exports = { getDashboardStats, getStudentsList, sendMessage };
