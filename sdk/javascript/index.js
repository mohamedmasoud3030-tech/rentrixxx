export class RentrixClient {
  constructor({ baseUrl, apiKey }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async request(path, { method = 'GET', requestId, body } = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };
    if (requestId) headers['X-Request-Id'] = requestId;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw payload;
    return payload;
  }

  createReceipt(requestId, payload) { return this.request('/receipts', { method: 'POST', requestId, body: payload }); }
  createInvoice(requestId, payload) { return this.request('/invoices', { method: 'POST', requestId, body: payload }); }
  createContract(requestId, payload) { return this.request('/contracts', { method: 'POST', requestId, body: payload }); }
  postJournalEntries(requestId, payload) { return this.request('/journal-entries', { method: 'POST', requestId, body: payload }); }
  getLedger(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/ledger${qs ? `?${qs}` : ''}`);
  }
  getReport(report, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/reports/${report}${qs ? `?${qs}` : ''}`);
  }
}
