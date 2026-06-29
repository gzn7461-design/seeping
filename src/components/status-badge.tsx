'use client';

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'pending' | 'published' | 'failed' | 'cancelled';
}

const statusConfig = {
  pending: {
    label: '待发布',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  published: {
    label: '已发布',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  failed: {
    label: '失败',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  cancelled: {
    label: '已取消',
    className: 'bg-gray-50 text-gray-700 border-gray-200',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}
