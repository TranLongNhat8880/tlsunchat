import React from 'react';
import api from '../lib/api';

export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>
) {
  let nextIndex = 0;
  const errors: unknown[] = [];
  const workerCount = Math.min(limit, items.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      try {
        await task(item);
      } catch (error) {
        errors.push(error);
      }
    }
  });

  await Promise.all(workers);

  if (errors.length > 0) {
    throw errors[0];
  }
}

export function getFileIcon(name: string = '') {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf'].includes(ext)) return { color: 'text-red-500', bg: 'bg-red-50' };
  if (['xlsx', 'xls', 'csv'].includes(ext)) return { color: 'text-green-600', bg: 'bg-green-50' };
  if (['docx', 'doc'].includes(ext)) return { color: 'text-blue-500', bg: 'bg-blue-50' };
  if (['pptx', 'ppt'].includes(ext)) return { color: 'text-orange-500', bg: 'bg-orange-50' };
  if (['zip', 'rar', '7z'].includes(ext)) return { color: 'text-purple-500', bg: 'bg-purple-50' };
  return { color: 'text-gray-500', bg: 'bg-gray-100' };
}

export async function downloadAttachment(fileId: string | undefined, fileName: string) {
  if (!fileId) {
    alert('Đang xử lý file, vui lòng thử lại sau!');
    return;
  }

  try {
    const res = await api.get(`/files/${fileId}/download`);
    const downloadUrl = res.data?.data?.downloadUrl;
    if (!downloadUrl) throw new Error('Không lấy được link tải');

    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = fileName;
    anchor.rel = 'noopener noreferrer';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } catch (e) {
    alert('Lỗi khi tải file!');
  }
}

export function renderMessageContent(
  content: string | undefined | null,
  isMine: boolean,
  onLinkClick: (url: string) => void
) {
  if (!content || typeof content !== 'string') {
    return '';
  }
  const URL_REGEX = /(https?:\/\/[^\s]+)/gi;
  const parts = content.split(URL_REGEX);
  if (parts.length === 1) {
    return content;
  }

  return parts.map((part, index) => {
    if (part.match(URL_REGEX)) {
      return (
        <span
          key={index}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLinkClick(part);
          }}
          className={`underline font-medium cursor-pointer break-all inline hover:opacity-85 transition-opacity ${
            isMine ? 'text-green-100 hover:text-white' : 'text-green-600 hover:text-green-700'
          }`}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}
