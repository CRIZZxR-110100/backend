const { supabase } = require('./supabase');

const useMock = process.env.USE_MOCK_DB === 'true' || !supabase;

const mockData = {
  users: new Map(),
  grades: new Map(),
  messages: new Map(),
  subjects: new Map(),
  partialGrades: new Map(),
  tasks: new Map()
};

const DB = {
  // USUARIOS
  async getUserById(id) {
    if (useMock) return mockData.users.get(id) || null;
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) return null;
    return { ...data, tutorId: data.tutor_id, createdAt: data.created_at };
  },

  async getUserByEmail(email) {
    if (useMock) {
      for (const [id, user] of mockData.users.entries()) {
        if (user.email === email) return { id, ...user };
      }
      return null;
    }
    const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    if (error || !data) return null;
    return { ...data, tutorId: data.tutor_id, createdAt: data.created_at };
  },

  async createUser(user) {
    const newUser = { 
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role || 'student',
      tutor_id: user.tutorId || null,
      status: user.status || 'active'
    };
    if (useMock) {
      const id = Date.now().toString();
      const mockUser = { ...newUser, id, tutorId: newUser.tutor_id, createdAt: new Date().toISOString() };
      mockData.users.set(id, mockUser);
      return mockUser;
    }
    const { data, error } = await supabase.from('users').insert([newUser]).select().single();
    if (error) throw error;
    return { ...data, tutorId: data.tutor_id, createdAt: data.created_at };
  },

  async updateUser(id, data) {
    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (data.status) updateData.status = data.status;
    if (data.tutorId !== undefined) updateData.tutor_id = data.tutorId;

    if (useMock) {
      const user = mockData.users.get(id);
      if (!user) throw new Error("Usuario no encontrado");
      const updatedUser = { ...user, ...data };
      mockData.users.set(id, updatedUser);
      return updatedUser;
    }
    const { data: updated, error } = await supabase.from('users').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return { ...updated, tutorId: updated.tutor_id, createdAt: updated.created_at };
  },

  async getAllStudents() {
    if (useMock) {
      return Array.from(mockData.users.values()).filter(u => u.role === 'student');
    }
    const { data, error } = await supabase.from('users').select('*').eq('role', 'student');
    if (error) throw error;
    return data.map(u => ({ ...u, tutorId: u.tutor_id, createdAt: u.created_at }));
  },

  // GRADES (Histórico)
  async getGradesByStudent(studentId) {
    if (useMock) {
      return Array.from(mockData.grades.values()).filter(g => g.studentId === studentId);
    }
    const { data, error } = await supabase.from('grades').select('*').eq('student_id', studentId);
    if (error) throw error;
    return data.map(g => ({ ...g, studentId: g.student_id, createdAt: g.created_at }));
  },

  async addGrade(studentId, gradeData) {
    const isApproved = parseFloat(gradeData.grade) >= 6.0;
    const newGrade = { 
      student_id: studentId,
      subject: gradeData.subject,
      grade: gradeData.grade,
      semester: gradeData.semester,
      status: isApproved ? 'aprobada' : 'reprobada'
    };
    if (useMock) {
      const id = Date.now().toString();
      const mockGrade = { ...newGrade, id, studentId: newGrade.student_id, createdAt: new Date().toISOString() };
      mockData.grades.set(id, mockGrade);
      return mockGrade;
    }
    const { data, error } = await supabase.from('grades').insert([newGrade]).select().single();
    if (error) throw error;
    return { ...data, studentId: data.student_id, createdAt: data.created_at };
  },

  // MATERIAS
  async createSubject(subjectData) {
    const newSubj = {
      student_id: subjectData.studentId,
      name: subjectData.name,
      total_partials: subjectData.totalPartials || 3
    };
    if (useMock) {
      const id = Date.now().toString();
      const mockSubj = { ...newSubj, id, studentId: newSubj.student_id, totalPartials: newSubj.total_partials, createdAt: new Date().toISOString() };
      mockData.subjects.set(id, mockSubj);
      return mockSubj;
    }
    const { data, error } = await supabase.from('subjects').insert([newSubj]).select().single();
    if (error) throw error;
    return { ...data, studentId: data.student_id, totalPartials: data.total_partials, createdAt: data.created_at };
  },

  async getSubjectsByStudent(studentId) {
    if (useMock) {
      return Array.from(mockData.subjects.values()).filter(s => s.studentId === studentId);
    }
    const { data, error } = await supabase.from('subjects').select('*').eq('student_id', studentId);
    if (error) throw error;
    return data.map(s => ({ ...s, studentId: s.student_id, totalPartials: s.total_partials, createdAt: s.created_at }));
  },

  async updateSubject(id, data) {
    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.totalPartials) updateData.total_partials = data.totalPartials;

    if (useMock) {
      const subj = mockData.subjects.get(id);
      if (!subj) throw new Error("Materia no encontrada");
      const updated = { ...subj, ...data };
      mockData.subjects.set(id, updated);
      return updated;
    }
    const { data: updated, error } = await supabase.from('subjects').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return { ...updated, studentId: updated.student_id, totalPartials: updated.total_partials, createdAt: updated.created_at };
  },

  async getSubjectById(id) {
    if (useMock) return mockData.subjects.get(id) || null;
    const { data, error } = await supabase.from('subjects').select('*').eq('id', id).single();
    if (error) return null;
    return { ...data, studentId: data.student_id, totalPartials: data.total_partials, createdAt: data.created_at };
  },

  // CALIFICACIONES PARCIALES
  async createPartialGrade(partialData) {
    const newPG = {
      subject_id: partialData.subjectId,
      partial_name: partialData.partialName,
      grade: partialData.grade
    };
    if (useMock) {
      const id = Date.now().toString();
      const mockPG = { ...newPG, id, subjectId: newPG.subject_id, partialName: newPG.partial_name, createdAt: new Date().toISOString() };
      mockData.partialGrades.set(id, mockPG);
      return mockPG;
    }
    const { data, error } = await supabase.from('partial_grades').insert([newPG]).select().single();
    if (error) throw error;
    return { ...data, subjectId: data.subject_id, partialName: data.partial_name, createdAt: data.created_at };
  },

  async getPartialGradesBySubject(subjectId) {
    if (useMock) {
      return Array.from(mockData.partialGrades.values()).filter(pg => pg.subjectId === subjectId);
    }
    const { data, error } = await supabase.from('partial_grades').select('*').eq('subject_id', subjectId);
    if (error) throw error;
    return data.map(pg => ({ ...pg, subjectId: pg.subject_id, partialName: pg.partial_name, createdAt: pg.created_at }));
  },

  // TAREAS
  async createTask(taskData) {
    const newTask = {
      subject_id: taskData.subjectId,
      student_id: taskData.studentId,
      title: taskData.title,
      due_date: taskData.dueDate,
      status: 'pending'
    };
    if (useMock) {
      const id = Date.now().toString();
      const mockTask = { ...newTask, id, subjectId: newTask.subject_id, studentId: newTask.student_id, dueDate: newTask.due_date, createdAt: new Date().toISOString() };
      mockData.tasks.set(id, mockTask);
      return mockTask;
    }
    const { data, error } = await supabase.from('tasks').insert([newTask]).select().single();
    if (error) throw error;
    return { ...data, subjectId: data.subject_id, studentId: data.student_id, dueDate: data.due_date, createdAt: data.created_at };
  },

  async getTasksByStudent(studentId) {
    if (useMock) {
      return Array.from(mockData.tasks.values()).filter(t => t.studentId === studentId);
    }
    const { data, error } = await supabase.from('tasks').select('*').eq('student_id', studentId);
    if (error) throw error;
    return data.map(t => ({ ...t, subjectId: t.subject_id, studentId: t.student_id, dueDate: t.due_date, createdAt: t.created_at }));
  },

  async updateTask(id, data) {
    const updateData = {};
    if (data.title) updateData.title = data.title;
    if (data.status) updateData.status = data.status;
    if (data.dueDate) updateData.due_date = data.dueDate;

    if (useMock) {
      const task = mockData.tasks.get(id);
      if (!task) throw new Error("Tarea no encontrada");
      const updated = { ...task, ...data };
      mockData.tasks.set(id, updated);
      return updated;
    }
    const { data: updated, error } = await supabase.from('tasks').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return { ...updated, subjectId: updated.subject_id, studentId: updated.student_id, dueDate: updated.due_date, createdAt: updated.created_at };
  },

  // MENSAJES
  async sendMessage(tutorId, studentId, content) {
    const newMsg = {
      tutor_id: tutorId,
      student_id: studentId,
      content: content
    };
    if (useMock) {
      const id = Date.now().toString();
      const mockMsg = { ...newMsg, id, tutorId: newMsg.tutor_id, studentId: newMsg.student_id, createdAt: new Date().toISOString() };
      mockData.messages.set(id, mockMsg);
      return mockMsg;
    }
    const { data, error } = await supabase.from('messages').insert([newMsg]).select().single();
    if (error) throw error;
    return { ...data, tutorId: data.tutor_id, studentId: data.student_id, createdAt: data.created_at };
  },

  async getMessagesByStudent(studentId) {
    if (useMock) {
      return Array.from(mockData.messages.values()).filter(m => m.studentId === studentId);
    }
    const { data, error } = await supabase.from('messages').select('*').eq('student_id', studentId);
    if (error) throw error;
    return data.map(m => ({ ...m, tutorId: m.tutor_id, studentId: m.student_id, createdAt: m.created_at }));
  },

  // METODOS GLOBALES PARA TUTORES
  async getAllSubjects() {
    if (useMock) {
      return Array.from(mockData.subjects.values());
    }
    const { data, error } = await supabase.from('subjects').select('*');
    if (error) throw error;
    return data.map(s => ({ ...s, studentId: s.student_id, totalPartials: s.total_partials, createdAt: s.created_at }));
  },

  async getAllPartialGrades() {
    if (useMock) {
      return Array.from(mockData.partialGrades.values());
    }
    const { data, error } = await supabase.from('partial_grades').select('*');
    if (error) throw error;
    return data.map(pg => ({ ...pg, subjectId: pg.subject_id, partialName: pg.partial_name, createdAt: pg.created_at }));
  },

  async getAllTasks() {
    if (useMock) {
      return Array.from(mockData.tasks.values());
    }
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) throw error;
    return data.map(t => ({ ...t, subjectId: t.subject_id, studentId: t.student_id, dueDate: t.due_date, createdAt: t.created_at }));
  }
};

module.exports = DB;
