import React from 'react';

interface SignatureBlockProps {
  stampUrl?: string;
  footerText?: string;
}

export const SignatureBlock: React.FC<SignatureBlockProps> = ({ stampUrl, footerText }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '20px',
      marginTop: '60px',
      paddingTop: '20px',
      borderTop: '2px solid #ddd',
    }}>
      {/* Issuer Signature */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '30px' }}>
          توقيع المُصدر
        </div>
        <div style={{
          borderBottom: '1px solid #333',
          height: '50px',
          margin: '15px 0',
        }}></div>
        <div style={{ fontSize: '10px', marginTop: '5px', color: '#666' }}>
          الاسم: ..................
        </div>
      </div>

      {/* Recipient Signature */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '30px' }}>
          توقيع المُستقبِل
        </div>
        <div style={{
          borderBottom: '1px solid #333',
          height: '50px',
          margin: '15px 0',
        }}></div>
        <div style={{ fontSize: '10px', marginTop: '5px', color: '#666' }}>
          الاسم: ..................
        </div>
      </div>

      {/* Stamp/Authority Signature */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '15px' }}>
          ختم المؤسسة
        </div>
        <div style={{
          width: '80px',
          height: '80px',
          border: '2px dashed #999',
          borderRadius: '50%',
          margin: '15px auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9f9f9',
        }}>
          {stampUrl ? (
            <img
              src={stampUrl}
              alt="ختم المؤسسة"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '50%',
                padding: '5px',
              }}
            />
          ) : (
            <span style={{ fontSize: '10px', color: '#999' }}>الختم</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignatureBlock;
