const { db: firestore } = require('./firebase');

const useMock = process.env.USE_MOCK_DB === 'true' || !firestore;

const mockData = {
  users: new Map(),
  grades: new Map(),
  messages: new Map(),
  subjects: new Map(), // { studentId, name, totalPartials }
  partialGrades: new Map(), // { subjectId, partialName, grade }
  tasks: new Map() // { subjectId, studentId, title, dueDate, status }
};

const DB = {
  async getUserById(id) {
    if (useMock) return mockData.users.get(id) || null;
    const doc = await firestore.collection('users').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },
  async getUserByEmail(email) {
    if (useMock) {
      for (const [id, user] of mockData.users.entries()) {
        if (user.email === email) return { id, ...user };
      }
      return null;
    }
    const snapshot = await firestore.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },
  async createUser(user) {
    // user: name, email, password, role ('student'|'tutor'), tutorId (optional), status ('active'|'baja')
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
    const docRef = await firestore.collection('users').add(newUser);
    return { id: docRef.id, ...newUser };
  },
  async updateUser(id, data) {
    if (useMock) {
      const user = mockData.users.get(id);
      if (!user) throw new Error("Usuario no encontrado");
      const updatedUser = { ...user, ...data };
      mockData.users.set(id, updatedUser);
      return { id, ...updatedUser };
    }
    await firestore.collection('users').doc(id).update(data);
    const updated = await firestore.collection('users').doc(id).get();
    return { id: updated.id, ...updated.data() };
  },
  async getAllStudents() {
    if (useMock) {
      const students = [];
      for (const [id, user] of mockData.users.entries()) {
        if (user.role === 'student') students.push({ id, ...user });
      }
      return students;
    }
    const snapshot = await firestore.collection('users').where('role', '==', 'student').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  // GRADES
  async getGradesByStudent(studentId) {
    if (useMock) {
      const grades = [];
      for (const [id, grade] of mockData.grades.entries()) {
        if (grade.studentId === studentId) grades.push({ id, ...grade });
      }
      return grades;
    }
    const snapshot = await firestore.collection('grades').where('studentId', '==', studentId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  async getAllGrades() {
    if (useMock) {
      const grades = [];
      for (const [id, grade] of mockData.grades.entries()) {
        grades.push({ id, ...grade });
      }
      return grades;
    }
    const snapshot = await firestore.collection('grades').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  async addGrade(studentId, gradeData) {
    // gradeData: semester, subject, grade
    const isApproved = parseFloat(gradeData.grade) >= 6.0;
    const newGrade = { ...gradeData, studentId, status: isApproved ? 'aprobada' : 'reprobada', createdAt: new Date().toISOString() };
    if (useMock) {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      mockData.grades.set(id, newGrade);
      return { id, ...newGrade };
    }
    const docRef = await firestore.collection('grades').add(newGrade);
    return { id: docRef.id, ...newGrade };
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
    await firestore.collection('grades').doc(id).update(updateData);
    const updated = await firestore.collection('grades').doc(id).get();
    return { id: updated.id, ...updated.data() };
  },
  
  // MESSAGES
  async getMessagesByStudent(studentId) {
    if (useMock) {
      const msgs = [];
      for (const [id, msg] of mockData.messages.entries()) {
        if (msg.studentId === studentId) msgs.push({ id, ...msg });
      }
      return msgs;
    }
    const snapshot = await firestore.collection('messages').where('studentId', '==', studentId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  async sendMessage(tutorId, studentId, content) {
    const newMsg = { tutorId, studentId, content, date: new Date().toISOString() };
    if (useMock) {
      const id = Date.now().toString();
      mockData.messages.set(id, newMsg);
      return { id, ...newMsg };
    }
    const docRef = await firestore.collection('messages').add(newMsg);
    return { id: docRef.id, ...newMsg };
  },

  // ACADEMIC (Subjects, Partials, Tasks)
  async createSubject(subjectData) {
    if (useMock) {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      mockData.subjects.set(id, subjectData);
      return { id, ...subjectData };
    }
    const docRef = await firestore.collection('subjects').add(subjectData);
    return { id: docRef.id, ...subjectData };
  },
  async getSubjectsByStudent(studentId) {
    if (useMock) {
      const results = [];
      for (const [id, subj] of mockData.subjects.entries()) {
        if (subj.studentId === studentId) results.push({ id, ...subj });
      }
      return results;
    }
    const snapshot = await firestore.collection('subjects').where('studentId', '==', studentId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  async getAllSubjects() {
    if (useMock) {
      return Array.from(mockData.subjects.entries()).map(([id, subj]) => ({ id, ...subj }));
    }
    const snapshot = await firestore.collection('subjects').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  async getSubjectById(subjectId) {
    if (useMock) {
      return mockData.subjects.has(subjectId) ? { id: subjectId, ...mockData.subjects.get(subjectId) } : null;
    }
    const doc = await firestore.collection('subjects').doc(subjectId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },
  async updateSubject(id, data) {
    if (useMock) {
      const subject = mockData.subjects.get(id);
      if (!subject) throw new Error("Materia no encontrada");
      const updated = { ...subject, ...data };
      mockData.subjects.set(id, updated);
      return { id, ...updated };
    }
    await firestore.collection('subjects').doc(id).update(data);
    const updated = await firestore.collection('subjects').doc(id).get();
    return { id: updated.id, ...updated.data() };
  },

  async createPartialGrade(partialData) {
    if (useMock) {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      mockData.partialGrades.set(id, partialData);
      return { id, ...partialData };
    }
    const docRef = await firestore.collection('partialGrades').add(partialData);
    return { id: docRef.id, ...partialData };
  },
  async getPartialGradesBySubject(subjectId) {
    if (useMock) {
      const results = [];
      for (const [id, pg] of mockData.partialGrades.entries()) {
        if (pg.subjectId === subjectId) results.push({ id, ...pg });
      }
      return results;
    }
    const snapshot = await firestore.collection('partialGrades').where('subjectId', '==', subjectId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  async getAllPartialGrades() {
    if (useMock) {
      return Array.from(mockData.partialGrades.entries()).map(([id, pg]) => ({ id, ...pg }));
    }
    const snapshot = await firestore.collection('partialGrades').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  async updatePartialGrade(id, data) {
    if (useMock) {
      const partial = mockData.partialGrades.get(id);
      if (!partial) throw new Error("Calificación no encontrada");
      const updated = { ...partial, ...data };
      mockData.partialGrades.set(id, updated);
      return { id, ...updated };
    }
    await firestore.collection('partialGrades').doc(id).update(data);
    const updated = await firestore.collection('partialGrades').doc(id).get();
    return { id: updated.id, ...updated.data() };
  },
  async deletePartialGrade(id) {
    if (useMock) {
      mockData.partialGrades.delete(id);
      return { success: true };
    }
    await firestore.collection('partialGrades').doc(id).delete();
    return { success: true };
  },

  async createTask(taskData) {
    if (useMock) {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      const newTask = { ...taskData, status: 'pending' };
      mockData.tasks.set(id, newTask);
      return { id, ...newTask };
    }
    const newTask = { ...taskData, status: 'pending' };
    const docRef = await firestore.collection('tasks').add(newTask);
    return { id: docRef.id, ...newTask };
  },
  async updateTask(taskId, data) {
    if (useMock) {
      const task = mockData.tasks.get(taskId);
      if (!task) throw new Error("Tarea no encontrada");
      const updated = { ...task, ...data };
      mockData.tasks.set(taskId, updated);
      return { id: taskId, ...updated };
    }
    await firestore.collection('tasks').doc(taskId).update(data);
    const updated = await firestore.collection('tasks').doc(taskId).get();
    return { id: updated.id, ...updated.data() };
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
    const snapshot = await firestore.collection('tasks').where('studentId', '==', studentId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  async getAllTasks() {
    if (useMock) {
      return Array.from(mockData.tasks.entries()).map(([id, tsk]) => ({ id, ...tsk }));
    }
    const snapshot = await firestore.collection('tasks').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

module.exports = DB;
