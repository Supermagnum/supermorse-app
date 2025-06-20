const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import database configuration
const { sequelize, testConnection, initDatabase } = require('./config/database');

// Import models
const User = require('./models/User');
const Progress = require('./models/Progress');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'supermorse-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Connect to PostgreSQL
(async () => {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('Failed to connect to PostgreSQL. Please check your configuration.');
      return;
    }
    
    // Initialize database (sync models)
    const initialized = await initDatabase();
    if (!initialized) {
      console.error('Failed to initialize database. Please check your models.');
      return;
    }
    
    console.log('Connected to PostgreSQL and initialized database successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
})();

// Passport configuration
passport.use(new LocalStrategy(
  { usernameField: 'username' },
  async (username, password, done) => {
    try {
      const user = await User.findOne({ where: { username } });
      if (!user) {
        return done(null, false, { message: 'Incorrect username' });
      }
      
      const isValidPassword = await user.isValidPassword(password);
      if (!isValidPassword) {
        return done(null, false, { message: 'Incorrect password' });
      }
      
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Import routes
const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');
const mumbleRoutes = require('./routes/mumble');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/mumble', mumbleRoutes);

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Handle Morse code practice sessions
  socket.on('practice-start', (data) => {
    // Handle practice session start
  });
  
  socket.on('practice-result', async (data) => {
    // Save practice results to database
    if (socket.request.user) {
      try {
        await Progress.updateProgress(socket.request.user.id, data);
      } catch (err) {
        console.error('Error saving progress:', err);
      }
    }
  });
  
  // Handle Mumble/Murmur integration
  socket.on('mumble-connect', (data) => {
    // Connect to Mumble/Murmur server
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});