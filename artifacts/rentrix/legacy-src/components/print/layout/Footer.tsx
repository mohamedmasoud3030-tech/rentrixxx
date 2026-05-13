import React from 'react';
import { toArabicDigits } from '../../../utils/helpers';

const Footer: React.FC = () => {
    const currentYear = toArabicDigits(new Date().getFullYear());
    return (
        <footer className="w-full py-3 px-6 border-t border-border bg-card text-center">
            <p className="text-sm text-text-muted">
                © {currentYear} Rentrix | برمجة: Mohamed Masoud |
                <span dir="ltr"> +968 91928186 / +20 1212101073</span>
            </p>
        </footer>
    );
};

export default Footer;