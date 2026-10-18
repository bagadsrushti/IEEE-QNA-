const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '7d'
  });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin._id);

    return res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('[Auth Controller Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

const getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-password');
    return res.status(200).json({
      success: true,
      admin
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin profile'
    });
  }
};

const seedDefaultAdmin = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@clusterai.org').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const admin = new Admin({
        name: 'Lead Administrator',
        email: adminEmail,
        password: adminPassword,
        role: 'superadmin'
      });
      await admin.save();
      console.log(`[Seed] Initialized default admin account: ${adminEmail} (password: ${adminPassword})`);
    }
  } catch (err) {
    console.error('[Seed Error] Failed to seed default admin:', err.message);
  }
};

module.exports = { login, getMe, seedDefaultAdmin };
