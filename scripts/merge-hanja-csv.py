#!/usr/bin/env python3
"""
한자 DB 병합 스크립트

소스 1: /Users/kt/Downloads/한자_DB_병합.csv (기존, 한의학 포함)
소스 2: /Users/kt/Downloads/hanja_grade_opensource.csv (rycont, 급수 완전)

결과: scripts/data/hanja_merged.json
"""

import csv
import json
import ast
import os
from pathlib import Path

# ── 급수 변환 테이블 (오픈소스 → 표준) ─────────────────────────────────────
LEVEL_MAP = {
    '8급':   '8급',
    '7급Ⅱ': '준7급',
    '7급':   '7급',
    '6급Ⅱ': '준6급',
    '6급':   '6급',
    '5급Ⅱ': '준5급',
    '5급':   '5급',
    '4급Ⅱ': '준4급',
    '4급':   '4급',
    '3급Ⅱ': '준3급',
    '3급':   '3급',
    '2급':   '2급',
    '1급':   '1급',
    '특급':  '특급',
    '특급Ⅱ':'준특급',
}

def parse_meaning(raw: str):
    """[[['훈'], ['음']]] 형식 파싱 → (hun, meaning, sound)"""
    try:
        parsed = ast.literal_eval(raw)
        if parsed and isinstance(parsed, list) and isinstance(parsed[0], list):
            entry = parsed[0]
            hun_list = entry[0] if len(entry) > 0 else []
            # sound는 main_sound 컬럼에서 가져오므로 여기선 훈만 사용
            hun = ', '.join(hun_list) if hun_list else ''
            meaning = hun  # 뜻 = 훈의 첫 번째
            return hun, meaning
    except Exception:
        pass
    return '', ''

def is_empty(val: str) -> bool:
    v = val.strip()
    return v == '' or v == '확인필요'

def load_existing_csv(path: str) -> dict:
    """기존 CSV 로드 → {char: entry_dict}"""
    result = {}
    with open(path, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        headers = next(reader)  # 이름,훈,뜻,음,병음,부수,어원해설,암기법,대표복합어,중요도,도메인,자형분류,급수,총획수
        for row in reader:
            if not row:
                continue
            char = row[0].strip()
            if not char:
                continue
            entry = {
                'char':      char,
                'hun':       row[1].strip() if len(row) > 1 else '',
                'meaning':   row[2].strip() if len(row) > 2 else '',
                'sound':     row[3].strip() if len(row) > 3 else '',
                'pinyin':    row[4].strip() if len(row) > 4 else '',
                'radical':   row[5].strip() if len(row) > 5 else '',
                'etymology': row[6].strip() if len(row) > 6 else '',
                'mnemonic':  row[7].strip() if len(row) > 7 else '',
                'compounds': row[8].strip() if len(row) > 8 else '',
                'importance':row[9].strip() if len(row) > 9 else '',
                'domain':    row[10].strip() if len(row) > 10 else '',
                'char_type': row[11].strip() if len(row) > 11 else '',
                'grade':     row[12].strip() if len(row) > 12 else '',
                'stroke_count': row[13].strip() if len(row) > 13 else '',
            }
            # 빈 값 정리
            for k in list(entry.keys()):
                if is_empty(entry[k]):
                    entry[k] = ''
            result[char] = entry
    return result

def load_opensource_csv(path: str) -> dict:
    """오픈소스 CSV 로드 → {char: entry_dict}"""
    result = {}
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)  # main_sound,level,hanja,meaning,radical,strokes,total_strokes
        for row in reader:
            if len(row) < 7:
                continue
            char = row[2].strip()
            if not char:
                continue
            hun, meaning = parse_meaning(row[3])
            grade = LEVEL_MAP.get(row[1].strip(), row[1].strip())
            entry = {
                'char':         char,
                'sound':        row[0].strip(),
                'grade':        grade,
                'hun':          hun,
                'meaning':      meaning,
                'radical':      row[4].strip(),
                'stroke_count': row[6].strip(),
            }
            result[char] = entry
    return result

def merge(existing: dict, opensource: dict) -> list:
    """두 소스 병합. 기존 데이터 우선, 빈 필드만 오픈소스로 채움."""
    all_chars = set(existing.keys()) | set(opensource.keys())
    merged = []

    for char in all_chars:
        ex = existing.get(char)
        os_data = opensource.get(char)

        if ex:
            entry = dict(ex)
            if os_data:
                # 빈 필드만 오픈소스로 채우기
                for field in ('hun', 'meaning', 'sound', 'radical', 'grade', 'stroke_count'):
                    if not entry.get(field) and os_data.get(field):
                        entry[field] = os_data[field]
        else:
            # 오픈소스에만 있는 한자
            entry = {
                'char':        char,
                'hun':         os_data.get('hun', ''),
                'meaning':     os_data.get('meaning', ''),
                'sound':       os_data.get('sound', ''),
                'pinyin':      '',
                'radical':     os_data.get('radical', ''),
                'etymology':   '',
                'mnemonic':    '',
                'compounds':   '',
                'importance':  '',
                'domain':      '',
                'char_type':   '',
                'grade':       os_data.get('grade', ''),
                'stroke_count':os_data.get('stroke_count', ''),
            }

        # stroke_count → int 변환
        sc = entry.get('stroke_count', '')
        try:
            entry['stroke_count'] = int(sc) if sc else None
        except (ValueError, TypeError):
            entry['stroke_count'] = None

        # type 필드 추가 (기존 스키마 호환)
        entry['type'] = 'hanja'

        merged.append(entry)

    # 음 기준 정렬
    merged.sort(key=lambda e: (e.get('sound') or '', e.get('char') or ''))
    return merged

def print_stats(merged: list):
    from collections import Counter
    total = len(merged)
    grade_dist = Counter(e.get('grade') or '(없음)' for e in merged)
    domain_dist = Counter(e.get('domain') or '(없음)' for e in merged)

    empty = {f: sum(1 for e in merged if not e.get(f)) for f in
             ['hun', 'meaning', 'sound', 'radical', 'grade', 'stroke_count', 'etymology', 'mnemonic']}

    print(f'\n=== 병합 결과 ({total}자) ===')
    print('\n[급수 분포]')
    for k, v in sorted(grade_dist.items(), key=lambda x: -x[1]):
        print(f'  {k}: {v}')
    print('\n[도메인 분포]')
    for k, v in sorted(domain_dist.items(), key=lambda x: -x[1]):
        print(f'  {k}: {v}')
    print('\n[빈 값 현황]')
    for f, cnt in empty.items():
        pct = cnt / total * 100
        print(f'  {f}: {cnt}개 비어있음 ({pct:.1f}%)')

def main():
    base = Path(__file__).parent.parent
    existing_path = '/Users/kt/Downloads/한자_DB_병합.csv'
    opensource_path = '/Users/kt/Downloads/hanja_grade_opensource.csv'
    output_path = base / 'scripts' / 'data' / 'hanja_merged.json'

    print('📂 기존 CSV 로드 중...')
    existing = load_existing_csv(existing_path)
    print(f'   → {len(existing)}자 로드')

    print('📂 오픈소스 CSV 로드 중...')
    opensource = load_opensource_csv(opensource_path)
    print(f'   → {len(opensource)}자 로드')

    print('\n🔀 병합 중...')
    merged = merge(existing, opensource)

    print_stats(merged)

    print(f'\n💾 저장 중: {output_path}')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    size_mb = output_path.stat().st_size / 1024 / 1024
    print(f'✅ 완료! {len(merged)}자, {size_mb:.1f}MB')

if __name__ == '__main__':
    main()
