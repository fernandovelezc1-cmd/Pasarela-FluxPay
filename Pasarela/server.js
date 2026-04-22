const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const config = require('./src/config');
const routes = require('./src/routes');

const app = express();

// Seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.wompi.co"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://sandbox.wompi.co", "https://production.wompi.co"],
      frameSrc: ["'self'", "https://checkout.wompi.co"],
    },
  },
}));

app.use(cors());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes, intente de nuevo más tarde' },
});
app.use('/api/', apiLimiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas API
app.use('/api', routes);

// Iniciar servidor
app.listen(config.port, () => {
  console.log('═══════════════════════════════════════════');
  console.log(`  🟢  Pasarela de Pagos Wompi`);
  console.log(`  📌  Ambiente: ${config.env.toUpperCase()}`);
  console.log(`  🌐  URL: http://localhost:${config.port}`);
  console.log('═══════════════════════════════════════════');
});
