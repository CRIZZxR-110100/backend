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
      status: user.status
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

module.exports = { getProfile, updateProfile, getMyMessages };
