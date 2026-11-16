import React from 'react';
import type {
  AccountType,
  AvailabilityStatus,
  DocumentType,
  ModerationStatus,
  UserStatus,
} from '@/types/api';
import { ACCOUNT_TYPE_LABELS } from '@/lib/api/public';
import { formatDateAr } from '@/lib/utils/format';

export const MODERATION_STATUS_LABELS: Record<ModerationStatus, string> = {
  draft: 'مسودة (غير مرسل)',
  pending_review: 'قيد المراجعة الإدارية',
  changes_requested: 'مطلوب تعديلات',
  approved: 'معتمد للنشر',
  rejected: 'مرفوض',
};

export const AVAILABILITY_STATUS_LABELS: Record<AvailabilityStatus, string> = {
  available: 'متاح للعرض',
  sold: 'تم البيع',
  rented: 'تم التأجير',
  hidden: 'مخفي مؤقتاً',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'حساب نشط',
  suspended: 'حساب موقوف',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  ownership_proof: 'سند ملكية / عقد',
  broker_authorization: 'تفويض وساطة عقارية',
  national_id: 'بطاقة الرقم القومي',
  other: 'مستند ثبوتي آخر',
};

export const MODERATION_ACTION_LABELS: Record<string, string> = {
  submit_for_review: 'إرسال للمراجعة',
  resubmit_for_review: 'إعادة إرسال للمراجعة بعد التعديل',
  approve: 'اعتماد للنشر العام',
  request_changes: 'طلب استيفاء / تعديلات على الإعلان',
  reject: 'رفض أو إلغاء نشر الإعلان',
  owner_edit_reset_to_pending: 'إعادة للمراجعة تلقائياً بعد تعديل المحتوى',
  admin_direct_publish: 'نشر إداري مباشر معتمد (OD-01)',
};

export function ModerationStatusBadge({ status }: { status: ModerationStatus }) {
  const styles: Record<ModerationStatus, string> = {
    draft: 'bg-[#F3EDE2] text-[#4A555E]',
    pending_review: 'bg-[#F7EFE0] text-[#8E6722]',
    changes_requested: 'bg-amber-100 text-amber-900',
    approved: 'bg-[#E8F6EF] text-[#136F48]',
    rejected: 'bg-red-100 text-red-800',
  };

  const dots: Record<ModerationStatus, string> = {
    draft: 'bg-[#78828A]',
    pending_review: 'bg-[#C59B4E]',
    changes_requested: 'bg-amber-600',
    approved: 'bg-[#16A34A]',
    rejected: 'bg-red-600',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold ${styles[status]}`}
    >
      <span className={`h-2 w-2 rounded-full ${dots[status]}`} aria-hidden="true" />
      <span>{MODERATION_STATUS_LABELS[status] || status}</span>
    </span>
  );
}

export function AvailabilityStatusBadge({ status }: { status: AvailabilityStatus }) {
  const styles: Record<AvailabilityStatus, string> = {
    available: 'bg-[#E8F6EF] text-[#136F48]',
    sold: 'bg-[#131E26] text-white',
    rented: 'bg-[#131E26] text-white',
    hidden: 'bg-[#F3EDE2] text-[#4A555E]',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}>
      {AVAILABILITY_STATUS_LABELS[status] || status}
    </span>
  );
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const isSuspended = status === 'suspended';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
        isSuspended ? 'bg-red-100 text-red-800' : 'bg-[#E8F6EF] text-[#136F48]'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isSuspended ? 'bg-red-600' : 'bg-[#16A34A]'}`}
      />
      <span>{USER_STATUS_LABELS[status]}</span>
    </span>
  );
}

export function AccountTypeBadge({ accountType }: { accountType: AccountType }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#F7EFE0] px-3 py-1 text-xs font-bold text-[#8E6722]">
      {ACCOUNT_TYPE_LABELS[accountType] || accountType}
    </span>
  );
}

export function DocumentTypeBadge({ documentType }: { documentType: DocumentType }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#FAF7F2] px-3 py-1 text-xs font-bold text-[#131E26]">
      {DOCUMENT_TYPE_LABELS[documentType] || documentType}
    </span>
  );
}

export interface ModerationTimelineLogItem {
  id: number;
  actor_id?: number;
  actor_name?: string | null;
  from_status: ModerationStatus | null;
  to_status: ModerationStatus;
  action: string;
  notes: string | null;
  created_at: string;
}

export function ModerationTimeline({
  logs = [],
}: {
  logs?: ModerationTimelineLogItem[];
}) {
  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-ambient">
        <h3 className="text-base font-bold text-[#131E26]">سجل المراجعة والاعتماد</h3>
        <p className="mt-2 text-xs text-[#78828A]">
          لا توجد سجلات مراجعة مسجلة لهذا العقار حتى الآن.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-ambient space-y-4">
      <div>
        <span className="text-xs font-bold text-[#C59B4E]">الأرشيف الزمني غير القابل للتعديل</span>
        <h3 className="mt-0.5 text-lg font-extrabold text-[#131E26]">
          سجل حركات المراجعة والاعتماد
        </h3>
      </div>

      <ol className="space-y-3">
        {logs.map((log) => (
          <li
            key={log.id}
            className="rounded-2xl bg-[#FAF7F2] p-4 text-xs transition hover:bg-[#F3EDE2]/60"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[#131E26]">
                  {MODERATION_ACTION_LABELS[log.action] || log.action}
                </span>
                <ModerationStatusBadge status={log.to_status} />
              </div>

              <span className="text-[11px] text-[#78828A] tabular-nums-west">
                {formatDateAr(log.created_at)}
              </span>
            </div>

            {log.actor_name && (
              <p className="mt-1.5 text-[11px] font-semibold text-[#A67C33]">
                بواسطة: {log.actor_name}
              </p>
            )}

            {log.notes && (
              <p className="mt-2 rounded-xl bg-white p-3 text-xs leading-relaxed text-[#131E26]">
                {log.notes}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
