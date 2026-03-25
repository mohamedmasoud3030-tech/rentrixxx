import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { User } from '../../types';
import Modal from '../ui/Modal';
import { toast } from 'react-hot-toast';
import { KeyRound, Edit } from 'lucide-react';
import { USER_ROLE_AR } from '../../utils/helpers';

const UsersSettings: React.FC = () => {
    const { db, auth } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleOpenModal = (user: User | null = null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">إدارة المستخدمين والصلاحيات</h2>
                <button onClick={() => handleOpenModal()} className="btn btn-primary">إضافة مستخدم</button>
            </div>

            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
                <p className="font-bold mb-1">تسجيل الدخول عبر Supabase</p>
                <p>المستخدمون الجدد سيتلقون رسالة تأكيد على بريدهم الإلكتروني لتفعيل الحساب. يمكن إدارة المستخدمين أيضاً من لوحة تحكم Supabase.</p>
            </div>

            <div className="overflow-x-auto bg-background rounded-lg border border-border">
                <table className="w-full text-right">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="p-4">اسم المستخدم</th>
                            <th className="p-4">البريد الإلكتروني</th>
                            <th className="p-4">الدور</th>
                            <th className="p-4">تاريخ الإنشاء</th>
                            <th className="p-4">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {db.auth.users.map(u => (
                            <tr key={u.id} className="border-t border-border">
                                <td className="p-4 font-bold">{u.username}</td>
                                <td className="p-4 text-sm font-mono text-text-muted" dir="ltr">{u.email || '—'}</td>
                                <td className="p-4">{USER_ROLE_AR[u.role] || u.role}</td>
                                <td className="p-4 text-sm text-text-muted">{new Date(u.createdAt).toLocaleDateString('ar-EG')}</td>
                                <td className="p-4">
                                    <div className="flex gap-4">
                                        <button onClick={() => handleOpenModal(u)} className="text-primary text-xs flex items-center gap-1 hover:underline"><Edit size={12}/> تعديل</button>
                                        <button onClick={() => auth.forcePasswordReset(u.id)} className="text-yellow-600 text-xs flex items-center gap-1 hover:underline"><KeyRound size={12}/> تصفير كلمة المرور</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <UserForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={editingUser} />}
        </div>
    );
};

const UserForm: React.FC<{ isOpen: boolean, onClose: () => void, user: User | null }> = ({ isOpen, onClose, user }) => {
    const { auth } = useApp();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');

    useEffect(() => {
        if (user) {
            setUsername(user.username);
            setEmail(user.email || '');
            setRole(user.role);
            setPassword('');
        } else {
            setUsername('');
            setEmail('');
            setRole('USER');
            setPassword('');
        }
    }, [user, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (user) {
            await auth.updateUser(user.id, { username, role });
            toast.success("تم تحديث المستخدم.");
        } else {
            if (!password || !email) {
                toast.error("البريد الإلكتروني وكلمة المرور مطلوبان عند إنشاء مستخدم جديد.");
                return;
            }
            const result = await auth.addUser({ username, email, role, mustChange: true }, password);
            if (result.ok) {
                toast.success(result.msg);
            } else {
                toast.error(result.msg);
                return;
            }
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={user ? "تعديل مستخدم" : "إضافة مستخدم جديد"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="اسم المستخدم (للعرض)" required />
                {!user && (
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="البريد الإلكتروني"
                        required
                        dir="ltr"
                    />
                )}
                <select value={role} onChange={e => setRole(e.target.value as User['role'])}>
                    <option value="USER">مستخدم</option>
                    <option value="ADMIN">مدير</option>
                </select>
                {!user && (
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="كلمة المرور المؤقتة (8 أحرف على الأقل)"
                        required
                    />
                )}
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn btn-primary">حفظ</button>
                </div>
            </form>
        </Modal>
    );
};

export default UsersSettings;
