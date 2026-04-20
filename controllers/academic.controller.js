const DB = require('../config/db');

// Subjects
const createSubject = async (req, res) => {
  try {
    const { name, totalPartials } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre es requerido.' });
    
    const numPartials = parseInt(totalPartials) || 3;
    const newSubject = await DB.createSubject({
      studentId: req.user.id,
      name,
      totalPartials: numPartials
    });

    for (let i = 1; i <= numPartials; i++) {
      await DB.createPartialGrade({
        subjectId: newSubject.id,
        partialName: `Secuencia ${i}`,
        grade: null
      });
    }

    res.status(201).json(newSubject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear materia' });
  }
};

const getMySubjects = async (req, res) => {
  try {
    const subjects = await DB.getSubjectsByStudent(req.user.id);
    const populated = await Promise.all(subjects.map(async (sub) => {
      const partials = await DB.getPartialGradesBySubject(sub.id);
      const validPartials = partials.filter(p => p.grade !== null && p.grade !== undefined);
      const totalGrade = validPartials.reduce((acc, curr) => acc + parseFloat(curr.grade || 0), 0);
      return { ...sub, partials, finalGrade: totalGrade };
    }));
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener materias' });
  }
};

const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, totalPartials } = req.body;
    let newTotal = totalPartials ? parseInt(totalPartials) : null;
    
    if (newTotal !== null) {
      const existingPartials = await DB.getPartialGradesBySubject(id);
      existingPartials.sort((a,b) => {
         const numA = parseInt(a.partialName.replace('Secuencia ', '')) || 0;
         const numB = parseInt(b.partialName.replace('Secuencia ', '')) || 0;
         return numA - numB;
      });

      if (newTotal < existingPartials.length) {
        const toDelete = existingPartials.slice(newTotal);
        const hasGrades = toDelete.some(p => p.grade !== null && p.grade !== undefined);
        if (hasGrades) {
          return res.status(400).json({ error: 'No puedes reducir las secuencias porque las que intentas eliminar ya tienen calificación.' });
        }
        for (const p of toDelete) {
          await DB.deletePartialGrade(p.id);
        }
      } else if (newTotal > existingPartials.length) {
        for (let i = existingPartials.length + 1; i <= newTotal; i++) {
          await DB.createPartialGrade({
            subjectId: id,
            partialName: `Secuencia ${i}`,
            grade: null
          });
        }
      }
    }
    
    const updated = await DB.updateSubject(id, { name, totalPartials: newTotal || undefined });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar materia' });
  }
};

// Partial Grades
const addPartialGrade = async (req, res) => {
  try {
    const { subjectId, partialName, grade } = req.body;
    if (!subjectId || !partialName || grade === undefined) {
      return res.status(400).json({ error: 'Materia, nombre de parcial y calificación son requeridos.' });
    }
    const newPartial = await DB.createPartialGrade({
      subjectId,
      partialName,
      grade: parseFloat(grade)
    });
    res.status(201).json(newPartial);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar calificación parcial' });
  }
};

const updatePartialGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { grade } = req.body;
    const updated = await DB.updatePartialGrade(id, { grade: parseFloat(grade) });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar calificación parcial' });
  }
};

// Tasks
const createTask = async (req, res) => {
  try {
    const { subjectId, title, dueDate } = req.body;
    if (!subjectId || !title || !dueDate) {
      return res.status(400).json({ error: 'Materia, título y fecha límite son requeridos.' });
    }
    const newTask = await DB.createTask({
      studentId: req.user.id,
      subjectId,
      title,
      dueDate
    });
    res.status(201).json(newTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear tarea' });
  }
};

const getMyTasks = async (req, res) => {
  try {
    const tasks = await DB.getTasksByStudent(req.user.id);
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, dueDate, status } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (status !== undefined) updateData.status = status;
    
    // Only use updateTaskStatus from DB if it's only status, else use updateTask
    // wait, we modified updateTask to accept anything. We can use it.
    const updated = await DB.updateTask(id, updateData);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar tarea' });
  }
};

module.exports = {
  createSubject, getMySubjects, updateSubject,
  addPartialGrade, updatePartialGrade,
  createTask, getMyTasks, updateTask
};
