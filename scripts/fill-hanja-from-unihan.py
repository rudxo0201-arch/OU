#!/usr/bin/env python3
"""
Unihan 데이터로 hanja_merged.json 빈 필드 채우기
Usage: python3 scripts/fill-hanja-from-unihan.py
"""

import json
import re
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
MERGED_JSON = os.path.join(DATA_DIR, 'hanja_merged.json')

# 214 강희자전 부수 (번호 → 한자)
KANGXI_RADICALS = [
    '', '一', '丨', '丶', '丿', '乙', '亅',  # 1-6
    '二', '亠', '人', '儿', '入', '八', '冂', '冖', '冫', '几', '凵', '刀', '力', '勹', '匕', '匚', '匸', '十', '卜', '卩', '厂', '厶', '又',  # 7-30
    '口', '囗', '土', '士', '夂', '夊', '夕', '大', '女', '子', '宀', '寸', '小', '尢', '尸', '屮', '山', '巛', '工', '己', '巾', '干', '幺', '广', '廴', '廾', '弋', '弓', '彐', '彡', '彳',  # 31-61
    '心', '戈', '戶', '手', '支', '攴', '文', '斗', '斤', '方', '无', '日', '曰', '月', '木', '欠', '止', '歹', '殳', '毋', '比', '毛', '氏', '气', '水', '火', '爪', '父', '爻', '爿', '片', '牙', '牛', '犬',  # 62-94
    '玄', '玉', '瓜', '瓦', '甘', '生', '用', '田', '疋', '疒', '癶', '白', '皮', '皿', '目', '矛', '矢', '石', '示', '禸', '禾', '穴', '立',  # 95-117
    '竹', '米', '糸', '缶', '网', '羊', '羽', '老', '而', '耒', '耳', '聿', '肉', '臣', '自', '至', '臼', '舌', '舛', '舟', '艮', '色', '艸', '虍', '虫', '血', '行', '衣', '襾',  # 118-146
    '見', '角', '言', '谷', '豆', '豕', '豸', '貝', '赤', '走', '足', '身', '車', '辛', '辰', '辵', '邑', '酉', '釆', '里',  # 147-166
    '金', '長', '門', '阜', '隶', '隹', '雨', '青', '非',  # 167-175
    '面', '革', '韋', '韭', '音', '頁', '風', '飛', '食', '首', '香',  # 176-186
    '馬', '骨', '高', '髟', '鬥', '鬯', '鬲', '鬼',  # 187-194
    '魚', '鳥', '鹵', '鹿', '麥', '麻',  # 195-200
    '黃', '黍', '黑', '黹',  # 201-204
    '黽', '鼎', '鼓', '鼠',  # 205-208
    '鼻', '齊',  # 209-210
    '齒',  # 211
    '龍', '龜',  # 212-213
    '龠',  # 214
]

def get_radical_char(radical_num: int) -> str:
    if 1 <= radical_num <= len(KANGXI_RADICALS) - 1:
        return KANGXI_RADICALS[radical_num]
    return ''


def parse_unihan_readings(filepath: str):
    """kMandarin, kHangul 파싱"""
    mandarin = {}
    hangul = {}

    with open(filepath, encoding='utf-8') as f:
        for line in f:
            if line.startswith('#') or not line.strip():
                continue
            parts = line.strip().split('\t')
            if len(parts) < 3:
                continue
            codepoint, field, value = parts[0], parts[1], parts[2]
            try:
                char = chr(int(codepoint[2:], 16))
            except Exception:
                continue

            if field == 'kMandarin':
                # 첫 번째 발음만 사용 (예: "jiǎ jià" → "jiǎ")
                mandarin[char] = value.split()[0]
            elif field == 'kHangul':
                # "가:0E" 형식에서 한글만 추출, 여러 개면 첫 번째
                first = value.split()[0]
                ko = first.split(':')[0]
                hangul[char] = ko

    return mandarin, hangul


def parse_unihan_irgsources(filepath: str):
    """kRSUnicode (부수번호.나머지획수), kTotalStrokes 파싱"""
    rs_unicode = {}
    total_strokes = {}

    with open(filepath, encoding='utf-8') as f:
        for line in f:
            if line.startswith('#') or not line.strip():
                continue
            parts = line.strip().split('\t')
            if len(parts) < 3:
                continue
            codepoint, field, value = parts[0], parts[1], parts[2]
            try:
                char = chr(int(codepoint[2:], 16))
            except Exception:
                continue

            if field == 'kRSUnicode':
                # "9.9" → radical_num=9, additional=9
                # 여러 값 가능, 첫 번째 사용
                first = value.split()[0].rstrip("'")  # 일부 값에 ' 붙음
                rs_unicode[char] = first
            elif field == 'kTotalStrokes':
                # 여러 값 가능 (언어별), 첫 번째
                total_strokes[char] = int(value.split()[0])

    return rs_unicode, total_strokes


def main():
    print("Loading hanja_merged.json...")
    with open(MERGED_JSON, encoding='utf-8') as f:
        data = json.load(f)
    total = len(data)

    print(f"총 {total}자 로드됨\n")

    print("Parsing Unihan_Readings.txt...")
    mandarin, hangul = parse_unihan_readings(os.path.join(DATA_DIR, 'Unihan_Readings.txt'))
    print(f"  kMandarin: {len(mandarin)}자, kHangul: {len(hangul)}자")

    print("Parsing Unihan_IRGSources.txt...")
    rs_unicode, total_strokes = parse_unihan_irgsources(os.path.join(DATA_DIR, 'Unihan_IRGSources.txt'))
    print(f"  kRSUnicode: {len(rs_unicode)}자, kTotalStrokes: {len(total_strokes)}자\n")

    # 채우기 카운터
    filled = {'pinyin': 0, 'radical': 0, 'stroke_count': 0, 'sound': 0, 'hun': 0}

    for entry in data:
        char = entry.get('char', '')
        if not char:
            continue

        # pinyin (병음)
        if not entry.get('pinyin') and char in mandarin:
            entry['pinyin'] = mandarin[char]
            filled['pinyin'] += 1

        # sound (음) - kHangul로 채우기
        if not entry.get('sound') and char in hangul:
            entry['sound'] = hangul[char]
            filled['sound'] += 1

        # radical (부수) & stroke_count (획수)
        if not entry.get('radical') and char in rs_unicode:
            rs = rs_unicode[char]
            try:
                radical_num = int(rs.split('.')[0])
                entry['radical'] = get_radical_char(radical_num)
                filled['radical'] += 1
            except Exception:
                pass

        if not entry.get('stroke_count') and char in total_strokes:
            entry['stroke_count'] = total_strokes[char]
            filled['stroke_count'] += 1

    # 결과 저장
    with open(MERGED_JSON, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("=== 채우기 결과 ===")
    for field, count in filled.items():
        print(f"  {field}: +{count}개 채워짐")

    # 최종 통계
    print("\n=== 최종 빈값 통계 ===")
    fields = ['hun', 'sound', 'radical', 'stroke_count', 'pinyin', 'etymology', 'mnemonic', 'compounds']
    for f_name in fields:
        empty = sum(1 for e in data if not e.get(f_name))
        print(f"  {f_name:15}: 비어있음 {empty:4}개 ({empty/total*100:.1f}%)")

    print(f"\n✅ 완료! {MERGED_JSON} 업데이트됨")


if __name__ == '__main__':
    main()
