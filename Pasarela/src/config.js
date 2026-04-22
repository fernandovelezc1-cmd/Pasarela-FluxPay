require('dotenv').config();

const env = process.env.WOMPI_ENV || 'sandbox';

const config = {
  port: process.env.PORT || 3000,
  env,
  wompiPublicKey:
    env === 'production'
      ? process.env.WOMPI_PUBLIC_KEY_PRODUCTION
      : process.env.WOMPI_PUBLIC_KEY_SANDBOX,
  wompiPrivateKey:
    env === 'production'
      ? process.env.WOMPI_PRIVATE_KEY_PRODUCTION
      : process.env.WOMPI_PRIVATE_KEY_SANDBOX,
  wompiEventsSecret:
    env === 'production'
      ? process.env.WOMPI_EVENTS_SECRET_PRODUCTION
      : process.env.WOMPI_EVENTS_SECRET_SANDBOX,
  wompiIntegritySecret:
    env === 'production'
      ? process.env.WOMPI_INTEGRITY_SECRET_PRODUCTION
      : process.env.WOMPI_INTEGRITY_SECRET_SANDBOX,
  wompiApiUrl:
    env === 'production'
      ? 'https://production.wompi.co/v1'
      : 'https://sandbox.wompi.co/v1',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
};

module.exports = config;
