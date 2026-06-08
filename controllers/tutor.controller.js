const DB = require('../config/db');
const { sendPushNotification } = require('../utils/push');

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
      grade: sumGrade, // La nota de la materia ES la sumatoria de las secuencias
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

    let students = await DB.getAllStudents();
    students = students.filter(s => s.tutorId === req.user.id && s.status === 'active');

    // Crear un set de IDs de estudiantes del tutor para filtrar rápidamente
    const tutorStudentIds = new Set(students.map(s => s.id));

    const allGrades = await getSynthesizedGrades();
    // Filtramos solo las calificaciones de las materias que pertenezcan a los alumnos de ESTE tutor
    const tutorGrades = allGrades.filter(g => tutorStudentIds.has(g.studentId));

    let totalStudents = students.length;
    let studentsAtRisk = 0;
    
    // Calcular estadísticas
    let totalGrades = 0;
    let failedGrades = 0;
    
    const failuresPerStudent = {};
    students.forEach(s => failuresPerStudent[s.id] = 0);

    tutorGrades.forEach(grade => {
      totalGrades++;
      if (grade.status === 'reprobada') {
        failedGrades++;
        if (failuresPerStudent[grade.studentId] !== undefined) {
          failuresPerStudent[grade.studentId]++;
        }
      }
    });

    // Identificar alumnos en riesgo (con al menos 1 materia reprobada en total)
    const failedStudents = new Set();
    tutorGrades.filter(g => g.status === 'reprobada').forEach(g => failedStudents.add(g.studentId));
    studentsAtRisk = failedStudents.size;

    // Computar Tareas
    const allTasks = await DB.getAllTasks();
    const tutorTasks = allTasks.filter(t => tutorStudentIds.has(t.studentId));
    
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    const now = new Date();

    tutorTasks.forEach(task => {
      if (task.status === 'completed') completed++;
      else {
        // due_date es tipo DATE en Supabase (sin hora). Se interpreta como fin del día
        // para evitar que tareas del día actual aparezcan como "vencidas" por zona horaria.
        const taskDate = new Date(task.dueDate + 'T23:59:59Z');
        if (taskDate >= now) pending++;
        else overdue++;
      }
    });

    const taskDistribution = [
      { name: 'Entregadas', value: completed, color: 'hsl(142, 71%, 45%)' },
      { name: 'En Tiempo', value: pending, color: 'hsl(45, 100%, 50%)' },
      { name: 'Vencidas', value: overdue, color: 'hsl(0, 84%, 60%)' }
    ];

    // Distribución de Materias Reprobadas (0, 1, 2, 3+)
    const failCounts = { '0': 0, '1': 0, '2': 0, '3+': 0 };
    Object.values(failuresPerStudent).forEach(count => {
      if (count === 0) failCounts['0']++;
      else if (count === 1) failCounts['1']++;
      else if (count === 2) failCounts['2']++;
      else failCounts['3+']++;
    });

    const failedSubjectsDistribution = [
      { name: '0 Reprobadas', value: failCounts['0'], color: 'hsl(142, 71%, 45%)' },
      { name: '1 Reprobada', value: failCounts['1'], color: 'hsl(45, 100%, 50%)' },
      { name: '2 Reprobadas', value: failCounts['2'], color: 'hsl(25, 95%, 53%)' },
      { name: '3+ Reprobadas', value: failCounts['3+'], color: 'hsl(0, 84%, 60%)' }
    ];

    // Calcular evolución de rendimiento basado en promedios reales por cada bloque de parcial (solo materias del tutor)
    const tutorSubjectIds = new Set(tutorGrades.map(g => g.id));
    const allPartialGrades = await DB.getAllPartialGrades();
    const tutorPartialGrades = allPartialGrades.filter(pg => tutorSubjectIds.has(pg.subjectId));
    
    const partialStats = {};
    tutorPartialGrades.forEach(pg => {
      if (pg.grade !== null && pg.grade !== undefined) {
        const name = pg.partialName || 'Desconocido';
        if (!partialStats[name]) partialStats[name] = { sum: 0, count: 0 };
        partialStats[name].sum += parseFloat(pg.grade);
        partialStats[name].count++;
      }
    });

    const performanceEvolution = Object.keys(partialStats)
      .sort() // "Parcial 1", "Parcial 2", etc.
      .map(name => ({
        name,
        promedio: parseFloat((partialStats[name].sum / partialStats[name].count).toFixed(1))
      }));

    // Distribución de promedios POR ALUMNO (mismo cálculo que muestra la tabla de alumnos)
    // sumGrade de cada materia / número de materias = promedio del alumno
    let gradesDist = { excellent: 0, good: 0, regular: 0, deficient: 0 };
    students.forEach(s => {
      const studentSubjects = tutorGrades.filter(g => g.studentId === s.id);
      if (studentSubjects.length === 0) return;
      const sum = studentSubjects.reduce((acc, g) => acc + parseFloat(g.grade || 0), 0);
      const avg = sum / studentSubjects.length;
      if (avg >= 90) gradesDist.excellent++;
      else if (avg >= 80) gradesDist.good++;
      else if (avg >= 70) gradesDist.regular++;
      else gradesDist.deficient++;
    });

    const gradeDistribution = [
      { name: 'Excelente (90-100)', value: gradesDist.excellent, color: 'hsl(142, 71%, 45%)' },
      { name: 'Bueno (80-89)',      value: gradesDist.good,      color: 'hsl(200, 100%, 50%)' },
      { name: 'Regular (70-79)',    value: gradesDist.regular,   color: 'hsl(45, 100%, 50%)' },
      { name: 'Deficiente (<70)',   value: gradesDist.deficient, color: 'hsl(0, 84%, 60%)' }
    ];

    // Distribución de niveles de riesgo académico (calculado a partir del estado de cada alumno en getStudentsList)
    // Lo derivamos aquí directamente desde los datos ya disponibles
    const riskCounts = { 'Normal': 0, 'En Curso': 0, 'Riesgo Alto': 0 };
    students.forEach(s => {
      const studentGrades = tutorGrades.filter(g => g.studentId === s.id);
      const failedCount = studentGrades.filter(g => g.status === 'reprobada').length;
      const inProgressCount = studentGrades.filter(g => g.status === 'en curso').length;
      if (failedCount > 0) riskCounts['Riesgo Alto']++;
      else if (inProgressCount > 0) riskCounts['En Curso']++;
      else riskCounts['Normal']++;
    });

    const riskDistribution = [
      { name: 'Normal',      value: riskCounts['Normal'],      color: 'hsl(142, 71%, 45%)' },
      { name: 'En Curso',    value: riskCounts['En Curso'],    color: 'hsl(45, 100%, 50%)' },
      { name: 'Riesgo Alto', value: riskCounts['Riesgo Alto'], color: 'hsl(0, 84%, 60%)' }
    ];

    const totalTutorTasks = completed + pending + overdue;
    const complianceRate = totalTutorTasks > 0 ? Math.round((completed / totalTutorTasks) * 100) : 0;

    // Agrupar materias por nombre con estadísticas para TutorSubjectsList
    const subjectGroups = {};
    tutorGrades.forEach(g => {
      if (!subjectGroups[g.subject]) {
        subjectGroups[g.subject] = { name: g.subject, total: 0, failed: 0 };
      }
      subjectGroups[g.subject].total++;
      if (g.status === 'reprobada') subjectGroups[g.subject].failed++;
    });
    const allSubjects = Object.values(subjectGroups).map(sg => ({
      name: sg.name,
      totalStudents: sg.total,
      failRate: sg.total > 0 ? Math.round((sg.failed / sg.total) * 100) : 0
    }));

    res.json({
      totalStudents,
      studentsAtRisk,
      globalFailRate: totalGrades > 0 ? Math.round((failedGrades / totalGrades) * 100) : 0,
      taskDistribution,
      failedSubjectsDistribution,
      performanceEvolution,
      gradeDistribution,
      riskDistribution,
      complianceRate,
      allSubjects
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

    let students = await DB.getAllStudents();

    // Filtrar solo los alumnos activos de ESTE tutor
    students = students.filter(s => s.tutorId === req.user.id && s.status === 'active');
    const allGrades = await getSynthesizedGrades();
    const allTasks = await DB.getAllTasks();

    // Adjuntar estado de trayectoria, promedio, tareas y materias a cada alumno
    const enrichedStudents = students.map(student => {
      const studentGrades = allGrades.filter(g => g.studentId === student.id);
      const studentTasks = allTasks.filter(t => t.studentId === student.id);
      
      let failed = 0;
      let approvedCount = 0;
      let enCursoCount = 0;

      const subjectsDetail = studentGrades.map(g => ({
        subject: g.subject,
        grade: g.grade,
        status: g.status
      }));

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

      const now = new Date();
      let completedTasks = 0;
      let pendingTasks = 0;
      let overdueTasks = 0;

      studentTasks.forEach(t => {
        if (t.status === 'completed') completedTasks++;
        else {
          const tDate = new Date(t.dueDate);
          if (tDate >= now) pendingTasks++;
          else overdueTasks++;
        }
      });

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        status: student.status,
        failedSubjects: failed,
        activeSubjects,
        average,
        hasCriticalAlert: failed > 0,
        academicStatus,
        subjectsDetail,
        taskStats: {
          completed: completedTasks,
          pending: pendingTasks,
          overdue: overdueTasks
        }
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

    // Enviar Push Notification al alumno
    console.log(`[PUSH] Buscando suscripción para studentId: ${studentId}`);
    const sub = await DB.getPushSubscriptionByUserId(studentId);

    if (!sub) {
      console.warn(`[PUSH] No se encontró suscripción para el alumno ${studentId}. El alumno no ha activado notificaciones.`);
    } else {
      console.log(`[PUSH] Suscripción encontrada. Endpoint: ${sub.endpoint?.substring(0, 60)}...`);
      try {
        await sendPushNotification(sub, {
          title: 'Nuevo Mensaje de tu Tutor',
          body: content,
          url: '/'
        });
        console.log(`[PUSH] Notificación enviada correctamente al alumno ${studentId}`);
      } catch (pushErr) {
        console.error(`[PUSH] Error al enviar notificación:`, pushErr.statusCode, pushErr.body || pushErr.message);
      }
    }

    res.status(201).json({ message: 'Mensaje enviado', data: newMsg });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

const getPendingStudents = async (req, res) => {
  try {
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }
    const pending = await DB.getPendingStudents(req.user.id);
    res.json(pending);
  } catch (error) {
    console.error('Error al obtener alumnos pendientes:', error);
    res.status(500).json({ error: 'Error interno.' });
  }
};

const approveStudent = async (req, res) => {
  try {
    if (req.user.role !== 'tutor') return res.status(403).json({ error: 'Acceso denegado.' });
    const { id } = req.params;
    
    // Verificar que el estudiante pertenece a este tutor
    const student = await DB.getUserById(id);
    if (!student || student.tutorId !== req.user.id) {
      return res.status(404).json({ error: 'Alumno no encontrado.' });
    }

    const updated = await DB.updateUser(id, { status: 'active' });
    res.json({ message: 'Alumno aprobado', student: updated });
  } catch (error) {
    console.error('Error al aprobar alumno:', error);
    res.status(500).json({ error: 'Error interno.' });
  }
};

const rejectStudent = async (req, res) => {
  try {
    if (req.user.role !== 'tutor') return res.status(403).json({ error: 'Acceso denegado.' });
    const { id } = req.params;
    
    const student = await DB.getUserById(id);
    if (!student || student.tutorId !== req.user.id) {
      return res.status(404).json({ error: 'Alumno no encontrado.' });
    }

    // Cambiar a 'baja'
    const updated = await DB.updateUser(id, { status: 'baja' });
    res.json({ message: 'Alumno rechazado', student: updated });
  } catch (error) {
    console.error('Error al rechazar alumno:', error);
    res.status(500).json({ error: 'Error interno.' });
  }
};

module.exports = { getDashboardStats, getStudentsList, sendMessage, getPendingStudents, approveStudent, rejectStudent };
