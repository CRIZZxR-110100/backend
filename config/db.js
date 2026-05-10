const { supabase } = require('./supabase');

const useMock = process.env.USE_MOCK_DB === 'true' || !supabase;

// ============================================
// Mock DB (para desarrollo sin conexión)
// ============================================
const mockData = {
  users: new Map(),
  grades: new Map(),
  messages: new Map(),
  subjects: new Map(),
  partialGrades: new Map(),
  tasks: new Map()
};

// ============================================
// Helpers: convierte snake_case <-> camelCase
// ============================================
function toCamel(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    tutorId: row.tutor_id,
    status: row.status,
    createdAt: row.created_at,
    // subjects
    studentId: row.student_id,
    totalPartials: row.total_partials,
    // partial grades
    subjectId: row.subject_id,
    partialName: row.partial_name,
    grade: row.grade,
    // tasks
    title: row.title,
    dueDate: row.due_date,
    // grades (historical)
    subject: row.subject,
    semester: row.semester,
    // messages
    tutorId: row.tutor_id,
    content: row.content,
    date: row.created_at
  };
}

function toSnake(obj) {
  const mapped = {};
  if (obj.name !== undefined) mapped.name = obj.name;
  if (obj.email !== undefined) mapped.email = obj.email;
  if (obj.password !== undefined) mapped.password = obj.password;
  if (obj.role !== undefined) mapped.role = obj.role;
  if (obj.tutorId !== undefined) mapped.tutor_id = obj.tutorId;
  if (obj.status !== undefined) mapped.status = obj.status;
  if (obj.studentId !== undefined) mapped.student_id = obj.studentId;
  if (obj.totalPartials !== undefined) mapped.total_partials = obj.totalPartials;
  if (obj.subjectId !== undefined) mapped.subject_id = obj.subjectId;
  if (obj.partialName !== undefined) mapped.partial_name = obj.partialName;
  if (obj.grade !== undefined) mapped.grade = obj.grade;
  if (obj.title !== undefined) mapped.title = obj.title;
  if (obj.dueDate !== undefined) mapped.due_date = obj.dueDate;
  if (obj.subject !== undefined) mapped.subject = obj.subject;
  if (obj.semester !== undefined) mapped.semester = obj.semester;
  if (obj.content !== undefined) mapped.content = obj.content;
  return mapped;
}

// ============================================
// Helper: lanza error si Supabase falla
// ============================================
function handleError(error, context) {
  if (error) {
    console.error(`❌ Error en ${context}:`, error.message);
    throw new Error(error.message);
  }
}

// ============================================
// DB Wrapper — Compatible con Mock y Supabase
// ============================================
const DB = {

  // ==========================================
  // USERS
  // ==========================================
  async getUserById(id) {
    if (useMock) return mockData.users.get(id) || null;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code === 'PGRST116') return null; // not found
    handleError(error, 'getUserById');
    return toCamel(data);
  },

  async getUserByEmail(email) {
    if (useMock) {
      for (const [id, user] of mockData.users.entries()) {
        if (user.email === email) return { id, ...user };
      }
      return null;
    }
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error && error.code === 'PGRST116') return null; // not found
    handleError(error, 'getUserByEmail');
    return toCamel(data);
  },

  async createUser(user) {
    const newUser = {
      ...user,
      role: user.role || 'student',
      status: user.status || 'active',
      createdAt: new Date().toISOString()
    };
    if (useMock) {
      const id = Date.now().toString();
      mockData.users.set(id, newUser);
      return { id, ...newUser };
    }
    const { data, error } = await supabase
      .from('users')
      .insert(toSnake(newUser))
      .select()
      .single();
    handleError(error, 'createUser');
    return toCamel(data);
  },

  async updateUser(id, updateData) {
    if (useMock) {
      const user = mockData.users.get(id);
      if (!user) throw new Error("Usuario no encontrado");
      const updatedUser = { ...user, ...updateData };
      mockData.users.set(id, updatedUser);
      return { id, ...updatedUser };
    }
    const { data, error } = await supabase
      .from('users')
      .update(toSnake(updateData))
      .eq('id', id)
      .select()
      .single();
    handleError(error, 'updateUser');
    return toCamel(data);
  },

  async getAllStudents() {
    if (useMock) {
      const students = [];
      for (const [id, user] of mockData.users.entries()) {
        if (user.role === 'student') students.push({ id, ...user });
      }
      return students;
    }
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student');
    handleError(error, 'getAllStudents');
    return (data || []).map(toCamel);
  },

  // ==========================================
  // GRADES (Histórico)
  // ==========================================
  async getGradesByStudent(studentId) {
    if (useMock) {
      const grades = [];
      for (const [id, grade] of mockData.grades.entries()) {
        if (grade.studentId === studentId) grades.push({ id, ...grade });
      }
      return grades;
    }
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('student_id', studentId);
    handleError(error, 'getGradesByStudent');
    return (data || []).map(toCamel);
  },

  async getAllGrades() {
    if (useMock) {
      const grades = [];
      for (const [id, grade] of mockData.grades.entries()) {
        grades.push({ id, ...grade });
      }
      return grades;
    }
    const { data, error } = await supabase
      .from('grades')
      .select('*');
    handleError(error, 'getAllGrades');
    return (data || []).map(toCamel);
  },

  async addGrade(studentId, gradeData) {
    const isApproved = parseFloat(gradeData.grade) >= 6.0;
    const newGrade = {
      ...gradeData,
      studentId,
      status: isApproved ? 'aprobada' : 'reprobada',
      createdAt: new Date().toISOString()
    };
    if (useMock) {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      mockData.grades.set(id, newGrade);
      return { id, ...newGrade };
    }
    const { data, error } = await supabase
      .from('grades')
      .insert(toSnake(newGrade))
      .select()
      .single();
    handleError(error, 'addGrade');
    return toCamel(data);
  },

  async updateGrade(id, gradeData) {
    const isApproved = parseFloat(gradeData.grade) >= 6.0;
    const updateData = { ...gradeData, status: isApproved ? 'aprobada' : 'reprobada' };
    if (useMock) {
      const grade = mockData.grades.get(id);
      if (!grade) throw new Error("Calificación no encontrada");
      const updatedGrade = { ...grade, ...updateData };
      mockData.grades.set(id, updatedGrade);
      return { id, ...updatedGrade };
    }
    const { data, error } = await supabase
      .from('grades')
      .update(toSnake(updateData))
      .eq('id', id)
      .select()
      .single();
    handleError(error, 'updateGrade');
    return toCamel(data);
  },

  // ==========================================
  // MESSAGES
  // ==========================================
  async getMessagesByStudent(studentId) {
    if (useMock) {
      const msgs = [];
      for (const [id, msg] of mockData.messages.entries()) {
        if (msg.studentId === studentId) msgs.push({ id, ...msg });
      }
      return msgs;
    }
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('student_id', studentId);
    handleError(error, 'getMessagesByStudent');
    return (data || []).map(toCamel);
  },

  async sendMessage(tutorId, studentId, content) {
    const newMsg = { tutorId, studentId, content, date: new Date().toISOString() };
    if (useMock) {
      const id = Date.now().toString();
      mockData.messages.set(id, newMsg);
      return { id, ...newMsg };
    }
    const { data, error } = await supabase
      .from('messages')
      .insert({
        tutor_id: tutorId,
        student_id: studentId,
        content
      })
      .select()
      .single();
    handleError(error, 'sendMessage');
    return toCamel(data);
  },

  // ==========================================
  // SUBJECTS
  // ==========================================
  async createSubject(subjectData) {
    if (useMock) {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      mockData.subjects.set(id, subjectData);
      return { id, ...subjectData };
    }
    const { data, error } = await supabase
      .from('subjects')
      .insert(toSnake(subjectData))
      .select()
      .single();
    handleError(error, 'createSubject');
    return toCamel(data);
  },

  async getSubjectsByStudent(studentId) {
    if (useMock) {
      const results = [];
      for (const [id, subj] of mockData.subjects.entries()) {
        if (subj.studentId === studentId) results.push({ id, ...subj });
      }
      return results;
    }
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('student_id', studentId);
    handleError(error, 'getSubjectsByStudent');
    return (data || []).map(toCamel);
  },

  async getAllSubjects() {
    if (useMock) {
      return Array.from(mockData.subjects.entries()).map(([id, subj]) => ({ id, ...subj }));
    }
    const { data, error } = await supabase
      .from('subjects')
      .select('*');
    handleError(error, 'getAllSubjects');
    return (data || []).map(toCamel);
  },

  async getSubjectById(subjectId) {
    if (useMock) {
      return mockData.subjects.has(subjectId) ? { id: subjectId, ...mockData.subjects.get(subjectId) } : null;
    }
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .single();
    if (error && error.code === 'PGRST116') return null;
    handleError(error, 'getSubjectById');
    return toCamel(data);
  },

  async updateSubject(id, updateData) {
    if (useMock) {
      const subject = mockData.subjects.get(id);
      if (!subject) throw new Error("Materia no encontrada");
      const updated = { ...subject, ...updateData };
      mockData.subjects.set(id, updated);
      return { id, ...updated };
    }
    const { data, error } = await supabase
      .from('subjects')
      .update(toSnake(updateData))
      .eq('id', id)
      .select()
      .single();
    handleError(error, 'updateSubject');
    return toCamel(data);
  },

  // ==========================================
  // PARTIAL GRADES
  // ==========================================
  async createPartialGrade(partialData) {
    if (useMock) {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      mockData.partialGrades.set(id, partialData);
      return { id, ...partialData };
    }
    const { data, error } = await supabase
      .from('partial_grades')
      .insert(toSnake(partialData))
      .select()
      .single();
    handleError(error, 'createPartialGrade');
    return toCamel(data);
  },

  async getPartialGradesBySubject(subjectId) {
    if (useMock) {
      const results = [];
      for (const [id, pg] of mockData.partialGrades.entries()) {
        if (pg.subjectId === subjectId) results.push({ id, ...pg });
      }
      return results;
    }
    const { data, error } = await supabase
      .from('partial_grades')
      .select('*')
      .eq('subject_id', subjectId);
    handleError(error, 'getPartialGradesBySubject');
    return (data || []).map(toCamel);
  },

  async getAllPartialGrades() {
    if (useMock) {
      return Array.from(mockData.partialGrades.entries()).map(([id, pg]) => ({ id, ...pg }));
    }
    const { data, error } = await supabase
      .from('partial_grades')
      .select('*');
    handleError(error, 'getAllPartialGrades');
    return (data || []).map(toCamel);
  },

  async updatePartialGrade(id, updateData) {
    if (useMock) {
      const partial = mockData.partialGrades.get(id);
      if (!partial) throw new Error("Calificación no encontrada");
      const updated = { ...partial, ...updateData };
      mockData.partialGrades.set(id, updated);
      return { id, ...updated };
    }
    const { data, error } = await supabase
      .from('partial_grades')
      .update(toSnake(updateData))
      .eq('id', id)
      .select()
      .single();
    handleError(error, 'updatePartialGrade');
    return toCamel(data);
  },

  async deletePartialGrade(id) {
    if (useMock) {
      mockData.partialGrades.delete(id);
      return { success: true };
    }
    const { error } = await supabase
      .from('partial_grades')
      .delete()
      .eq('id', id);
    handleError(error, 'deletePartialGrade');
    return { success: true };
  },

  // ==========================================
  // TASKS
  // ==========================================
  async createTask(taskData) {
    if (useMock) {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      const newTask = { ...taskData, status: 'pending' };
      mockData.tasks.set(id, newTask);
      return { id, ...newTask };
    }
    const insertData = toSnake(taskData);
    insertData.status = 'pending';
    const { data, error } = await supabase
      .from('tasks')
      .insert(insertData)
      .select()
      .single();
    handleError(error, 'createTask');
    return toCamel(data);
  },

  async updateTask(taskId, updateData) {
    if (useMock) {
      const task = mockData.tasks.get(taskId);
      if (!task) throw new Error("Tarea no encontrada");
      const updated = { ...task, ...updateData };
      mockData.tasks.set(taskId, updated);
      return { id: taskId, ...updated };
    }
    const { data, error } = await supabase
      .from('tasks')
      .update(toSnake(updateData))
      .eq('id', taskId)
      .select()
      .single();
    handleError(error, 'updateTask');
    return toCamel(data);
  },

  async updateTaskStatus(taskId, status) {
    return this.updateTask(taskId, { status });
  },

  async getTasksByStudent(studentId) {
    if (useMock) {
      const results = [];
      for (const [id, tsk] of mockData.tasks.entries()) {
        if (tsk.studentId === studentId) results.push({ id, ...tsk });
      }
      return results;
    }
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('student_id', studentId);
    handleError(error, 'getTasksByStudent');
    return (data || []).map(toCamel);
  },

  async getAllTasks() {
    if (useMock) {
      return Array.from(mockData.tasks.entries()).map(([id, tsk]) => ({ id, ...tsk }));
    }
    const { data, error } = await supabase
      .from('tasks')
      .select('*');
    handleError(error, 'getAllTasks');
    return (data || []).map(toCamel);
  }
};

module.exports = DB;
