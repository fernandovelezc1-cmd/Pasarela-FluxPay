const express = require('express');
const wompiService = require('./wompi.service');
const config = require('./config');

const router = express.Router();

/**
 * GET /api/merchant - Obtener info del comercio y token de aceptación
 */
router.get('/merchant', async (req, res) => {
  try {
    const merchantData = await wompiService.getAcceptanceTokenAndMethods();
    res.json({ success: true, data: merchantData });
  } catch (error) {
    console.error('Error obteniendo merchant info:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'No se pudo obtener la información del comercio',
    });
  }
});

/**
 * GET /api/pse/banks - Obtener bancos para PSE
 */
router.get('/pse/banks', async (req, res) => {
  try {
    const banks = await wompiService.getFinancialInstitutions();
    res.json({ success: true, data: banks });
  } catch (error) {
    console.error('Error obteniendo bancos:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'No se pudieron obtener las instituciones financieras',
    });
  }
});

/**
 * POST /api/tokenize - Tokenizar tarjeta
 */
router.post('/tokenize', async (req, res) => {
  try {
    const { number, cvc, exp_month, exp_year, card_holder } = req.body;

    if (!number || !cvc || !exp_month || !exp_year || !card_holder) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos de la tarjeta son requeridos',
      });
    }

    const tokenData = await wompiService.tokenizeCard({
      number,
      cvc,
      exp_month,
      exp_year,
      card_holder,
    });

    res.json({ success: true, data: tokenData });
  } catch (error) {
    console.error('Error tokenizando tarjeta:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'No se pudo tokenizar la tarjeta',
    });
  }
});

/**
 * POST /api/transactions - Crear transacción
 */
router.post('/transactions', async (req, res) => {
  try {
    const {
      amount,
      currency = 'COP',
      customer_email,
      payment_method,
      customer_data,
      acceptance_token,
      description,
    } = req.body;

    if (!amount || !customer_email || !payment_method) {
      return res.status(400).json({
        success: false,
        error: 'Monto, email y método de pago son requeridos',
      });
    }

    if (!acceptance_token) {
      return res.status(400).json({
        success: false,
        error: 'El token de aceptación es requerido',
      });
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'El monto debe ser un número positivo',
      });
    }

    const reference = wompiService.generateReference();
    const amount_in_cents = Math.round(amountNum * 100);

    const transaction = await wompiService.createTransaction({
      reference,
      amount_in_cents,
      currency,
      customer_email,
      payment_method,
      customer_data,
      acceptance_token,
      redirect_url: `${config.appUrl}/resultado.html`,
    });

    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error creando transacción:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.messages || 'No se pudo crear la transacción',
    });
  }
});

/**
 * GET /api/transactions/:id - Consultar transacción por ID
 */
router.get('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({ success: false, error: 'ID inválido' });
    }
    const transaction = await wompiService.getTransaction(id);
    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error consultando transacción:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'No se pudo consultar la transacción',
    });
  }
});

/**
 * GET /api/transactions - Consultar transacción por referencia
 */
router.get('/transactions', async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'La referencia es requerida',
      });
    }
    const transactions = await wompiService.getTransactionByReference(reference);
    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Error consultando transacción:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'No se pudo consultar la transacción',
    });
  }
});

/**
 * POST /api/webhooks/wompi - Webhook de eventos de Wompi
 */
router.post('/webhooks/wompi', (req, res) => {
  try {
    const event = req.body;

    if (!event || !event.signature || !event.signature.checksum) {
      return res.status(400).json({ error: 'Evento inválido' });
    }

    const isValid = wompiService.verifyWebhookSignature(
      event.data,
      event.signature.checksum
    );

    if (!isValid) {
      console.warn('Webhook con firma inválida recibido');
      return res.status(401).json({ error: 'Firma inválida' });
    }

    const eventType = event.event;
    const transactionData = event.data.transaction;

    console.log(`[Webhook] Evento: ${eventType}`);
    console.log(`[Webhook] Referencia: ${transactionData.reference}`);
    console.log(`[Webhook] Estado: ${transactionData.status}`);

    switch (transactionData.status) {
      case 'APPROVED':
        console.log(`[Webhook] Pago aprobado: ${transactionData.reference}`);
        break;
      case 'DECLINED':
        console.log(`[Webhook] Pago rechazado: ${transactionData.reference}`);
        break;
      case 'VOIDED':
        console.log(`[Webhook] Pago anulado: ${transactionData.reference}`);
        break;
      case 'ERROR':
        console.log(`[Webhook] Error en pago: ${transactionData.reference}`);
        break;
      default:
        console.log(`[Webhook] Estado desconocido: ${transactionData.status}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error procesando webhook:', error.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
