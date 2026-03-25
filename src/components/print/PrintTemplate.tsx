import React from 'react';
import { DocumentHeaderInline } from '../shared/DocumentHeader';

export const ReceiptPrint = ({ data, settings }: any) => {
  const company = settings.general?.company || settings.company || {};
  const logo = settings.appearance?.logoDataUrl;
  const stamp = settings.appearance?.stampDataUrl;

  return (
    <div id="receipt-print-area" className="print-only" style={{
      direction: 'rtl', padding: '40px', background: 'white', minHeight: '297mm', color: '#333', fontFamily: 'Cairo, sans-serif'
    }}>
      <DocumentHeaderInline
        company={company}
        logoUrl={logo}
        docTitle="سند قبض نقدي"
        docNo={data.no}
        docDate={data.date}
      />

      <div style={{ marginTop: '20px', fontSize: '16px', lineHeight: '2.5' }}>
        <p>استلمنا من السيد/ة: <span style={{ borderBottom: '1px dotted #000', padding: '0 20px', fontWeight: 'bold' }}>{data.tenantName}</span></p>
        <p>مبلغاً وقدره: <span style={{ fontWeight: 'bold', backgroundColor: '#f7fafc', padding: '5px 15px', border: '1px solid #e2e8f0', borderRadius: '5px' }}>{data.amount}</span></p>
        <p>
          وذلك عن: <span style={{ fontStyle: 'italic' }}>{data.description || 'إيجار شهر محدد'}</span>
        </p>
      </div>

      <div style={{ marginTop: '100px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center' }}>
          <p>توقيع المستلم:</p>
          <br/><br/>
          <p>....................</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p>ختم المؤسسة:</p>
          <br/>
          {stamp ? (
            <img src={stamp} alt="ختم المؤسسة" style={{ width: '120px', height: 'auto', margin: '0 auto' }} />
          ) : (
            <div style={{ width: '100px', height: '100px', border: '2px solid #edf2f7', borderRadius: '50%', margin: '0 auto' }}></div>
          )}
        </div>
      </div>
    </div>
  );
};
