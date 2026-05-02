import React from 'react';
import { typographyTokens } from '../tokens/motion';

type TextVariant = keyof typeof typographyTokens;
type TextTag = 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'label';

type DSTextProps = {
  as?: TextTag;
  variant?: TextVariant;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export const DSText: React.FC<DSTextProps> = ({ as = 'p', variant = 'body', className = '', children, ...props }) => {
  const Tag: React.ElementType = as;
  return (
    <Tag className={`${typographyTokens[variant]} ${className}`} {...props}>
      {children}
    </Tag>
  );
};
