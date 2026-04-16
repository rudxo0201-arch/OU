'use client';

import { Box, Text, Image, Group, UnstyledButton } from '@mantine/core';
import { FilePdf, FileText, Globe, Slideshow, ArrowRight } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';
import { NodeCreatedBadge } from './NodeCreatedBadge';
import { findTool } from '@/components/tools';
import type { ChatMessage } from '@/stores/chatStore';
import type { FileUploadResult } from './ChatInput';

/** 이미지 메시지에서 [이미지: ...] 태그 제거 (미리보기가 있을 때만) */
function cleanDisplayText(content: string, hasImage?: boolean, hasFile?: boolean): string {
  let text = content;
  if (hasImage) {
    text = text.replace(/\[이미지:\s*[^\]]*\]\s*/g, '').trim();
  }
  if (hasFile) {
    text = text.replace(/\[(PDF|파일|\.ou 파일|PPT 파일|HWP 파일):\s*[^\]]*\]\s*/g, '').trim();
  }
  return text;
}

/** 파일 카드 (PDF, .ou, PPT, HWP) */
function FileCard({ fileResult }: { fileResult: NonNullable<ChatMessage['fileResult']> }) {
  const router = useRouter();

  const iconMap = {
    pdf: <FilePdf size={20} />,
    text: <FileText size={20} />,
    ou: <Globe size={20} />,
    ppt: <Slideshow size={20} />,
    hwp: <FileText size={20} />,
    docx: <FileText size={20} />,
    xlsx: <FileText size={20} />,
    video: <FileText size={20} />,
    audio: <FileText size={20} />,
  };

  const labelMap: Record<string, string> = {
    pdf: 'PDF',
    text: '텍스트',
    ou: '.ou',
    ppt: 'PPT',
    hwp: 'HWP',
    docx: 'Word',
    xlsx: 'Excel',
    video: '영상',
    audio: '음성',
  };

  const hasLink = !!fileResult.nodeId;

  return (
    <UnstyledButton
      onClick={() => {
        if (hasLink) router.push(`/view/${fileResult.nodeId}`);
      }}
      style={{ cursor: hasLink ? 'pointer' : 'default', width: '100%' }}
    >
      <Group
        gap="sm"
        px="sm"
        py={8}
        style={{
          border: '0.5px solid var(--ou-border-subtle)',
          borderRadius: 'var(--ou-radius-md)',
          background: 'transparent',
          transition: 'var(--ou-transition)',
        }}
      >
        <Box style={{ flexShrink: 0, color: 'var(--ou-text-dimmed)' }}>
          {iconMap[fileResult.fileType] ?? <FileText size={20} />}
        </Box>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: 500, color: 'var(--ou-text-body)' }} truncate>
            {fileResult.fileName}
          </Text>
          <Text style={{ fontSize: 10, color: 'var(--ou-text-dimmed)' }}>
            {fileResult.pageCount
              ? `${labelMap[fileResult.fileType]} · ${fileResult.pageCount}쪽`
              : labelMap[fileResult.fileType]}
          </Text>
        </Box>
        {hasLink && (
          <ArrowRight size={12} style={{ color: 'var(--ou-text-dimmed)', flexShrink: 0 }} />
        )}
      </Group>
    </UnstyledButton>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  userMessage?: string;
  /** 직전 user 메시지 전체 (OCR 등 메타 접근용) */
  prevUserMessage?: ChatMessage;
  onAddInfo?: (text: string) => void;
}

export function MessageBubble({ message, userMessage, prevUserMessage, onAddInfo }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  // Tool 매칭
  const tool = message.nodeCreated && !message.streaming
    ? findTool(userMessage ?? '', message.nodeCreated.domain)
    : null;

  // ImageTool에 OCR 데이터 주입
  const toolParsed = tool
    ? (() => {
        const base = tool.parse(userMessage ?? '');
        if (tool.id === 'image' && prevUserMessage?.ocrResult) {
          return {
            ...base,
            _ocrText: prevUserMessage.ocrResult.text,
            _imageType: prevUserMessage.ocrResult.imageType,
          };
        }
        return base;
      })()
    : null;

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      {isUser ? (
        /* ── User bubble: bubble-block.user ── */
        <Box
          style={{
            maxWidth: '70%',
            padding: '14px 16px',
            background: 'var(--ou-surface-subtle)',
            border: '1px solid var(--ou-border-medium)',
            borderRadius: '20px 20px 4px 20px',
            marginLeft: 'auto',
            boxShadow: 'var(--ou-glow-md)',
          }}
        >
          {/* 이미지 미리보기 */}
          {message.imagePreview && (
            <Box mb="xs">
              <Image
                src={message.imagePreview}
                alt="업로드 이미지"
                radius="sm"
                maw={240}
                style={{ borderRadius: 12 }}
              />
            </Box>
          )}
          {/* 파일 카드 */}
          {message.fileResult && (
            <Box mb="xs">
              <FileCard fileResult={message.fileResult} />
            </Box>
          )}
          <Text style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: 13,
            color: 'var(--ou-text-bright)',
            lineHeight: 1.6,
          }}>
            {cleanDisplayText(message.content, !!message.imagePreview, !!message.fileResult) || message.content}
          </Text>
        </Box>
      ) : (
        /* ── Assistant: bubble-block.assistant ── */
        <Box
          style={{
            maxWidth: '90%',
            paddingLeft: 14,
            borderLeft: '1.5px solid var(--ou-border-muted)',
          }}
        >
          <Box
            className="ou-markdown"
            style={{
              fontSize: 13,
              lineHeight: 1.8,
              wordBreak: 'break-word',
              color: 'var(--ou-text-body)',
            }}
          >
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {message.streaming && (
              <Box
                component="span"
                style={{
                  display: 'inline-flex',
                  gap: 3,
                  marginLeft: 6,
                  verticalAlign: 'middle',
                }}
              >
                {[0, 1, 2].map(i => (
                  <Box
                    key={i}
                    component="span"
                    style={{
                      display: 'inline-block',
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: 'var(--ou-text-dimmed)',
                      animation: `ou-pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Tool이 매칭되면 Tool UI, 아니면 기본 NodeCreatedBadge */}
          {!message.streaming && message.nodeCreated && (
            tool && toolParsed ? (
              <tool.component
                rawInput={userMessage ?? ''}
                parsed={toolParsed}
                onSubmit={onAddInfo ?? (() => {})}
              />
            ) : (
              <NodeCreatedBadge
                domain={message.nodeCreated.domain}
                nodeId={message.nodeCreated.nodeId}
                userMessage={userMessage}
                confidence={message.nodeCreated.confidence}
                onAddInfo={onAddInfo}
              />
            )
          )}
        </Box>
      )}
    </Box>
  );
}
