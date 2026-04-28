import React from 'react';

type PageContainerProps = {
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export const PageContainer: React.FC<PageContainerProps> = ({ header, children, footer, className = '' }) => (
  <section className={`page-enter mx-auto w-full max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 ${className}`}>
    {header ? <header className="space-y-3">{header}</header> : null}
    <div className="space-y-6">{children}</div>
    {footer ? <footer className="pt-2">{footer}</footer> : null}
  </section>
);
