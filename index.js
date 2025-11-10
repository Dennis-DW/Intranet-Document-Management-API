const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const cluster = require('cluster');
const os = require('os');
const connectDB = require('./config/database');
const storageConfig = require('./config/storage.config');
const ipVerificationMiddleware = require('./middleware/ipVerification');

// --- Route Imports ---
const authRoutes = require('./routes/auth.routes');
const documentRoutes = require('./routes/document.routes');
const teamRoutes = require('./routes/team.routes');
const statsRoutes = require('./routes/stats.routes');
const userRoutes = require('./routes/user.routes');
const healthRoutes = require('./routes/health.routes');
const notificationRoutes = require('./routes/notification.routes');

//  Import API documentation content ---
const { apiDocumentationHtml } = require('./utils/apiDocumentation');

// Load environment variables from .env file
dotenv.config();

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers for each CPU core.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Forking a new worker...`);
    cluster.fork();
  });

} else {
  // Worker processes have a copy of the parent's environment and can share any TCP connection
  // In this case it is an HTTP server

  // Initialize Express app
  const app = express();

  // --- Connect to Database ---
  // Call the async function to connect to MongoDB
  connectDB();

  // --- Ensure Upload Directories Exist ---
  // This prevents crashes if the directories are missing when using local storage.
  const avatarsDir = path.join(__dirname, 'uploads', 'avatars');
  const tempDir = path.join(__dirname, 'uploads', 'temp');
  fs.mkdirSync(avatarsDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });
  console.log('[Setup] Upload directories ensured.');


  // --- Apply Global Middleware ---

  // Set various security-related HTTP headers
  // app.use(helmet()); // Can be re-enabled for production

  // Configure CORS
  const corsOptions = {
    // Allow requests from your future frontend origin
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true, // Allow cookies to be sent
  };
  app.use(cors(corsOptions));

  // Middleware to parse incoming JSON bodies
  app.use(express.json());

  // Add cookie-parser middleware
  app.use(cookieParser());

  // --- CRITICAL SECURITY SETTING ---
  // As per the blueprint, trust the reverse proxy
  app.set('trust proxy', 1);

  // --- Health Check Route (Public) ---
  // This must be mounted *before* the IP whitelist middleware.
  app.use('/api/health', healthRoutes);

  // --- IP Whitelisting Middleware ---
  // This is the first line of defense, applied to ALL routes.
  app.use(ipVerificationMiddleware);

  // --- Serve Static Assets ---
  // Make the 'assets' folder publicly accessible under the /assets path
  app.use('/assets', express.static(path.join(__dirname, 'assets')));
  // Only serve local avatars if GCS is not configured
  if (!storageConfig.isGcsConfigured) {
    app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads', 'avatars')));
  }

  // --- API Documentation Route ---
  // This route is *after* the IP whitelist, so only trusted IPs can see it.
  app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    // --- NEW: Send the imported HTML string, passing the client's IP and network name ---
    res.send(apiDocumentationHtml(req.ip, req.networkName));
  });

  // --- Mount API Routes ---
  // All auth routes will be prefixed with /api/auth
  app.use('/api/auth', authRoutes);
  // All document routes will be prefixed with /api/documents
  app.use('/api/documents', documentRoutes);
  // All team routes will be prefixed with /api/team
  app.use('/api/team', teamRoutes);
  // All stats routes will be prefixed with /api/stats
  app.use('/api/stats', statsRoutes);
  // All user profile routes will be prefixed with /api/users
  app.use('/api/users', userRoutes);
  // All notification routes will be prefixed with /api/notifications
  app.use('/api/notifications', notificationRoutes);

  // --- Global Error Handling ---
  app.use((err, req, res, next) => {
    console.error(err.stack);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).send('Something broke!');
  });

  // --- Start the Server ---
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} started and listening on port ${PORT}`);
  });
}
