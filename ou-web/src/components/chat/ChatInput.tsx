'use client';

import { useState, useRef, useCallback } from 'react';
import { Box, Textarea, ActionIcon, Group, Text, Stack, Loader } from '@mantine/core';
import { PaperPlaneRight, Stop, Paperclip, X, FilePdf, FileText, FileArrowDown, Slideshow, Microphone, StopCircle } from '@phosphor-icons/react';
import { notifications } from '@mantine/notifications';
import { useVoiceRecorder, type VoiceStatus } from '@/hooks/useVoiceRecorder';

export interface ImageUploadResult {
  text: string;
  imageType: string;
  previewUrl: string;
  fileName: string;
}

export interface FileUploadResult {
  fileType: 'pdf' | 'text' | 'ou' | 'ppt' | 'hwp' | 'docx' | 'xlsx' | 'video' | 'audio';
  fileName: string;
  /** PDF 페이지 수 (있을 때만) */
  pageCount?: number;
  /** 텍스트/마크다운 파일의 내용 */
  textContent?: string;
  /** .ou 파일 JSON */
  ouContent?: string;
  /** 처리 후 생성된 nodeId */
  nodeId?: string;
}

interface ChatInputProps {
  onSend: (text: string, imageResult?: ImageUploadResult, fileResult?: FileUploadResult) => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  loggedIn?: boolean;
}

const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.txt,.md,.csv,.ou,.pptx,.ppt,.hwp,.hwpx,.docx,.xlsx,.mp4,.mov,.mp3,.wav';
const MAX_SIZE_MB = 10;
const MAX_SIZE_MB_VIDEO = 200;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ChatInput({ onSend, onStop, streaming, disabled, loggedIn }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 음성 녹음
  const handleVoiceTranscript = useCallback((text: string) => {
    onSend(text);
  }, [onSend]);

  const handleVoiceError = useCallback((msg: string) => {
    notifications.show({ message: msg, color: 'gray' });
  }, []);

  const { status: voiceStatus, duration, start: startRecording, stop: stopRecording, cancel: cancelRecording } = useVoiceRecorder({
    onTranscript: handleVoiceTranscript,
    onError: handleVoiceError,
  });

  const handleSubmit = async () => {
    if (streaming || disabled) return;

    if (uploadFile) {
      await handleUpload();
      return;
    }

    if (!value.trim()) return;
    onSend(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isMedia = file.type.startsWith('video/') || file.type.startsWith('audio/') || /\.(mp4|mov|mp3|wav)$/i.test(file.name);
    const limit = isMedia ? MAX_SIZE_MB_VIDEO : MAX_SIZE_MB;
    if (file.size > limit * 1024 * 1024) {
      notifications.show({ message: `${limit}MB 이하 파일만 업로드할 수 있어요.`, color: 'gray' });
      return;
    }
    setUploadFile(file);
    e.target.value = '';
  };

  const isImageFile = (file: File) => file.type.startsWith('image/');
  const isPDFFile = (file: File) => file.type === 'application/pdf' || file.name.endsWith('.pdf');
  const isTextFile = (file: File) =>
    file.type === 'text/plain' || file.type === 'text/markdown' ||
    file.name.endsWith('.txt') || file.name.endsWith('.md');
  const isOUFile = (file: File) => file.name.endsWith('.ou');
  const isPPTFile = (file: File) =>
    file.name.endsWith('.ppt') || file.name.endsWith('.pptx');
  const isHWPFile = (file: File) =>
    file.name.endsWith('.hwp') || file.name.endsWith('.hwpx');
  const isDOCXFile = (file: File) => file.name.endsWith('.docx');
  const isXLSXFile = (file: File) => file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  const isVideoFile = (file: File) => file.type.startsWith('video/') || /\.(mp4|mov)$/i.test(file.name);
  const isAudioFile = (file: File) => file.type.startsWith('audio/') || /\.(mp3|wav)$/i.test(file.name);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      if (isImageFile(uploadFile)) {
        // 이미지 → OCR (로그인 불필요)
        const previewUrl = URL.createObjectURL(uploadFile);
        const res = await fetch('/api/ocr', { method: 'POST', body: formData });
        const { text, imageType, error } = await res.json();

        if (error) throw new Error(error);

        const summary = text.length > 200 ? text.slice(0, 200) + '...' : text;
        const prefix = value.trim() ? `${value.trim()} ` : '';
        onSend(
          `${prefix}[이미지: ${uploadFile.name}] ${summary}`,
          { text, imageType, previewUrl, fileName: uploadFile.name }
        );
      } else if (isTextFile(uploadFile)) {
        // 텍스트/마크다운 → 내용 읽어서 채팅에 주입
        const textContent = await uploadFile.text();
        const preview = textContent.length > 300 ? textContent.slice(0, 300) + '...' : textContent;
        const prefix = value.trim() ? `${value.trim()}\n\n` : '';
        const fileResult: FileUploadResult = {
          fileType: 'text',
          fileName: uploadFile.name,
          textContent,
        };
        onSend(
          `${prefix}[파일: ${uploadFile.name}]\n${preview}`,
          undefined,
          fileResult
        );
      } else if (isOUFile(uploadFile)) {
        // .ou 파일 → JSON 파싱해서 뷰어용 데이터 전달
        const ouText = await uploadFile.text();
        const fileResult: FileUploadResult = {
          fileType: 'ou',
          fileName: uploadFile.name,
          ouContent: ouText,
        };
        onSend(
          `[.ou 파일: ${uploadFile.name}]`,
          undefined,
          fileResult
        );
      } else if (isPPTFile(uploadFile) || isHWPFile(uploadFile) || isDOCXFile(uploadFile) || isXLSXFile(uploadFile)) {
        // 문서 파일 → 업로드 후 DataNode 생성
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const { error, nodeId } = await res.json();
        if (error) throw new Error(error);

        if (nodeId) {
          notifications.show({
            title: '문서가 저장되었어요',
            message: '내용을 구조화했어요.',
            color: 'gray',
            autoClose: 5000,
          });
        }

        const fileType = isPPTFile(uploadFile) ? 'ppt'
          : isHWPFile(uploadFile) ? 'hwp'
          : isDOCXFile(uploadFile) ? 'docx'
          : 'xlsx';
        const label = isPPTFile(uploadFile) ? 'PPT'
          : isHWPFile(uploadFile) ? 'HWP'
          : isDOCXFile(uploadFile) ? 'DOCX'
          : 'XLSX';
        const fileResult: FileUploadResult = {
          fileType: fileType as FileUploadResult['fileType'],
          fileName: uploadFile.name,
          nodeId: nodeId ?? undefined,
        };
        onSend(
          `[${label} 파일: ${uploadFile.name}]`,
          undefined,
          fileResult
        );
      } else if (isVideoFile(uploadFile) || isAudioFile(uploadFile)) {
        // 영상/음성 → 업로드 (원본 저장)
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const { error, nodeId } = await res.json();
        if (error) throw new Error(error);

        if (nodeId) {
          notifications.show({
            title: '파일이 저장되었어요',
            message: isVideoFile(uploadFile) ? '영상이 우주에 추가되었어요.' : '음성이 우주에 추가되었어요.',
            color: 'gray',
            autoClose: 5000,
          });
        }

        const fileType = isVideoFile(uploadFile) ? 'video' : 'audio';
        const fileResult: FileUploadResult = {
          fileType,
          fileName: uploadFile.name,
          nodeId: nodeId ?? undefined,
        };
        onSend(
          `[${isVideoFile(uploadFile) ? '영상' : '음성'}: ${uploadFile.name}]`,
          undefined,
          fileResult
        );
      } else if (isPDFFile(uploadFile)) {
        // PDF → 업로드 후 파일 카드로 표시
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const { error, nodeId, pageCount } = await res.json();

        if (error) throw new Error(error);

        if (nodeId) {
          notifications.show({
            title: '문서가 저장되었어요',
            message: '변환된 내용을 확인하면 정확도가 높아져요 (beta)',
            color: 'gray',
            autoClose: 5000,
          });
        }

        const fileResult: FileUploadResult = {
          fileType: 'pdf',
          fileName: uploadFile.name,
          pageCount: pageCount ?? undefined,
          nodeId: nodeId ?? undefined,
        };
        const prefix = value.trim() ? `${value.trim()} ` : '';
        onSend(
          `${prefix}[PDF: ${uploadFile.name}]`,
          undefined,
          fileResult
        );
      } else {
        // 기타 파일 → 업로드 (R2 저장, 로그인 필요)
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const { error } = await res.json();

        if (error) throw new Error(error);

        const msg = value.trim()
          ? `${value.trim()} [파일: ${uploadFile.name}]`
          : `파일을 업로드했어요: ${uploadFile.name}`;
        onSend(msg);
      }

      setValue('');
      setUploadFile(null);
    } catch {
      notifications.show({ message: '파일 처리에 실패했어요.', color: 'gray' });
    } finally {
      setUploading(false);
    }
  };

  const canSend = !streaming && !disabled && !uploading && (value.trim() || uploadFile);
  const isVoiceActive = voiceStatus !== 'idle';

  /* ── Shared orb button style ── */
  const orbBtnStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    transition: 'var(--ou-transition)',
    flexShrink: 0,
    fontFamily: 'inherit',
    padding: 0,
  };

  // 녹음/변환 중일 때: 녹음 전용 UI
  if (isVoiceActive) {
    return (
      <Box
        style={{
          border: '0.5px solid var(--ou-border-subtle)',
          borderRadius: 'var(--ou-radius-chat)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'transparent',
          boxShadow: 'var(--ou-glow-sm)',
        }}
      >
        {voiceStatus === 'recording' ? (
          <>
            {/* 녹음 중 표시 */}
            <Box
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--ou-text-dimmed)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            <Text style={{ flex: 1, fontSize: 13, color: 'var(--ou-text-dimmed)' }}>
              녹음 중 {formatDuration(duration)}
            </Text>

            {/* 취소 */}
            <button
              onClick={cancelRecording}
              style={{
                ...orbBtnStyle,
                background: 'transparent',
                border: '0.5px solid var(--ou-border-subtle)',
                color: 'var(--ou-text-dimmed)',
              }}
            >
              <X size={16} />
            </button>

            {/* 정지 → 전송 */}
            <button
              onClick={stopRecording}
              style={{
                ...orbBtnStyle,
                background: 'rgba(255,255,255,0.9)',
                color: '#111',
                boxShadow: 'var(--ou-glow-sm)',
              }}
            >
              <StopCircle size={18} weight="fill" />
            </button>
          </>
        ) : (
          <>
            {/* 변환 중 */}
            <Loader size={16} color="gray" />
            <Text style={{ flex: 1, fontSize: 13, color: 'var(--ou-text-dimmed)' }}>
              변환 중...
            </Text>
          </>
        )}
      </Box>
    );
  }

  return (
    <Stack gap={4}>
      {uploadFile && (
        <Group
          px="md"
          py={6}
          style={{
            border: '0.5px solid var(--ou-border-subtle)',
            borderRadius: 'var(--ou-radius-md)',
            background: 'transparent',
          }}
        >
          <Box style={{ color: 'var(--ou-text-dimmed)' }}>
            {isPDFFile(uploadFile) ? <FilePdf size={16} /> :
             isTextFile(uploadFile) ? <FileText size={16} /> :
             isOUFile(uploadFile) ? <FileArrowDown size={16} /> :
             (isPPTFile(uploadFile) || isHWPFile(uploadFile) || isDOCXFile(uploadFile) || isXLSXFile(uploadFile)) ? <Slideshow size={16} /> :
             (isVideoFile(uploadFile) || isAudioFile(uploadFile)) ? <FileArrowDown size={16} /> :
             <Paperclip size={14} />}
          </Box>
          <Text style={{ flex: 1, fontSize: 13, color: 'var(--ou-text-body)' }} truncate>
            {uploadFile.name}
          </Text>
          <button
            onClick={() => setUploadFile(null)}
            style={{
              ...orbBtnStyle,
              width: 24,
              height: 24,
              background: 'transparent',
              border: 'none',
              color: 'var(--ou-text-dimmed)',
            }}
          >
            <X size={14} />
          </button>
        </Group>
      )}

      <Box
        style={{
          border: '0.5px solid var(--ou-border-subtle)',
          borderRadius: 'var(--ou-radius-chat)',
          padding: '8px 8px 8px 16px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          background: 'transparent',
          boxShadow: 'var(--ou-glow-xs)',
          transition: 'var(--ou-transition)',
        }}
        onFocus={e => {
          const el = e.currentTarget;
          el.style.borderColor = 'var(--ou-border-strong)';
          el.style.boxShadow = 'var(--ou-glow-md)';
        }}
        onBlur={e => {
          const el = e.currentTarget;
          el.style.borderColor = 'var(--ou-border-subtle)';
          el.style.boxShadow = 'var(--ou-glow-xs)';
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {/* File upload orb */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={streaming || uploading}
          style={{
            ...orbBtnStyle,
            background: 'transparent',
            border: '0.5px solid var(--ou-border-muted)',
            color: 'var(--ou-text-dimmed)',
            opacity: streaming || uploading ? 0.4 : 1,
            cursor: streaming || uploading ? 'not-allowed' : 'pointer',
            boxShadow: 'var(--ou-glow-sm)',
          }}
          onMouseEnter={e => {
            if (!streaming && !uploading) {
              e.currentTarget.style.borderColor = 'var(--ou-border-hover)';
              e.currentTarget.style.boxShadow = 'var(--ou-glow-md)';
              e.currentTarget.style.transform = 'scale(1.08)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--ou-border-muted)';
            e.currentTarget.style.boxShadow = 'var(--ou-glow-sm)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Paperclip size={16} />
        </button>

        <Textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={uploadFile ? '파일에 대해 설명을 추가하세요 (선택)' : '뭐든 말씀해보세요...'}
          autosize
          minRows={1}
          maxRows={6}
          styles={{
            root: { flex: 1 },
            input: {
              border: 'none',
              background: 'transparent',
              padding: 0,
              resize: 'none',
              boxShadow: 'none',
              color: 'var(--ou-text-bright)',
              fontSize: 14,
              '&::placeholder': {
                color: 'var(--ou-text-muted)',
              },
            },
          }}
        />

        {streaming ? (
          <button
            onClick={onStop}
            style={{
              ...orbBtnStyle,
              background: 'rgba(255,255,255,0.9)',
              color: '#111',
              boxShadow: 'var(--ou-glow-sm)',
            }}
          >
            <Stop size={16} weight="fill" />
          </button>
        ) : value.trim() || uploadFile ? (
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            style={{
              ...orbBtnStyle,
              background: canSend ? 'rgba(255,255,255,0.9)' : 'var(--ou-surface-muted)',
              color: canSend ? '#111' : 'var(--ou-text-dimmed)',
              boxShadow: canSend ? 'var(--ou-glow-sm)' : 'none',
              cursor: canSend ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={e => {
              if (canSend) {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.transform = 'scale(1.08)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = canSend ? 'rgba(255,255,255,0.9)' : 'var(--ou-surface-muted)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {uploading ? <Loader size={14} color="dark" /> : <PaperPlaneRight size={16} weight="fill" />}
          </button>
        ) : (
          <button
            onClick={startRecording}
            disabled={disabled}
            style={{
              ...orbBtnStyle,
              background: 'transparent',
              border: '0.5px solid var(--ou-border-muted)',
              color: 'var(--ou-text-dimmed)',
              opacity: disabled ? 0.4 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--ou-glow-sm)',
            }}
            onMouseEnter={e => {
              if (!disabled) {
                e.currentTarget.style.borderColor = 'var(--ou-border-hover)';
                e.currentTarget.style.boxShadow = 'var(--ou-glow-md)';
                e.currentTarget.style.transform = 'scale(1.08)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--ou-border-muted)';
              e.currentTarget.style.boxShadow = 'var(--ou-glow-sm)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Microphone size={18} weight="fill" />
          </button>
        )}
      </Box>
    </Stack>
  );
}
