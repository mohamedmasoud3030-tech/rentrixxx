import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const ChangePassword: React.FC = () => {
  const { auth } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    if (newPassword.length < 3) {
      setError('يجب أن تكون كلمة المرور ٣ أحرف على الأقل.');
      return;
    }
    // Simple check to prevent using the default password again
    if (newPassword === '123') {
      setError('لا يمكن استخدام كلمة المرور الافتراضية.');
      return;
    }

    setIsLoading(true);
    setError('');

    if (auth.currentUser) {
      const result = await auth.changePassword(auth.currentUser.id, newPassword);
      if (!result.ok) {
        setError('حدث خطأ أثناء تغيير كلمة المرور.');
        setIsLoading(false);
      }
      // On success, App.tsx will automatically re-render and navigate to the dashboard
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full p-8" variant="elevated">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text">تغيير كلمة المرور</h1>
          <p className="text-text-muted mt-2">
            لأسباب أمنية، يجب عليك تغيير كلمة المرور الافتراضية قبل المتابعة.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-muted mb-2" htmlFor="newPassword">
              كلمة المرور الجديدة
            </label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-muted mb-2" htmlFor="confirmPassword">
              تأكيد كلمة المرور الجديدة
            </label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          <div className="flex items-center justify-between">
            <Button type="submit" disabled={isLoading} fullWidth>
              {isLoading ? 'جاري الحفظ...' : 'حفظ وتأكيد'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ChangePassword;