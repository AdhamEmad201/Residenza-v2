'use client';

import React, { useEffect, useState } from 'react';
import { Container } from './Container';
import { getPublicSiteConfig } from '@/lib/api/public';

export function AnnouncementBar() {
  const [text, setText] = useState('');
  const [active, setActive] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const cfg = await getPublicSiteConfig();
      if (!mounted || !cfg) return;
      if (cfg.announcement_bar?.active && cfg.announcement_bar.text?.trim()) {
        setText(cfg.announcement_bar.text.trim());
        setActive(true);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  if (!active || !text || dismissed) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="إعلان المنصة"
      className="bg-[#403E3D] text-[#F3EAD8] border-b border-[#9F7753]/30 py-2 text-xs"
    >
      <Container>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#CEB38F]" />
            <span>{text}</span>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="إغلاق الإعلان"
            className="cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-bold text-[#CEB38F] transition hover:bg-white/10 hover:text-white"
          >
            إغلاق ✕
          </button>
        </div>
      </Container>
    </div>
  );
}
