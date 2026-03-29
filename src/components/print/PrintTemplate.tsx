import React from 'react';
import { DocumentHeaderInline } from '../shared/DocumentHeader';
import { CompanyInfo, Settings } from '../../types';

interface ReceiptPrintData {
  no: string;
  date: string;
  tenantName: string;
  amount: string;
  description?: string;
}

interface ReceiptPrintProps {
  data: ReceiptPrintData;
  settings: Settings & { company?: CompanyInfo };
}

const FALLBACK_COMPANY: CompanyInfo = { name: 'Rentrix', address: '', phone: '' };

export const ReceiptPrint: React.FC<ReceiptPrintProps> = ({ data, settings }) => {
  const company = settings.general?.company || settings.company || FALLBACK_COMPANY;
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

      <div className="signature-section" style={{ marginTop: '60px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', paddingTop: '20px' }}>
        <div className="signature-block">
          <div className="signature-label">التاريخ:</div>
          <div className="signature-line" style={{ minHeight: '30px' }}></div>
          <div className="signature-date">{data.date}</div>
        </div>
        <div className="signature-block">
          <div className="signature-label">توقيع المستلم:</div>
          <div className="signature-line"></div>
          <div style={{ fontSize: '10pt', marginTop: '8px' }}>الاسم: ..................</div>
        </div>
        <div className="signature-block">
          <div className="signature-label">ختم المؤسسة / التوقيع:</div>
          <br/>
          {stamp ? (
            <img src={stamp} alt="ختم المؤسسة" style={{ width: '100px', height: '100px', margin: '0 auto', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '100px', height: '100px', border: '2px dashed #999', borderRadius: '50%', margin: '0 auto' }}></div>
          )}
        </div>
      </div>
    </div>
  );
};
