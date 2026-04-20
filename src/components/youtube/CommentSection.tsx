'use client';

/**
 * CommentSection
 *
 * YouTube 댓글 표시 + "인용해서 기록" 버튼.
 * 인용 클릭 시 VideoOrb에 댓글 인용문을 전달.
 */

import { useState } from 'react';
import { ChatCircle, Quotes } from '@phosphor-icons/react';

export interface YouTubeComment {
  authorName: string;
  text: string;
  likeCount: number | null;
}

interface Props {
  comments: YouTubeComment[];
  onQuote: (comment: YouTubeComment) => void;
}

export function CommentSection({ comments, onQuote }: Props) {
  const [expanded, setExpanded] = useState(true);

  if (comments.length === 0) return null;

  return (
    <div style={{ marginTop: 20 }}>
      {/* 헤더 */}
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 0 12px',
          color: 'var(--ou-text-body)',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        <ChatCircle size={16} />
        댓글 {comments.length}개
        <span style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginLeft: 4 }}>
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {comments.map((comment, i) => (
            <CommentItem key={i} comment={comment} onQuote={onQuote} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, onQuote }: { comment: YouTubeComment; onQuote: (c: YouTubeComment) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '12px 14px',
        borderRadius: 'var(--ou-radius-md)',
        background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-raised-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ou-text-muted)' }}>
          @{comment.authorName}
        </span>
        {hovered && (
          <button
            onClick={() => onQuote(comment)}
            title="인용해서 기록"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 'var(--ou-radius-sm)',
              border: 'none',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-md)',
              fontSize: 12,
              color: 'var(--ou-text-body)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Quotes size={12} />
            인용해서 기록
          </button>
        )}
      </div>
      <div style={{ fontSize: 14, color: 'var(--ou-text-body)', lineHeight: 1.5 }}>
        {comment.text}
      </div>
    </div>
  );
}
