import React from 'react';
import { useApp } from '../../contexts/AppContext';

interface DocumentHeaderProps {
  subtitle?: string;
  docTitle?: string;
  docNo?: string;
  docDate?: string;
}

const headerRowStyle: React.CSSProperties = {
  direction: 'rtl',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  borderBottom: '3px solid #1a365d',
  paddingBottom: '12px',
};

const contactBlockStyle: React.CSSProperties = {
  textAlign: 'right',
  flex: 1,
  fontSize: '11px',
  lineHeight: '1.8',
};

const centerBlockStyle: React.CSSProperties = {
  textAlign: 'center',
  flex: 1.2,
  padding: '0 16px',
};

const logoBlockStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'flex-start',
};

const ContactBlock: React.FC<{ company: any }> = ({ company }) => (
  <div style={contactBlockStyle}>
    <p style={{ margin: 0 }}>{company.address}</p>
    <p style={{ margin: 0 }}>هاتف: {company.phone}{company.phone2 ? ` / ${company.phone2}` : ''}</p>
    {company.email && <p style={{ margin: 0 }}>بريد: {company.email}</p>}
    {company.crNumber && <p style={{ margin: 0 }}>س.ت: {company.crNumber}</p>}
    {company.taxNumber && <p style={{ margin: 0 }}>الرقم الضريبي: {company.taxNumber}</p>}
    {company.postalCode && <p style={{ margin: 0 }}>ص.ب: {company.postalCode}</p>}
  </div>
);

const CenterBlock: React.FC<{ name: string; subtitle?: string }> = ({ name, subtitle }) => (
  <div style={centerBlockStyle}>
    <h1 style={{ fontSize: '22px', fontWeight: 900, margin: 0, color: '#1a365d' }}>{name}</h1>
    {subtitle && <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 0 0' }}>{subtitle}</p>}
  </div>
);

const LogoBlock: React.FC<{ logoUrl?: string }> = ({ logoUrl }) => (
  <div style={logoBlockStyle}>
    {logoUrl ? (
      <img src={logoUrl} alt="شعار المؤسسة" style={{ maxHeight: '70px', maxWidth: '120px', objectFit: 'contain' }} />
    ) : (
      <div style={{ width: '70px', height: '70px', border: '2px dashed #cbd5e0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#a0aec0' }}>
        الشعار
      </div>
    )}
  </div>
);

const DocMeta: React.FC<{ docTitle?: string; docNo?: string; docDate?: string }> = ({ docTitle, docNo, docDate }) => {
  if (!docTitle && !docNo && !docDate) return null;
  return (
    <div style={{ textAlign: 'center', marginTop: '16px' }}>
      {docTitle && <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0' }}>{docTitle}</h2>}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '12px', color: '#555' }}>
        {docNo && <span>رقم: <strong>{docNo}</strong></span>}
        {docDate && <span>التاريخ: <strong>{docDate}</strong></span>}
      </div>
    </div>
  );
};

const DocumentHeader: React.FC<DocumentHeaderProps> = ({ subtitle, docTitle, docNo, docDate }) => {
  const { settings } = useApp();
  const company = settings.general.company;
  const logo = settings.appearance?.logoDataUrl;

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={headerRowStyle}>
        <ContactBlock company={company} />
        <CenterBlock name={company.name} subtitle={subtitle} />
        <LogoBlock logoUrl={logo} />
      </div>
      <DocMeta docTitle={docTitle} docNo={docNo} docDate={docDate} />
    </div>
  );
};

export const DocumentHeaderInline: React.FC<{ company: any; logoUrl?: string; subtitle?: string; docTitle?: string; docNo?: string; docDate?: string }> = ({ company, logoUrl, subtitle, docTitle, docNo, docDate }) => (
  <div style={{ marginBottom: '24px' }}>
    <div style={headerRowStyle}>
      <ContactBlock company={company} />
      <CenterBlock name={company.name} subtitle={subtitle} />
      <LogoBlock logoUrl={logoUrl} />
    </div>
    <DocMeta docTitle={docTitle} docNo={docNo} docDate={docDate} />
  </div>
);

export default DocumentHeader;
