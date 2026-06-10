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

const LINK_PATTERN = /((?:https?:\/\/|www\.)[^\s<]+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}(?:\/[^\s<]*)?)/gi;
const TRAILING_LINK_PUNCTUATION = /[),.!?:;]+$/;

export function normalizeLinkUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function extractMessageLinks(content: string | undefined | null) {
  if (!content || typeof content !== 'string') return [];

  const links: { text: string; url: string; index: number }[] = [];
  const regex = new RegExp(LINK_PATTERN);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const raw = match[0];
    const previousChar = match.index > 0 ? content[match.index - 1] : '';
    if (previousChar === '@') continue;

    const trailing = raw.match(TRAILING_LINK_PUNCTUATION)?.[0] || '';
    const text = raw.slice(0, raw.length - trailing.length);
    if (!text || !text.includes('.')) continue;

    links.push({
      text,
      url: normalizeLinkUrl(text),
      index: match.index
    });
  }

  return links;
}

export function renderMessageContent(
  content: string | undefined | null,
  isMine: boolean,
  onLinkClick: (url: string) => void
) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const links = extractMessageLinks(content);
  if (links.length === 0) {
    return content;
  }

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  links.forEach((link, index) => {
    if (link.index > lastIndex) {
      nodes.push(content.slice(lastIndex, link.index));
    }

    nodes.push(
      <span
        key={`${link.text}-${index}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onLinkClick(link.url);
        }}
        className={`underline font-medium cursor-pointer break-all inline hover:opacity-85 transition-opacity ${
          isMine ? 'text-green-100 hover:text-white' : 'text-green-600 hover:text-green-700'
        }`}
      >
        {link.text}
      </span>
    );

    lastIndex = link.index + link.text.length;
  });

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }

  return nodes;
}
