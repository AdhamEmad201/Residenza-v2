'use client';

import React, { useState } from 'react';
import type { AdminProperty, AvailabilityStatus, User } from '@/types/api';
import {
  adminUpdateProperty,
  approveAdminProperty,
  deleteAdminProperty,
  rejectAdminProperty,
  requestChangesAdminProperty,
} from '@/lib/api/admin';
import { AVAILABILITY_STATUS_LABELS, ModerationStatusBadge } from './StatusBadges';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/client';

export interface ModerationActionPanelProps {
  property: AdminProperty;
  currentUser: User;
  onUpdated: () => Promise<void> | void;
  onDeleted?: () => void;
}

export function ModerationActionPanel({
  property,
  currentUser,
  onUpdated,
  onDeleted,
}: ModerationActionPanelProps) {
  const [notesOrReason, setNotesOrReason] = useState('');
  const [availability, setAvailability] = useState<AvailabilityStatus>(
    property.availability_status
  );
  const [isFeatured, setIsFeatured] = useState<boolean>(property.is_featured);
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Self-Approval Guard: An admin cannot approve a pending_review listing they own
  const isSelfOwned = Number(property.user_id) === Number(currentUser.id);
  const canApprove = property.moderation_status === 'pending_review' && !isSelfOwned;
  const canRequestChanges = property.moderation_status === 'pending_review';
  const canReject =
    property.moderation_status === 'pending_review' ||
    property.moderation_status === 'approved';

  const handleApprove = async () => {
    setFeedback(null);
    setIsBusy(true);
    try {
      await approveAdminProperty(property.id, {
        notes: notesOrReason.trim() || null,
      });
      setNotesOrReason('');
      setFeedback({ type: 'success', text: 'تم اعتماد العقار ونشره في السجل العام بنجاح.' });
      await onUpdated();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof ApiError ? error.message : 'تعذر اعتماد العقار.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleRequestChanges = async () => {
    setFeedback(null);
    if (notesOrReason.trim().length < 5) {
      setFeedback({
        type: 'error',
        text: 'يرجى كتابة سبب طلب التعديلات (5 أحرف على الأقل) ليظهر للمعلن.',
      });
      return;
    }
    setIsBusy(true);
    try {
      await requestChangesAdminProperty(property.id, notesOrReason.trim());
      setNotesOrReason('');
      setFeedback({ type: 'success', text: 'تم إرسال طلب التعديلات إلى المعلن.' });
      await onUpdated();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof ApiError ? error.message : 'تعذر إرسال طلب التعديلات.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleReject = async () => {
    setFeedback(null);
    if (notesOrReason.trim().length < 5) {
      setFeedback({
        type: 'error',
        text: 'يرجى كتابة سبب الرفض أو إلغاء النشر (5 أحرف على الأقل).',
      });
      return;
    }
    setIsBusy(true);
    try {
      await rejectAdminProperty(property.id, notesOrReason.trim());
      setNotesOrReason('');
      setFeedback({ type: 'success', text: 'تم رفض الإعلان وتحديث حالته.' });
      await onUpdated();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof ApiError ? error.message : 'تعذر تنفيذ قرار الرفض.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveFlags = async () => {
    setFeedback(null);
    setIsBusy(true);
    try {
      await adminUpdateProperty(property.id, {
        availability_status: availability,
        is_featured: isFeatured,
      });
      setFeedback({
        type: 'success',
        text: 'تم تحديث حالة التوفر والتمييز دون المساس بحالة الاعتماد.',
      });
      await onUpdated();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof ApiError ? error.message : 'تعذر تحديث إعدادات الظهور.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleAdminDelete = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العقار إدارياً؟')) {
      return;
    }
    setFeedback(null);
    setIsBusy(true);
    try {
      await deleteAdminProperty(property.id);
      if (onDeleted) {
        onDeleted();
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof ApiError ? error.message : 'تعذر حذف العقار.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <aside className="rounded-3xl bg-white p-6 shadow-ambient-lg space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold text-[#C59B4E]">بوابة القرار الإداري</span>
          <h3 className="text-lg font-extrabold text-[#131E26]">قرارات المراجعة والحوكمة</h3>
        </div>
        <ModerationStatusBadge status={property.moderation_status} />
      </div>

      {feedback && (
        <div
          role="alert"
          className={`rounded-2xl p-4 text-xs font-bold ${
            feedback.type === 'success'
              ? 'bg-[#E8F6EF] text-[#136F48]'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Self-Approval Guard Notice */}
      {isSelfOwned && property.moderation_status === 'pending_review' && (
        <div className="rounded-2xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
          <strong className="block font-bold">حاجز منع الاعتماد الذاتي (Self-Approval Guard):</strong>
          أنت منشئ هذا العقار، لذا تمنع قواعد الحوكمة اعتمادك الذاتي له. يجب أن يراجعه مدير آخر، أو استخدم «نشر عقار مباشر (OD-01)» عند الطرح الرسمي.
        </div>
      )}

      {/* Notes / Reason Input */}
      <div className="space-y-1.5 text-start">
        <label
          htmlFor="moderation-reason-input"
          className="block text-xs font-bold text-[#131E26]"
        >
          ملاحظات الاعتماد أو سبب طلب التعديل / الرفض
        </label>
        <textarea
          id="moderation-reason-input"
          rows={3}
          placeholder="اكتب ملاحظات المراجعة (إلزامي 5 أحرف على الأقل عند طلب التعديل أو الرفض)..."
          value={notesOrReason}
          onChange={(e) => setNotesOrReason(e.target.value)}
          className="w-full rounded-2xl bg-[#FAF7F2] p-3.5 text-xs text-[#131E26] ring-1 ring-[#131E26]/10 placeholder:text-[#78828A] focus:bg-white focus:ring-2 focus:ring-[#C59B4E] focus:outline-none"
        />
      </div>

      {/* Decision Buttons */}
      <div className="space-y-2.5">
        <Button
          type="button"
          variant="gold"
          size="md"
          fullWidth
          disabled={!canApprove || isBusy}
          onClick={() => void handleApprove()}
        >
          اعتماد ونشر في السجل العام ✓
        </Button>

        <Button
          type="button"
          variant="outline"
          size="md"
          fullWidth
          disabled={!canRequestChanges || isBusy}
          onClick={() => void handleRequestChanges()}
        >
          طلب تعديلات أو استيفاء بيانات
        </Button>

        <Button
          type="button"
          variant="danger"
          size="md"
          fullWidth
          disabled={!canReject || isBusy}
          onClick={() => void handleReject()}
        >
          رفض الإعلان / إلغاء الاعتماد
        </Button>
      </div>

      {/* Availability & Featured Admin Controls (T9) */}
      <div className="rounded-2xl bg-[#FAF7F2] p-4 space-y-4">
        <span className="block text-xs font-bold text-[#131E26]">
          إعدادات التوفر والتمييز (دون تغيير حالة الاعتماد)
        </span>

        <Select
          label="حالة التوفر (UD-01 = A)"
          value={availability}
          onChange={(e) => setAvailability(e.target.value as AvailabilityStatus)}
          options={Object.entries(AVAILABILITY_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />

        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-white p-3 text-xs font-bold text-[#131E26]">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="h-4 w-4 accent-[#C59B4E]"
          />
          <span>تمييز العقار في صدارة العرض (عقار مميز ★)</span>
        </label>

        <Button
          type="button"
          variant="primary"
          size="sm"
          fullWidth
          disabled={isBusy}
          onClick={() => void handleSaveFlags()}
        >
          حفظ حالة التوفر والتمييز
        </Button>
      </div>

      {/* Admin Delete */}
      <div className="pt-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void handleAdminDelete()}
          className="w-full cursor-pointer rounded-full bg-red-50 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-700 hover:text-white disabled:opacity-50"
        >
          حذف العقار من السجل (Soft Delete)
        </button>
      </div>
    </aside>
  );
}
