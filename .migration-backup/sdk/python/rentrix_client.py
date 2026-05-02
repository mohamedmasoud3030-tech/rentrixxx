import requests


class RentrixClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key

    def _request(self, path: str, method: str = 'GET', request_id: str | None = None, payload: dict | None = None):
        headers = {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key,
        }
        if request_id:
            headers['X-Request-Id'] = request_id

        response = requests.request(method, f"{self.base_url}{path}", headers=headers, json=payload, timeout=30)
        data = response.json() if response.text else {}
        if response.status_code >= 400:
            raise RuntimeError(data)
        return data

    def create_receipt(self, request_id: str, payload: dict):
        return self._request('/receipts', method='POST', request_id=request_id, payload=payload)

    def create_invoice(self, request_id: str, payload: dict):
        return self._request('/invoices', method='POST', request_id=request_id, payload=payload)

    def create_contract(self, request_id: str, payload: dict):
        return self._request('/contracts', method='POST', request_id=request_id, payload=payload)

    def post_journal_entries(self, request_id: str, payload: dict):
        return self._request('/journal-entries', method='POST', request_id=request_id, payload=payload)

    def get_ledger(self, params: dict | None = None):
        q = ''
        if params:
            q = '?' + '&'.join(f"{k}={v}" for k, v in params.items())
        return self._request(f'/ledger{q}')

    def get_report(self, report: str, params: dict | None = None):
        q = ''
        if params:
            q = '?' + '&'.join(f"{k}={v}" for k, v in params.items())
        return self._request(f'/reports/{report}{q}')
