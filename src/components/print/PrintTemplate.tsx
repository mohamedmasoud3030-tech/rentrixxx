import React from 'react';

export const ReceiptPrint = ({ data, settings }: any) => (
  <div id="receipt-print-area" className="print-only" style={{
    direction: 'rtl', padding: '40px', background: 'white', minHeight: '297mm', color: '#333', fontFamily: 'Cairo, sans-serif'
  }}>
    {/* Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #1a365d', paddingBottom: '10px', alignItems: 'flex-end' }}>
      <div>
        <h1 style={{ color: '#1a365d', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{settings.general.company.name}</h1>
        <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>سجل تجاري: {settings.general.company.crNumber}</p>
        <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>الرقم الضريبي: {settings.general.company.taxNumber}</p>
      </div>
      <div style={{ textAlign: 'left' }}>
        <h2 style={{ color: '#718096', margin: 0, fontSize: '22px', fontWeight: 'bold' }}>سند قبض نقدي</h2>
        <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>رقم السند: <strong>{data.no}</strong></p>
        <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>التاريخ: {data.date}</p>
      </div>
    </div>

    {/* Body */}
    <div style={{ marginTop: '50px', fontSize: '16px', lineHeight: '2.5' }}>
      <p>استلمنا من السيد/ة: <span style={{ borderBottom: '1px dotted #000', padding: '0 20px', fontWeight: 'bold' }}>{data.tenantName}</span></p>
      <p>مبلغاً وقدره: <span style={{ fontWeight: 'bold', backgroundColor: '#f7fafc', padding: '5px 15px', border: '1px solid #e2e8f0', borderRadius: '5px' }}>{data.amount}</span></p>
      <p>
        وذلك عن: <span style={{ fontStyle: 'italic' }}>{data.description || 'إيجار شهر محدد'}</span>
      </p>
    </div>

    {/* Signatures */}
    <div style={{ marginTop: '100px', display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ textAlign: 'center' }}>
        <p>توقيع المستلم:</p>
        <br/><br/>
        <p>....................</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p>ختم المؤسسة:</p>
        <br/><br/>
        <div style={{ width: '100px', height: '100px', border: '2px solid #edf2f7', borderRadius: '50%', margin: '0 auto' }}></div>
      </div>
    </div>
  </div>
);