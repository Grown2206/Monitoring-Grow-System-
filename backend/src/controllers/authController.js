const User = require('../models/User');
// const bcrypt = require('bcryptjs'); // Falls du Passwörter hashen willst
// const jwt = require('jsonwebtoken'); // Falls du Token nutzen willst

const register = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Einfache Implementierung (für Produktion bitte Hashes nutzen!)
    const user = new User({ username, password });
    await user.save();

    res.status(201).json({ message: "Benutzer erstellt", userId: user._id });
  } catch (error) {
    res.status(500).json({ message: "Registrierung fehlgeschlagen", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    
    if (!user || user.password !== password) { // Achtung: Klartext-Vergleich nur für Demo!
      return res.status(401).json({ message: "Ungültige Zugangsdaten" });
    }

    res.json({ message: "Login erfolgreich", user: { id: user._id, name: user.username } });
  } catch (error) {
    res.status(500).json({ message: "Login Fehler", error: error.message });
  }
};

module.exports = {
  register,
  login
};