import type { ComponentType } from 'react';

export interface ToolProps {
  /** 사용자가 입력한 원본 텍스트 */
  rawInput: string;
  /** 파싱된 데이터 (자동 추출된 필드들) */
  parsed: Record<string, string>;
  /** 추가 정보 입력 시 채팅에 전송 */
  onSubmit: (text: string) => void;
}

export interface ToolDefinition {
  id: string;
  label: string;
  /** 이 Tool이 활성화되어야 하는지 판단 */
  match: (input: string, domain: string) => boolean;
  /** 원본 텍스트에서 자동으로 필드 추출 */
  parse: (input: string) => Record<string, string>;
  component: ComponentType<ToolProps>;
}

// Tool Registry — 새 Tool 추가 = 여기에 등록만
const registry: ToolDefinition[] = [];

export function registerTool(tool: ToolDefinition) {
  registry.push(tool);
}

export function findTool(input: string, domain: string): ToolDefinition | null {
  return registry.find(t => t.match(input, domain)) ?? null;
}

export function getToolRegistry() {
  return registry;
}
