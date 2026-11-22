'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { User, UserRole, UserStatus } from '@/types/api';
import {
  getAdminExportCsvUrl,
  getAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
} from '@/lib/api/admin';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  AccountTypeBadge,
  UserStatusBadge,
} from '@/components/dashboard/StatusBadges';
import { ApiError } from '@/lib/api/client';

function isUserOnline(lastSeenAt?: string | null): boolean {
  if (!lastSeenAt) return false;
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  return diffMs <= 5 * 60 * 1000;
}

function buildWhatsappUrl(phone: string, name: string): string {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('0') ? `2${digits}` : digits.startsWith('20') ? digits : `20${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(
    `مرحباً ${name}، معك إدارة منصة ريزيدنزا العقارية بسوهاج:`
  )}`;
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState<UserRole | ''>('');
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
        status,
        q: q.trim() || undefined,
        per_page: 40,
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
  }, [role, status, q]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleToggleStatus = async (targetUser: User) => {
    setFeedback(null);
    setErrorText(null);
    const nextStatus: UserStatus =
      targetUser.status === 'active' ? 'suspended' : 'active';

    try {
      await updateAdminUserStatus(targetUser.id, {
        status: nextStatus,
        is_active: nextStatus === 'active',
      });
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

  const handleToggleRole = async (targetUser: User) => {
    setFeedback(null);
    setErrorText(null);
    const nextRole: UserRole = targetUser.role === 'admin' ? 'user' : 'admin';

    try {
      await updateAdminUserRole(targetUser.id, nextRole);
      setFeedback(
        `تم تحديث صلاحية (${targetUser.name}) إلى ${
          nextRole === 'admin' ? 'مدير منصة (Admin)' : 'مستخدم عادي'
        }.`
      );
      await loadUsers();
    } catch (error) {
      setErrorText(
        error instanceof ApiError ? error.message : 'تعذر تحديث صلاحية المستخدم.'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-ambient">
        <div>
          <span className="text-xs font-bold text-[#9F7753]">
            حوكمة الأعضاء والصلاحيات الإدارية
          </span>
          <h2 className="text-2xl font-extrabold text-[#403E3D]">
            إدارة الحسابات والصلاحيات ({total})
          </h2>
        </div>

        <a
          href={getAdminExportCsvUrl('users')}
          className="rounded-full bg-[#F3EAD8] px-5 py-2.5 text-xs font-bold text-[#403E3D] transition hover:bg-[#CEB38F]/60"
        >
          ⬇ تصدير المستخدمين CSV
        </a>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 gap-3 rounded-3xl bg-white p-5 shadow-ambient sm:grid-cols-3">
        <input
          type="search"
          placeholder="بحث بالاسم أو البريد أو الهاتف..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-semibold text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
        />

        <select
          aria-label="تصفية حسب الصلاحية"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole | '')}
          className="rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#403E3D] focus:outline-none"
        >
          <option value="">كل الأدوار (مدير / معلن)</option>
          <option value="user">معلن / عضو (user)</option>
          <option value="admin">مدير منصة (admin)</option>
        </select>

        <select
          aria-label="تصفية حسب حالة الحساب"
          value={status}
          onChange={(e) => setStatus(e.target.value as UserStatus | '')}
          className="rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#403E3D] focus:outline-none"
        >
          <option value="">كل الحالات (نشط / موقوف)</option>
          <option value="active">نشط</option>
          <option value="suspended">موقوف</option>
        </select>
      </div>

      {feedback && (
        <div className="rounded-2xl bg-[#E8F6EF] p-4 text-xs font-bold text-[#136F48]">
          {feedback}
        </div>
      )}
      {errorText && (
        <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700">
          {errorText}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-ambient">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-bold text-[#7D7772]">
            جارٍ تحميل الحسابات...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-[#FAF7F2] text-[#5C5855]">
                <tr>
                  <th className="px-5 py-3.5 text-start font-bold">المستخدم والتواجد</th>
                  <th className="px-5 py-3.5 text-start font-bold">البريد والهاتف</th>
                  <th className="px-5 py-3.5 text-start font-bold">النوع والدور</th>
                  <th className="px-5 py-3.5 text-start font-bold">الحالة</th>
                  <th className="px-5 py-3.5 text-end font-bold">إجراءات التحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#403E3D]/10">
                {users.map((u) => {
                  const online = isUserOnline(u.last_seen_at);
                  const isSelf = currentUser?.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-[#FAF7F2]/60">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            title={online ? 'متواجد الآن' : 'غير متصل'}
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              online ? 'bg-[#16A34A]' : 'bg-gray-300'
                            }`}
                          />
                          <div>
                            <p className="font-extrabold text-[#403E3D]">
                              {u.name} {isSelf && '(أنت)'}
                            </p>
                            {u.company_name && (
                              <p className="text-[11px] text-[#9F7753]">{u.company_name}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 tabular-nums-west">
                        <p className="font-semibold text-[#403E3D]">{u.email}</p>
                        <p className="text-[11px] text-[#5C5855]" dir="ltr">
                          {u.phone}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <AccountTypeBadge accountType={u.account_type} />
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              u.role === 'admin'
                                ? 'bg-[#403E3D] text-[#CEB38F]'
                                : 'bg-[#FAF7F2] text-[#5C5855]'
                            }`}
                          >
                            {u.role === 'admin' ? '🛡️ أدمن' : 'مستخدم'}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <UserStatusBadge status={u.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {u.phone && (
                            <a
                              href={buildWhatsappUrl(u.whatsapp_number || u.phone, u.name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full bg-[#E8F6EF] px-3 py-1.5 text-[11px] font-bold text-[#136F48] transition hover:bg-[#136F48] hover:text-white"
                            >
                              واتساب
                            </a>
                          )}

                          {!isSelf && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleRole(u)}
                                className="cursor-pointer rounded-full bg-[#F3EAD8] px-3 py-1.5 text-[11px] font-bold text-[#403E3D] transition hover:bg-[#9F7753] hover:text-white"
                              >
                                {u.role === 'admin' ? 'سحب صلاحية الأدمن' : 'ترقية لأدمن'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u)}
                                className={`cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                                  u.status === 'active'
                                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                    : 'bg-[#136F48] text-white hover:bg-[#0F5939]'
                                }`}
                              >
                                {u.status === 'active' ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
