const axios = require('axios');
const crypto = require('crypto');
const config = require('./config');

class WompiService {
  constructor() {
    this.api = axios.create({
      baseURL: config.wompiApiUrl,
      headers: {
        Authorization: `Bearer ${config.wompiPrivateKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Obtener los métodos de pago aceptados por el comercio
   */
  async getAcceptanceTokenAndMethods() {
    const response = await this.api.get(
      `/merchants/${config.wompiPublicKey}`
    );
    return response.data.data;
  }

  /**
   * Tokenizar tarjeta de crédito/débito
   */
  async tokenizeCard(cardData) {
    const response = await axios.post(
      `${config.wompiApiUrl}/tokens/cards`,
      {
        number: cardData.number,
        cvc: cardData.cvc,
        exp_month: cardData.exp_month,
        exp_year: cardData.exp_year,
        card_holder: cardData.card_holder,
      },
      {
        headers: {
          Authorization: `Bearer ${config.wompiPublicKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.data;
  }

  /**
   * Crear una fuente de pago (PSE, Nequi, etc.)
   */
  async createPaymentSource(sourceData) {
    const response = await this.api.post('/payment_sources', {
      type: sourceData.type,
      token: sourceData.token,
      customer_email: sourceData.customer_email,
      acceptance_token: sourceData.acceptance_token,
    });
    return response.data.data;
  }

  /**
   * Generar firma de integridad para la transacción
   */
  generateIntegritySignature(reference, amountInCents, currency) {
    const concatenated = `${reference}${amountInCents}${currency}${config.wompiIntegritySecret}`;
    return crypto.createHash('sha256').update(concatenated).digest('hex');
  }

  /**
   * Crear una transacción
   */
  async createTransaction(transactionData) {
    const {
      reference,
      amount_in_cents,
      currency,
      customer_email,
      payment_method,
      customer_data,
      acceptance_token,
      redirect_url,
    } = transactionData;

    const signature = this.generateIntegritySignature(
      reference,
      amount_in_cents,
      currency
    );

    const payload = {
      amount_in_cents,
      currency,
      customer_email,
      payment_method,
      reference,
      signature,
      acceptance_token,
      customer_data,
    };

    if (redirect_url) {
      payload.redirect_url = redirect_url;
    }

    const response = await this.api.post('/transactions', payload);
    return response.data.data;
  }

  /**
   * Consultar el estado de una transacción
   */
  async getTransaction(transactionId) {
    const response = await this.api.get(`/transactions/${transactionId}`);
    return response.data.data;
  }

  /**
   * Consultar transacción por referencia
   */
  async getTransactionByReference(reference) {
    const response = await this.api.get(
      `/transactions?reference=${encodeURIComponent(reference)}`
    );
    return response.data.data;
  }

  /**
   * Anular (void) una transacción
   */
  async voidTransaction(transactionId) {
    const response = await this.api.post(
      `/transactions/${transactionId}/void`
    );
    return response.data.data;
  }

  /**
   * Obtener lista de instituciones financieras (para PSE)
   */
  async getFinancialInstitutions() {
    const response = await this.api.get(
      '/pse/financial_institutions'
    );
    return response.data.data;
  }

  /**
   * Verificar firma de evento webhook
   */
  verifyWebhookSignature(eventData, receivedSignature) {
    const properties = eventData.signature.properties;
    const values = properties.map((prop) => {
      const keys = prop.split('.');
      let value = eventData;
      for (const key of keys) {
        value = value[key];
      }
      return value;
    });

    const concatenated =
      values.join('') + eventData.timestamp + config.wompiEventsSecret;
    const computedSignature = crypto
      .createHash('sha256')
      .update(concatenated)
      .digest('hex');

    return computedSignature === receivedSignature;
  }

  /**
   * Generar referencia única
   */
  generateReference(prefix = 'PAY') {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `${prefix}-${timestamp}-${random}`;
  }
}

module.exports = new WompiService();
