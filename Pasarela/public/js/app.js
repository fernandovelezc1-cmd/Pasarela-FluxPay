document.addEventListener('DOMContentLoaded', () => {
  // ===== ELEMENTS =====
  const $ = (sel) => document.querySelector(sel);
  const alertBox = $('#alertBox');
  const amountInput = $('#amount');
  const emailInput = $('#email');
  const displayTotal = $('#displayTotal');
  const payBtn = $('#payBtn');
  const payBtnText = $('#payBtnText');
  const paySpinner = $('#paySpinner');
  const acceptTerms = $('#acceptTerms');

  // Card elements
  const cardNumber = $('#cardNumber');
  const cardHolder = $('#cardHolder');
  const expMonth = $('#expMonth');
  const expYear = $('#expYear');
  const cvc = $('#cvc');
  const installments = $('#installments');

  // Preview elements
  const cardNumberPreview = $('#cardNumberPreview');
  const cardHolderPreview = $('#cardHolderPreview');
  const cardExpiryPreview = $('#cardExpiryPreview');
  const cardBrand = $('#cardBrand');

  // Nequi
  const nequiPhone = $('#nequiPhone');

  // PSE
  const pseBank = $('#pseBank');

  let currentTab = 'card';
  let acceptanceToken = null;
  let merchantData = null;

  // ===== INITIALIZATION =====
  init();

  async function init() {
    try {
      const res = await fetch('/api/merchant');
      const json = await res.json();
      if (json.success) {
        merchantData = json.data;
        acceptanceToken =
          merchantData.presigned_acceptance?.acceptance_token;

        if (merchantData.presigned_acceptance?.permalink) {
          $('#termsLink').href =
            merchantData.presigned_acceptance.permalink;
          $('#privacyLink').href =
            merchantData.presigned_acceptance.permalink;
        }
      }
    } catch {
      showAlert('No se pudo conectar con el servicio de pagos.', 'danger');
    }

    loadBanks();
  }

  async function loadBanks() {
    try {
      const res = await fetch('/api/pse/banks');
      const json = await res.json();
      if (json.success && json.data) {
        json.data.forEach((bank) => {
          const opt = document.createElement('option');
          opt.value = bank.financial_institution_code;
          opt.textContent = bank.financial_institution_name;
          pseBank.appendChild(opt);
        });
      }
    } catch {
      // Banks not available
    }
  }

  // ===== TABS =====
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      $(`#tab-${tab}`).classList.add('active');
      currentTab = tab;
      updatePayButton();
    });
  });

  // ===== AMOUNT FORMAT =====
  amountInput.addEventListener('input', () => {
    let val = amountInput.value.replace(/[^\d]/g, '');
    if (val) {
      amountInput.value = Number(val).toLocaleString('es-CO');
      displayTotal.textContent = `$${Number(val).toLocaleString('es-CO')}`;
    } else {
      amountInput.value = '';
      displayTotal.textContent = '$0';
    }
    updatePayButton();
  });

  // ===== CARD NUMBER FORMAT & BRAND =====
  cardNumber.addEventListener('input', () => {
    let val = cardNumber.value.replace(/\D/g, '');
    val = val.substring(0, 16);
    let formatted = val.replace(/(.{4})/g, '$1 ').trim();
    cardNumber.value = formatted;

    // Preview
    const display = val.padEnd(16, '•');
    cardNumberPreview.textContent = display.replace(/(.{4})/g, '$1 ').trim();

    // Brand detection
    detectCardBrand(val);
    updatePayButton();
  });

  function detectCardBrand(num) {
    if (/^4/.test(num)) {
      cardBrand.innerHTML = '<svg viewBox="0 0 60 20" width="50" height="17"><text x="30" y="16" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="14" fill="#fff" font-style="italic">VISA</text></svg>';
    } else if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) {
      cardBrand.innerHTML = '<svg viewBox="0 0 48 30" width="40" height="25"><circle cx="16" cy="15" r="12" fill="#EB001B" opacity="0.9"/><circle cx="32" cy="15" r="12" fill="#F79E1B" opacity="0.9"/><rect x="16" y="6" width="16" height="18" fill="#FF5F00" opacity="0.8" rx="0"/></svg>';
    } else if (/^3[47]/.test(num)) {
      cardBrand.innerHTML = '<svg viewBox="0 0 60 20" width="50" height="17"><text x="30" y="16" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="13" fill="#fff">AMEX</text></svg>';
    } else if (/^36/.test(num) || /^30[0-5]/.test(num)) {
      cardBrand.innerHTML = '<svg viewBox="0 0 60 20" width="50" height="17"><text x="30" y="15" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="11" fill="#fff">DINERS</text></svg>';
    } else {
      cardBrand.innerHTML = '';
    }
  }

  cardHolder.addEventListener('input', () => {
    cardHolderPreview.textContent =
      cardHolder.value.toUpperCase() || 'TU NOMBRE';
    updatePayButton();
  });

  expMonth.addEventListener('change', updateExpiryPreview);
  expYear.addEventListener('change', updateExpiryPreview);

  function updateExpiryPreview() {
    const m = expMonth.value || 'MM';
    const y = expYear.value || 'AA';
    cardExpiryPreview.textContent = `${m}/${y}`;
    updatePayButton();
  }

  cvc.addEventListener('input', () => {
    cvc.value = cvc.value.replace(/\D/g, '');
    updatePayButton();
  });

  nequiPhone.addEventListener('input', () => {
    nequiPhone.value = nequiPhone.value.replace(/\D/g, '');
    updatePayButton();
  });

  $('#customerPhone').addEventListener('input', () => {
    $('#customerPhone').value = $('#customerPhone').value.replace(/\D/g, '');
  });

  $('#pseDocNumber').addEventListener('input', () => {
    $('#pseDocNumber').value = $('#pseDocNumber').value.replace(/\D/g, '');
  });

  // ===== TERMS =====
  acceptTerms.addEventListener('change', updatePayButton);

  // ===== VALIDATE =====
  function getAmount() {
    return Number(amountInput.value.replace(/[^\d]/g, ''));
  }

  function isFormValid() {
    const amount = getAmount();
    const email = emailInput.value.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!amount || amount < 100 || !emailValid || !acceptTerms.checked) {
      return false;
    }

    if (currentTab === 'card') {
      const num = cardNumber.value.replace(/\s/g, '');
      return (
        num.length >= 13 &&
        num.length <= 16 &&
        cardHolder.value.trim().length >= 3 &&
        expMonth.value &&
        expYear.value &&
        cvc.value.length >= 3
      );
    }

    if (currentTab === 'nequi') {
      return nequiPhone.value.length === 10;
    }

    if (currentTab === 'pse') {
      return (
        pseBank.value &&
        $('#pseDocNumber').value.trim().length >= 5
      );
    }

    return false;
  }

  function updatePayButton() {
    const valid = isFormValid();
    payBtn.disabled = !valid;
    const amount = getAmount();
    if (amount > 0) {
      payBtnText.textContent = `Pagar $${amount.toLocaleString('es-CO')} COP`;
    } else {
      payBtnText.textContent = 'Pagar';
    }
  }

  // ===== ALERTS =====
  function showAlert(message, type = 'danger') {
    alertBox.className = `alert alert-${type} show`;
    alertBox.innerHTML = `<span>${type === 'danger' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}</span><span>${escapeHtml(message)}</span>`;
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    alertBox.className = 'alert';
    alertBox.innerHTML = '';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== PAY =====
  payBtn.addEventListener('click', handlePay);

  async function handlePay() {
    if (!isFormValid()) return;
    hideAlert();
    setLoading(true);

    try {
      const amount = getAmount();
      const email = emailInput.value.trim();
      const name = $('#customerName').value.trim();
      const phone = $('#customerPhone').value.trim();

      let payment_method = {};

      if (currentTab === 'card') {
        // 1. Tokenize card
        const tokenRes = await fetch('/api/tokenize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            number: cardNumber.value.replace(/\s/g, ''),
            cvc: cvc.value,
            exp_month: expMonth.value,
            exp_year: expYear.value,
            card_holder: cardHolder.value.trim(),
          }),
        });

        const tokenJson = await tokenRes.json();
        if (!tokenJson.success) {
          throw new Error(tokenJson.error || 'Error al tokenizar la tarjeta');
        }

        payment_method = {
          type: 'CARD',
          token: tokenJson.data.id,
          installments: Number(installments.value),
        };
      } else if (currentTab === 'nequi') {
        payment_method = {
          type: 'NEQUI',
          phone_number: nequiPhone.value,
        };
      } else if (currentTab === 'pse') {
        payment_method = {
          type: 'PSE',
          user_type: Number($('#psePersonType').value),
          user_legal_id_type: $('#pseDocType').value,
          user_legal_id: $('#pseDocNumber').value,
          financial_institution_code: pseBank.value,
          payment_description: 'Pago en línea',
        };
      }

      // 2. Create transaction
      const txRes = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'COP',
          customer_email: email,
          payment_method,
          customer_data: {
            full_name: name || undefined,
            phone_number: phone || undefined,
            legal_id: currentTab === 'pse' ? $('#pseDocNumber').value : undefined,
            legal_id_type: currentTab === 'pse' ? $('#pseDocType').value : undefined,
          },
          acceptance_token: acceptanceToken,
        }),
      });

      const txJson = await txRes.json();
      if (!txJson.success) {
        const errMsg =
          typeof txJson.error === 'object'
            ? JSON.stringify(txJson.error)
            : txJson.error;
        throw new Error(errMsg || 'Error al crear la transacción');
      }

      const tx = txJson.data;

      // PSE redirect
      if (currentTab === 'pse' && tx.payment_method?.extra?.async_payment_url) {
        window.location.href = tx.payment_method.extra.async_payment_url;
        return;
      }

      // Nequi: poll for approval
      if (currentTab === 'nequi') {
        setLoading(false);
        await pollNequiTransaction(tx.id, tx.reference);
        return;
      }

      // Redirect to result
      const params = new URLSearchParams({
        id: tx.id,
        ref: tx.reference,
      });
      window.location.href = `/resultado.html?${params.toString()}`;
    } catch (error) {
      showAlert(error.message || 'Ocurrió un error al procesar el pago');
    } finally {
      setLoading(false);
    }
  }

  function setLoading(loading) {
    payBtn.disabled = loading;
    payBtnText.style.display = loading ? 'none' : 'inline';
    paySpinner.style.display = loading ? 'inline-block' : 'none';
  }

  // ===== NEQUI POLLING =====
  async function pollNequiTransaction(txId, reference) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'nequi-overlay';
    overlay.innerHTML = `
      <div class="nequi-overlay-card">
        <div class="nequi-logo-big">
          <svg viewBox="0 0 24 24" width="56" height="56"><rect width="24" height="24" rx="5" fill="#E21068"/><path d="M6 6h3v7.5l5-7.5h3v12h-3V10.5l-5 7.5H6V6z" fill="#fff"/></svg>
        </div>
        <h3>Aprueba el pago en Nequi</h3>
        <p>Abre tu app de Nequi y aprueba la solicitud de pago. Estamos esperando tu confirmación.</p>
        <div class="nequi-spinner"></div>
        <div class="nequi-status">Esperando aprobación...</div>
        <button type="button" class="btn-cancel-nequi" id="cancelNequiBtn">Cancelar</button>
      </div>
    `;
    document.body.appendChild(overlay);

    let cancelled = false;
    const statusEl = overlay.querySelector('.nequi-status');

    overlay.querySelector('#cancelNequiBtn').addEventListener('click', () => {
      cancelled = true;
      overlay.remove();
    });

    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts && !cancelled; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      if (cancelled) break;

      try {
        const res = await fetch(`/api/transactions/${encodeURIComponent(txId)}`);
        const json = await res.json();

        if (json.success && json.data) {
          const status = json.data.status;
          if (status === 'APPROVED') {
            overlay.remove();
            window.location.href = `/resultado.html?id=${encodeURIComponent(txId)}&ref=${encodeURIComponent(reference)}`;
            return;
          } else if (status === 'DECLINED' || status === 'ERROR' || status === 'VOIDED') {
            overlay.remove();
            window.location.href = `/resultado.html?id=${encodeURIComponent(txId)}&ref=${encodeURIComponent(reference)}`;
            return;
          }
          statusEl.textContent = `Esperando aprobación... (${i + 1}/${maxAttempts})`;
        }
      } catch {
        statusEl.textContent = 'Reintentando conexión...';
      }
    }

    if (!cancelled) {
      overlay.remove();
      window.location.href = `/resultado.html?id=${encodeURIComponent(txId)}&ref=${encodeURIComponent(reference)}`;
    }
  }
});
