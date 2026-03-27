import React from 'react';
import { toArabicDigits } from '../../utils/helpers';

interface PrintPageLayoutProps {
  company: {
    name: string;
    phone?: string;
    address?: string;
    crNumber?: string;
    taxNumber?: string;
  };
  logoUrl?: string;
  stampUrl?: string;
  docTitle: string;
  docNo?: string;
  docDate?: string;
  children: React.ReactNode;
  footerText?: string;
}

export const PrintPageLayout: React.FC<PrintPageLayoutProps> = ({
  company,
  logoUrl,
  stampUrl,
  docTitle,
  docNo,
  docDate,
  children,
  footerText,
}) => {
  return (
    <div style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '15mm',
      margin: '0 auto',
      background: 'white',
      fontFamily: "'Cairo', sans-serif",
      direction: 'rtl',
      color: '#333',
      boxSizing: 'border-box',
      fontSize: '13px',
      lineHeight: '1.6',
    }}>
      {/* Unified Header */}
      <div style={{
        textAlign: 'center',
        borderBottom: '3px solid #1e3a8a',
        paddingBottom: '15px',
        marginBottom: '20px',
      }}>
        {/* Logo and Company Info */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          marginBottom: '10px',
        }}>
          {logoUrl && (
            <img
              src={logoUrl}
              alt="الشعار"
              style={{ width: '60px', height: '60px', objectFit: 'contain' }}
            />
          )}
          <div style={{ flex: 1, marginRight: '20px' }}>
            <h1 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#1e3a8a',
              margin: '0 0 5px 0',
            }}>
              {company.name}
            </h1>
            <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
              {company.address && <p>{company.address}</p>}
              {company.phone && <p>الهاتف: {company.phone}</p>}
              {company.crNumber && <p>السجل التجاري: {company.crNumber}</p>}
              {company.taxNumber && <p>الرقم الضريبي: {company.taxNumber}</p>}
            </div>
          </div>
        </div>

        {/* Document Title and Meta */}
        <h2 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          margin: '10px 0 10px 0',
          color: '#1e3a8a',
        }}>
          {docTitle}
        </h2>

        {docNo || docDate && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '10px',
            fontSize: '12px',
            fontWeight: 'bold',
          }}>
            {docNo && <span>الرقم: {toArabicDigits(docNo)}</span>}
            {docDate && <span>التاريخ: {toArabicDigits(docDate)}</span>}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ minHeight: '150px', marginBottom: '30px' }}>
        {children}
      </div>

      {/* Footer */}
      {footerText && (
        <div style={{
          fontSize: '10px',
          color: '#666',
          textAlign: 'center',
          marginTop: '20px',
          borderTop: '1px solid #ddd',
          paddingTop: '10px',
        }}>
          {footerText}
        </div>
      )}
    </div>
  );
};

export default PrintPageLayout;
