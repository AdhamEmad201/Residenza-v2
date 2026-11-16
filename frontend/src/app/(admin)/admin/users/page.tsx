'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { AccountType, User, UserRole, UserStatus } from '@/types/api';
import { getAdminUsers, updateAdminUserStatus } from '@/lib/api/admin';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  AccountTypeBadge,
  UserStatusBadge,
} from '@/components/dashboard/StatusBadges';
import { ACCOUNT_TYPE_LABELS } from '@/lib/api/public';
import { ApiError } from '@/lib/api/client';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState<UserRole | ''>('');
  const [accountType, setAccountType] = useState<AccountType | ''>('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [q, setQ] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorText(null);
    try {
      const res = await getAdminUsers({
        role,
        account_type: accountType,
        status,
        q: q.trim() || undefined,
        per_page: 30,
      });
      setUsers(res.data ?? []);
      setTotal(res.meta?.total ?? (res.data ?? []).length);
    } catch (error) {
      setErrorText(
        error instanceof ApiError ? error.message : 'تعذر تحميل قائمة المستخدمين.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [role, accountType, status, q]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleToggleStatus = async (targetUser: User) => {
    setFeedback(null);
    setErrorText(null);
    const nextStatus: UserStatus =
      targetUser.status === 'active' ? 'suspended' : 'active';

    try {
      await updateAdminUserStatus(targetUser.id, { status: nextStatus });
      setFeedback(
        `تم تحديث حالة حساب (${targetUser.name}) إلى ${
          nextStatus === 'active' ? 'نشط' : 'موقوف'
        }.`
      );
      await loadUsers();
    } catch (error) {
      setErrorText(
        error instanceof ApiError ? error.message : 'تعذر تحديث حالة المستخدم.'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-ambient">
        <span className="text-xs font-bold text-[#C59B4E]">
          حوكمة الأعضاء والمعلنين
        </span>
        <h2 className="text-2xl font-extrabold text-[#131E26]">
          إدارة حسابات المستخدمين ({total})
        </h2>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 gap-3 rounded-3xl bg-white p-5 shadow-ambient sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="text"
          placeholder="بحث بالاسم أو البريد أو الهاتف..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-2xl bg-[#FAF7F2] px-4 py-2.5 text-xs font-semibold text-[#131E26] placeholder:text-[#78828A] focus:bg-white focus:ring-2 focus:ring-[#C59B4E] focus:outline-none"
        />

        <select
          aria-label="تصفية حسب الصلاحية"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole | '')}
          className="rounded-2xl bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#131E26] focus:outline-none"
        >
          <option value="">كل الأدوار (مدير / معلن)</option>
          <option value="user">مستخدم / معلن</option>
          <option value="admin">مدير نظام (Admin)</option>
        </select>

        <select
          aria-label="تصفية حسب صفة الحساب"
          value={accountType}
          onChange={(e) => setAccountType(e.target.value as AccountType | '')}
          className="rounded-2xl bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#131E26] focus:outline-none"
        >
          <option value="">جميع صفات الحسابات</option>
          {Object.entries(ACCOUNT_TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>

        <select
          aria-label="تصفية حسب الحالة"
          value={status}
          onChange={(e) => setStatus(e.target.value as UserStatus | '')}
          className="rounded-2xl bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#131E26] focus:outline-none"
        >
          <option value="">النشط والموقوف</option>
          <option value="active">نشط فقط</option>
          <option value="suspended">موقوف فقط</option>
        </select>
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-2xl bg-[#E8F6EF] p-4 text-xs font-bold text-[#136F48]"
        >
          {feedback}
        </div>
      )}

      {errorText && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700"
        >
          {errorText}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-3xl bg-white p-12 text-center text-xs font-bold text-[#78828A] shadow-ambient">
          جارٍ تحميل حسابات المستخدمين...
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const isSelf = Number(currentUser?.id) === Number(u.id);
            return (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5 shadow-ambient"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-extrabold text-[#131E26]">
                      {u.name}
                    </span>
                    <AccountTypeBadge accountType={u.account_type} />
                    <UserStatusBadge status={u.status} />
                    {u.role === 'admin' && (
                      <span className="rounded-full bg-[#131E26] px-3 py-0.5 text-[11px] font-bold text-white">
                        مدير النظام
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#4A555E]">
                    <span className="font-mono">{u.email}</span> ·{' '}
                    <span dir="ltr" className="font-mono">
                      {u.phone}
                    </span>
                    {u.company_name ? ` · ${u.company_name}` : ''}
                  </p>
                </div>

                <div>
                  {isSelf ? (
                    <span className="rounded-full bg-[#FAF7F2] px-4 py-2 text-xs font-bold text-[#78828A]">
                      حسابك الحالي (محمي من التعليق الذاتي)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleToggleStatus(u)}
                      className={`cursor-pointer rounded-full px-5 py-2 text-xs font-bold transition ${
                        u.status === 'active'
                          ? 'bg-red-50 text-red-700 hover:bg-red-700 hover:text-white'
                          : 'bg-[#E8F6EF] text-[#136F48] hover:bg-[#136F48] hover:text-white'
                      }`}
                    >
                      {u.status === 'active' ? 'تعليق الحساب' : 'إعادة تفعيل الحساب'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
