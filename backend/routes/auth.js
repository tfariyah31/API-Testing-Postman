const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/auth');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth'); 
const {authLimiter, blockInjectionAttempts} = require('../middleware/rateLimit');
const { validateRegister, validateLogin } = require('../middleware/validation');
const authController = require('../controllers/auth');

router.post('/login', blockInjectionAttempts,authLimiter, login);

router.post('/register', validateRegister, async (req, res) => {
    try {

        // Check for unknown fields
        const allowedFields = ['name', 'email', 'password'];
        const receivedFields = Object.keys(req.body);
        const unknownFields = receivedFields.filter(field => !allowedFields.includes(field));
        
        if (unknownFields.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Unknown field(s) detected: ${unknownFields.join(', ')}. Allowed fields: name, email, password` 
            });
        }
        
        const { name, email, password } = req.body;

       
        // Check if user already exists by email
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email already exists' 
            });
        }

        // Create new user 
        const user = new User({
            name,
            email,
            password,
            isBlocked: false // default value
        });

        await user.save();

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            id: user._id.toString(),
            email: user.email,
            emailVerified: false,
            name: user.name,
            isBlocked: user.isBlocked
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during registration',
        });
    }
});

router.post('/logout' , authMiddleware, async (req, res) => { 
    try {
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Logout failed' });
    }
});


router.post('/refresh', authController.refreshToken);

module.exports = router;