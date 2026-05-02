import React from 'react';

type AppErrorFallbackProps = {
  title?: string;
  description?: string;
  retry: () => void;
};

export const AppErrorFallback: React.FC<AppErrorFallbackProps> = ({
  title = 'حدث خطأ أثناء تحميل الصفحة',
  description = 'نعتذر، حدثت مشكلة غير متوقعة. يمكنك إعادة المحاولة الآن.',
  retry,
}) => {
  return (
    <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
      <h2 className="font-bold text-red-800">{title}</h2>
      <p className="text-sm text-red-700">{description}</p>
      <button
        type="button"
        onClick={retry}
        className="mt-3 rounded-md bg-red-700 px-3 py-1 text-sm font-medium text-white hover:bg-red-800"
      >
        إعادة المحاولة
      </button>
    </div>
  );
};
