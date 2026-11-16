'use client';

import React, { useEffect, useState } from 'react';
import { checkApiHealth, ensureCsrfCookie, getCookie, ApiError } from '@/lib/api/client';
import { HealthCheckData } from '@/types/api';

type DiagnosticState = 'loading' | 'healthy' | 'db_error' | 'api_error' | 'unreachable';

interface DiagnosticReport {
  state: DiagnosticState;
  healthData?: HealthCheckData;
  csrfReady: boolean;
  errorMessage?: string;
  statusCode?: number;
  errorCode?: string;
}

export function BackendHealthStatus() {
  const [report, setReport] = useState<DiagnosticReport>({
    state: 'loading',
    csrfReady: false,
  });

  const runDiagnostics = async () => {
    setReport({ state: 'loading', csrfReady: false });

    let csrfReady = false;
    try {
      await ensureCsrfCookie();
      csrfReady = Boolean(getCookie('XSRF-TOKEN'));
    } catch {
      csrfReady = false;
    }

    try {
      const response = await checkApiHealth();
      const data = response.data;

      if (data && data.database === 'connected') {
        setReport({
          state: 'healthy',
          healthData: data,
          csrfReady,
        });
      } else {
        setReport({
          state: 'db_error',
          healthData: data,
          csrfReady,
          errorMessage: 'تعذر الاتصال بقاعدة البيانات من قبل الخادم',
          statusCode: 200,
          errorCode: 'DATABASE_DISCONNECTED',
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 503 || err.errorCode === 'DATABASE_ERROR') {
          setReport({
            state: 'db_error',
            csrfReady,
            errorMessage: err.message,
            statusCode: err.status,
            errorCode: err.errorCode,
          });
        } else if (err.status === 0 || err.errorCode === 'NETWORK_ERROR') {
          setReport({
            state: 'unreachable',
            csrfReady: false,
            errorMessage: err.message,
            statusCode: 0,
            errorCode: 'NETWORK_ERROR',
          });
        } else {
          setReport({
            state: 'api_error',
            csrfReady,
            errorMessage: err.message,
            statusCode: err.status,
            errorCode: err.errorCode,
          });
        }
      } else {
        setReport({
          state: 'unreachable',
          csrfReady: false,
          errorMessage: 'تعذر الوصول إلى الخادم الخلفي (خطأ غير متوقع)',
          statusCode: 0,
          errorCode: 'NETWORK_ERROR',
        });
      }
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            حالة التكامل مع الخادم الخلفي (Backend Integration)
          </h2>
          <p className="text-xs text-gray-500">
            فحص تشخيصي ثلاثي الأبعاد: واجهة REST API، قاعدة البيانات، وجاهزية ملف تعريف الارتباط CSRF.
          </p>
        </div>
        <button
          type="button"
          onClick={runDiagnostics}
          disabled={report.state === 'loading'}
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 disabled:opacity-50"
        >
          {report.state === 'loading' ? 'جاري الفحص...' : 'إعادة الفحص'}
        </button>
      </div>

      <div className="pt-4">
        {report.state === 'loading' && (
          <div className="flex items-center gap-3 py-4 text-sm text-gray-600">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <span>جاري الاتصال بنقاط نهاية الخادم الخلفي وفحص الحالة...</span>
          </div>
        )}

        {report.state === 'healthy' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" />
              <span>متصل بالخادم وقاعدة البيانات بنجاح (النظام يعمل بكفاءة كاملة)</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <span className="block text-xs text-gray-500">حالة واجهة API</span>
                <span className="font-semibold text-gray-800">
                  متاح — الإصدار {report.healthData?.version}
                </span>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <span className="block text-xs text-gray-500">حالة قاعدة البيانات</span>
                <span className="font-semibold text-emerald-600">متصل</span>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <span className="block text-xs text-gray-500">جاهزية مصافحة CSRF</span>
                <span className={report.csrfReady ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>
                  {report.csrfReady ? 'جاهز (XSRF-TOKEN مفعّل)' : 'قيد الانتظار'}
                </span>
              </div>
            </div>
          </div>
        )}

        {report.state === 'db_error' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-600" />
              <span>الخادم الخلفي متاح، ولكن تعذر الاتصال بقاعدة البيانات</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <span className="block text-xs text-gray-500">حالة واجهة API</span>
                <span className="font-semibold text-emerald-600">متاح — الخادم يعمل</span>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <span className="block text-xs text-amber-700">حالة قاعدة البيانات</span>
                <span className="font-semibold text-amber-900">
                  خطأ في الاتصال بقاعدة البيانات — {report.statusCode || 503} {report.errorCode || 'DATABASE_ERROR'}
                </span>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <span className="block text-xs text-gray-500">جاهزية مصافحة CSRF</span>
                <span className={report.csrfReady ? 'font-semibold text-emerald-600' : 'font-semibold text-gray-600'}>
                  {report.csrfReady ? 'جاهز' : 'غير متوفر'}
                </span>
              </div>
            </div>
          </div>
        )}

        {report.state === 'api_error' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-600" />
              <span>استجاب الخادم الخلفي بخطأ برمجي (HTTP {report.statusCode})</span>
            </div>
            <p className="text-xs text-gray-600">
              {report.errorMessage || 'استجابة غير متوقعة من خادم التطبيق.'} (رمز الخطأ: {report.errorCode})
            </p>
          </div>
        )}

        {report.state === 'unreachable' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-800">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-600" />
              <span>تعذر الوصول إلى الخادم الخلفي (Backend غير متصل على المنفذ 8000)</span>
            </div>
            <p className="text-xs text-gray-600">
              تأكد من تشغيل خادم Laravel عبر الأمر:{' '}
              <code className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-gray-800">
                php artisan serve --host=localhost --port=8000
              </code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

