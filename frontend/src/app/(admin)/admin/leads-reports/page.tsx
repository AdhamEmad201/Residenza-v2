'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type {
  AdminCompanyItem,
  BuyerRequestItem,
  PropertyReportItem,
} from '@/types/api';
import {
  getAdminBuyerRequests,
  getAdminCompanies,
  getAdminExportCsvUrl,
  getAdminReports,
  updateAdminBuyerRequest,
  updateAdminReport,
} from '@/lib/api/admin';
import { formatPriceEgp } from '@/lib/utils/format';
import { ApiError } from '@/lib/api/client';

function buildWhatsappUrl(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('0') ? `2${digits}` : digits.startsWith('20') ? digits : `20${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export default function AdminLeadsAndReportsPage() {
  const [activeTab, setActiveTab] = useState<'leads' | 'reports'>('leads');
  const [leads, setLeads] = useState<BuyerRequestItem[]>([]);
  const [reports, setReports] = useState<PropertyReportItem[]>([]);
  const [companies, setCompanies] = useState<AdminCompanyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorText(null);
    try {
      const [leadsRes, reportsRes, companiesRes] = await Promise.all([
        getAdminBuyerRequests(),
        getAdminReports(),
        getAdminCompanies({ per_page: 50 }),
      ]);
      setLeads(leadsRes.data ?? []);
      setReports(reportsRes.data ?? []);
      setCompanies(companiesRes.data ?? []);
    } catch (err) {
      setErrorText(err instanceof ApiError ? err.message : 'تعذر تحميل البيانات.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAssignCompany = async (leadId: number, companyIdStr: string) => {
    setFeedback(null);
    setErrorText(null);
    try {
      const assignedId = companyIdStr ? Number(companyIdStr) : null;
      await updateAdminBuyerRequest(leadId, {
        assigned_company_id: assignedId,
        status: assignedId ? 'assigned' : 'new',
      });
      setFeedback('تم تحديث توجيه طلب المشتري بنجاح.');
      await loadData();
    } catch (err) {
      setErrorText(err instanceof ApiError ? err.message : 'تعذر توجيه الطلب.');
    }
  };

  const handleUpdateLeadStatus = async (
    leadId: number,
    status: 'new' | 'assigned' | 'closed'
  ) => {
    setFeedback(null);
    setErrorText(null);
    try {
      await updateAdminBuyerRequest(leadId, { status });
      setFeedback('تم تحديث حالة طلب المشتري.');
      await loadData();
    } catch (err) {
      setErrorText(err instanceof ApiError ? err.message : 'تعذر تحديث الحالة.');
    }
  };

  const handleResolveReport = async (reportId: number, rejectProperty: boolean) => {
    setFeedback(null);
    setErrorText(null);
    try {
      await updateAdminReport(reportId, {
        status: 'resolved',
        reject_property: rejectProperty,
        rejection_reason: rejectProperty ? 'تم إيقاف الإعلان بناءً على مراجعة بلاغ الزوار' : undefined,
      });
      setFeedback(
        rejectProperty
          ? 'تم إغلاق البلاغ ورفض العقار المبلّغ عنه.'
          : 'تم وضع علامة «تم الحل» على البلاغ.'
      );
      await loadData();
    } catch (err) {
      setErrorText(err instanceof ApiError ? err.message : 'تعذر تحديث البلاغ.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-ambient">
        <div>
          <span className="text-xs font-bold text-[#9F7753]">
            إدارة الطلبات العقارية وجودة الإعلانات
          </span>
          <h2 className="text-2xl font-extrabold text-[#403E3D]">
            طلبات المشترين وبلاغات الزوار
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            className={`cursor-pointer rounded-full px-5 py-2.5 text-xs font-bold transition ${
              activeTab === 'leads'
                ? 'bg-[#403E3D] text-white'
                : 'bg-[#FAF7F2] text-[#403E3D] hover:bg-[#F3EAD8]'
            }`}
          >
            طلبات المشترين - اطلب عقارك ({leads.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`cursor-pointer rounded-full px-5 py-2.5 text-xs font-bold transition ${
              activeTab === 'reports'
                ? 'bg-[#403E3D] text-white'
                : 'bg-[#FAF7F2] text-[#403E3D] hover:bg-[#F3EAD8]'
            }`}
          >
            بلاغات الزوار ({reports.length})
          </button>
          <a
            href={getAdminExportCsvUrl('buyer-requests')}
            className="rounded-full bg-[#F3EAD8] px-4 py-2.5 text-xs font-bold text-[#403E3D] transition hover:bg-[#CEB38F]/60"
          >
            ⬇ تصدير الطلبات CSV
          </a>
        </div>
      </div>

      {feedback && (
        <div className="rounded-2xl bg-[#E8F6EF] p-4 text-xs font-bold text-[#136F48]">
          {feedback}
        </div>
      )}
      {errorText && (
        <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700">{errorText}</div>
      )}

      {isLoading ? (
        <div className="rounded-3xl bg-white p-12 text-center text-xs font-bold text-[#7D7772] shadow-ambient">
          جارٍ تحميل الطلبات والبلاغات...
        </div>
      ) : activeTab === 'leads' ? (
        <div className="space-y-4">
          {leads.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center text-xs font-bold text-[#7D7772] shadow-ambient">
              لا توجد طلبات مشترين مسجلة حتى الآن.
            </div>
          ) : (
            leads.map((lead) => (
              <div
                key={lead.id}
                className="flex flex-col justify-between gap-4 rounded-3xl bg-white p-6 shadow-ambient lg:flex-row lg:items-center"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-0.5 text-[11px] font-bold ${
                        lead.status === 'new'
                          ? 'bg-amber-100 text-amber-800'
                          : lead.status === 'assigned'
                            ? 'bg-[#E8F6EF] text-[#136F48]'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {lead.status === 'new'
                        ? 'طلب جديد'
                        : lead.status === 'assigned'
                          ? 'تم التوجيه لشركة'
                          : 'مغلق'}
                    </span>
                    <span className="rounded-full bg-[#F3EAD8] px-3 py-0.5 text-[11px] font-bold text-[#403E3D]">
                      {lead.property_type}
                    </span>
                    <span className="rounded-full bg-[#FAF7F2] px-3 py-0.5 text-[11px] font-bold text-[#9F7753]">
                      📍 {lead.area}
                    </span>
                    {lead.budget_max && (
                      <span className="text-xs font-extrabold text-[#403E3D] tabular-nums-west">
                        الميزانية: {formatPriceEgp(lead.budget_max)}
                      </span>
                    )}
                  </div>

                  <p className="text-base font-extrabold text-[#403E3D]">
                    {lead.name}{' '}
                    <span className="font-mono text-xs text-[#9F7753]" dir="ltr">
                      ({lead.phone})
                    </span>
                  </p>
                  {lead.notes && <p className="text-xs text-[#5C5855]">{lead.notes}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    aria-label="توجيه الطلب لشركة عقارية"
                    value={lead.assigned_company_id ?? ''}
                    onChange={(e) => handleAssignCompany(lead.id, e.target.value)}
                    className="rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-3.5 py-2 text-xs font-bold text-[#403E3D] focus:outline-none"
                  >
                    <option value="">— توجيه لشركة معتمدة —</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <a
                    href={buildWhatsappUrl(
                      lead.phone,
                      `مرحباً ${lead.name}، بخصوص طلبك العقاري (${lead.property_type} في ${lead.area}) على منصة ريزيدنزا سوهاج:`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-[#136F48] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0F5939]"
                  >
                    تواصل واتساب
                  </a>

                  {lead.status !== 'closed' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateLeadStatus(lead.id, 'closed')}
                      className="cursor-pointer rounded-full bg-[#FAF7F2] px-4 py-2 text-xs font-bold text-[#5C5855] hover:bg-[#F3EAD8]"
                    >
                      إغلاق الطلب
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center text-xs font-bold text-[#7D7772] shadow-ambient">
              لا توجد بلاغات زوار حالياً.
            </div>
          ) : (
            reports.map((rep) => (
              <div
                key={rep.id}
                className="flex flex-col justify-between gap-4 rounded-3xl bg-white p-6 shadow-ambient lg:flex-row lg:items-center"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-0.5 text-[11px] font-bold ${
                        rep.status === 'open'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-[#E8F6EF] text-[#136F48]'
                      }`}
                    >
                      {rep.status === 'open' ? '🚩 بلاغ مفتوح' : '✓ تم الحل'}
                    </span>
                    {rep.property && (
                      <span className="font-mono text-xs font-bold text-[#9F7753]">
                        {rep.property.reference_code} — {rep.property.title_ar}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-extrabold text-[#403E3D]">السبب: {rep.reason}</p>
                  {rep.notes && <p className="text-xs text-[#5C5855]">{rep.notes}</p>}
                  {rep.reporter_phone && (
                    <p className="text-xs text-[#7D7772]">
                      هاتف المبلّغ: <span dir="ltr">{rep.reporter_phone}</span>
                    </p>
                  )}
                </div>

                {rep.status === 'open' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleResolveReport(rep.id, false)}
                      className="cursor-pointer rounded-full bg-[#136F48] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0F5939]"
                    >
                      ✓ تم التحقق وإغلاق البلاغ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveReport(rep.id, true)}
                      className="cursor-pointer rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                    >
                      ✕ رفض العقار وإغلاق البلاغ
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
