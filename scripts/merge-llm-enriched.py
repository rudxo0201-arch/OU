#!/usr/bin/env python3
"""
LLM 생성 데이터를 hanja_merged.json에 병합
Usage: python3 scripts/merge-llm-enriched.py
"""

import json
import os
import glob

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
MERGED_JSON = os.path.join(DATA_DIR, 'hanja_merged.json')
ENRICHED_DIR = os.path.join(DATA_DIR, 'llm_enriched')

def main():
    print("Loading hanja_merged.json...")
    with open(MERGED_JSON, encoding='utf-8') as f:
        data = json.load(f)

    # char → index 매핑
    char_index = {e['char']: i for i, e in enumerate(data)}

    # llm_enriched/*.json 파일들 병합 (batch_* + comp_*)
    files = sorted(
        glob.glob(os.path.join(ENRICHED_DIR, 'batch_*.json')) +
        glob.glob(os.path.join(ENRICHED_DIR, 'comp_*.json'))
    )
    if not files:
        print(f"No files found in {ENRICHED_DIR}")
        return

    filled = {'etymology': 0, 'mnemonic': 0, 'compounds': 0, 'hun': 0, 'components': 0}
    processed = 0

    for filepath in files:
        with open(filepath, encoding='utf-8') as f:
            batch = json.load(f)

        for item in batch:
            char = item.get('char')
            if not char or char not in char_index:
                continue

            idx = char_index[char]
            entry = data[idx]

            for field in ['etymology', 'mnemonic', 'compounds', 'hun']:
                if item.get(field) and not entry.get(field):
                    entry[field] = item[field]
                    filled[field] += 1

            # components는 리스트이므로 별도 처리
            if item.get('components') and not entry.get('components'):
                entry['components'] = item['components']
                filled['components'] += 1

            processed += 1

    with open(MERGED_JSON, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n=== 병합 결과 ({len(files)}개 파일, {processed}자 처리) ===")
    for field, count in filled.items():
        print(f"  {field}: +{count}개 채워짐")

    # 최종 빈값 통계
    total = len(data)
    print("\n=== 최종 빈값 통계 ===")
    for f_name in ['hun', 'sound', 'etymology', 'mnemonic', 'compounds', 'components']:
        empty = sum(1 for e in data if not e.get(f_name))
        print(f"  {f_name:15}: 비어있음 {empty:4}개 ({empty/total*100:.1f}%)")

    print(f"\n✅ 완료! {MERGED_JSON} 업데이트됨")


if __name__ == '__main__':
    main()
