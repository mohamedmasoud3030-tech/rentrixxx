

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit, Trash2, FileText, Ban, Printer as PrinterIcon } from 'lucide-react';

export interface ActionItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isDestructive?: boolean;
}

interface ActionsMenuProps {
  items: ActionItem[];
}

const ActionsMenu: React.FC<ActionsMenuProps> = ({ items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div className="relative inline-block text-left" ref={wrapperRef}>
      <div>
        <button
          type="button"
          className="inline-flex justify-center w-full rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-2 py-2 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      {isOpen && (
        <div className="origin-top-left absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className={`w-full text-right flex items-center gap-3 px-4 py-2 text-sm ${
                  item.isDestructive
                    ? 'text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                role="menuitem"
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const EditAction = (onClick: () => void): ActionItem => ({ label: 'تعديل', icon: <Edit size={16} />, onClick });
export const DeleteAction = (onClick: () => void): ActionItem => ({ label: 'حذف', icon: <Trash2 size={16} />, onClick, isDestructive: true });
export const VoidAction = (onClick: () => void): ActionItem => ({ label: 'إلغاء', icon: <Ban size={16} />, onClick, isDestructive: true });
export const ViewDetailsAction = (onClick: () => void): ActionItem => ({ label: 'عرض التفاصيل', icon: <FileText size={16} />, onClick });
export const PrintAction = (onClick: () => void): ActionItem => ({ label: 'طباعة', icon: <PrinterIcon size={16} />, onClick });


export default ActionsMenu;