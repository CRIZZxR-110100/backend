const DB = require('../config/db');

const getProfile = async (req, res) => {
  try {
    const user = await DB.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      tutorId: user.tutorId,
      invitationCode: user.invitationCode
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'El nombre y correo son requeridos.' });
    }

    // Verificar si el nuevo email ya está en uso por otro usuario
    const existingUser = await DB.getUserByEmail(email);
    if (existingUser && existingUser.id !== req.user.id) {
      return res.status(400).json({ error: 'El correo ya está en uso por otra cuenta.' });
    }

    const updatedUser = await DB.updateUser(req.user.id, { name, email });

    res.json({
      message: 'Perfil actualizado exitosamente',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status
      }
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

const getMyMessages = async (req, res) => {
  try {
    const messages = await DB.getMessagesByStudent(req.user.id);
    res.json(messages);
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

const joinTutor = async (req, res) => {
  try {
    const { invitationCode } = req.body;
    
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Solo los alumnos pueden unirse a un tutor.' });
    }

    if (!invitationCode) {
      return res.status(400).json({ error: 'El código de tutor es requerido.' });
    }

    const tutor = await DB.getTutorByInvitationCode(invitationCode.toUpperCase());
    
    if (!tutor) {
      return res.status(404).json({ error: 'Código de tutor inválido.' });
    }

    const updatedUser = await DB.updateUser(req.user.id, {
      tutorId: tutor.id,
      status: 'pending' // Estado pendiente hasta que el tutor apruebe
    });

    res.json({
      message: 'Solicitud enviada al tutor. Esperando aprobación.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        tutorId: updatedUser.tutorId
      }
    });

  } catch (error) {
    console.error('Error al unirse a tutor:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};
const subscribeToNotifications = async (req, res) => {
  try {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Suscripción inválida' });
    }
    
    await DB.savePushSubscription(req.user.id, subscription);
    res.status(201).json({ message: 'Suscripción guardada exitosamente' });
  } catch (error) {
    console.error('Error al guardar suscripción de notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

module.exports = { getProfile, updateProfile, getMyMessages, joinTutor, subscribeToNotifications };
