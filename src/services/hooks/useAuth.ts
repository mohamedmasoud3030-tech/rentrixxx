
import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbEngine } from '../db';
import { User } from '../../types';
import { toast } from 'react-hot-toast';

async function sha256(msg: string): Promise<string> {
    const enc = new TextEncoder().encode(msg);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randSalt(): string {
    const a = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
}

const audit = async (user: User | null, action: string, entity: string, entityId: string, note: string = '') => {
    if (!user) return;
    await dbEngine.auditLog.add({ id: crypto.randomUUID(), ts: Date.now(), userId: user.id, username: user.username, action, entity, entityId, note });
};

export const useAuth = () => {
    const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
    const users = useLiveQuery(() => dbEngine.users.toArray());

    useEffect(() => {
        // Initial check for users, if none, seed admin.
        const seedAdmin = async () => {
            if (await dbEngine.users.count() === 0) {
                console.log("No users found, creating default admin user...");
                const salt = randSalt();
                const hash = await sha256('123' + salt);
                const newUser: User = { id: crypto.randomUUID(), username: 'admin', email: '', role: 'ADMIN', mustChange: true, createdAt: Date.now(), salt, hash };
                await dbEngine.users.add(newUser);
                toast.success('تم إنشاء حساب المدير الافتراضي. استخدم admin / 123 للدخول.');
            }
            if (currentUser === undefined) {
                setCurrentUser(null);
            }
        };
        seedAdmin();
    }, [currentUser]);
    
    const login = useCallback(async (username: string, password: string) => {
        const user = users?.find(u => u.username === username);
        if (!user || await sha256(password + user.salt) !== user.hash) {
            return { ok: false, msg: 'بيانات غير صحيحة' };
        }
        setCurrentUser(user);
        await audit(user, 'LOGIN', 'SESSION', user.id);
        return { ok: true, msg: 'Ok', mustChange: user.mustChange };
    }, [users]);

    const logout = useCallback(async () => {
        if (currentUser) {
            await audit(currentUser, 'LOGOUT', 'SESSION', currentUser.id);
        }
        setCurrentUser(null);
    }, [currentUser]);

    const changePassword = useCallback(async (userId: string, newPass: string) => {
        const salt = randSalt();
        const hash = await sha256(newPass + salt);
        await dbEngine.users.update(userId, { hash, salt, mustChange: false });
        setCurrentUser(prev => prev ? { ...prev, mustChange: false } : null);
        await audit(currentUser, 'UPDATE', 'users', userId, 'Password changed');
        return { ok: true };
    }, [currentUser]);
    
    const addUser = useCallback(async (user: Omit<User, 'id'|'createdAt'|'salt'|'hash'>, pass: string) => {
      const existing = await dbEngine.users.where('username').equals(user.username).first();
      if (existing) return { ok: false, msg: 'اسم المستخدم موجود بالفعل' };
      const salt = randSalt(); const hash = await sha256(pass + salt); const id = crypto.randomUUID(); const now = Date.now();
      const newUser: User = { ...user, email: (user as User).email || '', id, createdAt: now, salt, hash, mustChange: false };
      await dbEngine.users.add(newUser);
      await audit(currentUser, 'CREATE', 'users', id, `Created user ${user.username}`);
      return { ok: true, msg: 'User created' };
    }, [currentUser]);

    const updateUser = useCallback(async (id: string, updates: Partial<User>) => {
        await dbEngine.users.update(id, updates);
        await audit(currentUser, 'UPDATE', 'users', id, `Updated user details for ${updates.username || id}`);
    }, [currentUser]);

    const forcePasswordReset = useCallback(async (userId: string) => {
        if (window.confirm('هل أنت متأكد من رغبتك في فرض إعادة تعيين كلمة المرور لهذا المستخدم؟ سيُطلب منه تغييرها عند تسجيل الدخول التالي.')) {
            await dbEngine.users.update(userId, { mustChange: true });
            await audit(currentUser, 'FORCE_RESET_PASSWORD', 'users', userId);
            toast.success('تم فرض إعادة تعيين كلمة المرور بنجاح.');
        }
    }, [currentUser]);
    
    return {
        currentUser,
        login,
        logout,
        changePassword,
        addUser,
        updateUser,
        forcePasswordReset
    };
};
