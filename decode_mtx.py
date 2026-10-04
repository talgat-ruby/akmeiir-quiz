#!/usr/bin/env python3
"""Decode a MyTestXPro (.mtx, v11) test file into JSON.

File layout (reverse-engineered):
  "MyTestX\\0\\0\\0\\0" + 13 bytes header, then from offset 24 a feedback XOR cipher:
      key_i = (plain_{i-1} * 0xD0 + 0xAD) & 0xFF ;  plain_i = cipher_i ^ key_i
  Decrypted: u32-length UTF-16 version ("11.0.0.66"), then a zlib stream.
  Inflated body: Delphi-style strings (u32 char count + UTF-16LE) with binary fields between.
  Question/answer texts are TRichView RVF documents whose text items are hex-encoded UTF-16LE.
  Per question: question RVF, 45-byte gap, N answer RVFs back-to-back, then a 70-byte trailer
  whose int32 array at offset 20 holds 1 for each correct answer (-1 otherwise).

Usage: python3 decode_mtx.py ofd_quizz.mtx [out.json]
"""
import json
import re
import struct
import sys
import zlib

BODY_OFFSET = 24
TRAILER_FLAGS_OFFSET = 20
MAX_ANSWERS = 10


def decrypt(data):
    out = bytearray()
    prev = 0
    for c in data:
        p = c ^ ((prev * 0xD0 + 0xAD) & 0xFF)
        out.append(p)
        prev = p
    return bytes(out)


def inflate(raw):
    plain = decrypt(raw[BODY_OFFSET:])
    start = plain.index(b'\x78\x01')
    version = re.search(rb'(?:[\d.]\x00)+', plain[:start]).group().decode('utf-16le')
    return version, zlib.decompress(plain[start:])


def scan_strings(body):
    """Find u32-length-prefixed UTF-16LE strings; returns (start, end, text)."""
    found, i = [], 0
    while i < len(body) - 4:
        n = struct.unpack_from('<I', body, i)[0]
        end = i + 4 + 2 * n
        if 2 <= n < 200000 and end <= len(body):
            try:
                s = body[i + 4:end].decode('utf-16le')
                if all(c.isprintable() or c in '\r\n\t' for c in s):
                    found.append((i, end, s))
                    i = end
                    continue
            except UnicodeDecodeError:
                pass
        i += 1
    return found


def rvf_text(rvf):
    """Extract plain text from a TRichView RVF document."""
    lines = rvf.split('\r\n')
    parts, i = [], 0
    while i < len(lines):
        m = re.fullmatch(r'(-?\d+) (\d+) (-?\d+) (\d+) (\d+) (-?\d+)', lines[i])
        if not m:
            i += 1
            continue
        style, count, _para, opts, _save, _tag = map(int, m.groups())
        data = lines[i + 1:i + 1 + count]
        i += 1 + count
        if style < 0:
            parts.append('[image]' if style in (-3, -4) else '')
            continue
        for ln in data:
            text = bytes.fromhex(ln).decode('utf-16le') if opts & 8 else ln
            if parts and not opts & 1:  # rvioSameAsPrev not set -> new paragraph
                parts.append('\n')
            elif opts & 4:  # rvioBR
                parts.append('\n')
            parts.append(text)
    return ''.join(parts)


def clean(text):
    return text.replace('\xa0', ' ').strip().lstrip('#').strip()


def parse(body):
    strings = scan_strings(body)
    questions, prev_end = [], 0
    for idx, (start, end, s) in enumerate(strings):
        gap = start - prev_end
        prev_end = end
        if not s.startswith('-8'):
            continue
        text = clean(rvf_text(s))
        if gap == 45:
            questions[-1]['answers'].append({'text': text})
        elif gap == 0 and questions and questions[-1]['answers']:
            questions[-1]['answers'].append({'text': text})
        else:
            questions.append({'text': text, 'answers': [], '_trailer': None})
        is_last_answer = gap in (0, 45) and (idx + 1 == len(strings) or strings[idx + 1][0] != end)
        if is_last_answer:
            questions[-1]['_trailer'] = end

    for q in questions:
        flags = struct.unpack_from(f'<{MAX_ANSWERS}i', body, q.pop('_trailer') + TRAILER_FLAGS_OFFSET)
        for n, a in enumerate(q['answers']):
            a['correct'] = flags[n] == 1
    return questions


def main():
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else re.sub(r'\.mtx$', '', src) + '.json'
    version, body = inflate(open(src, 'rb').read())
    strings = scan_strings(body)
    questions = parse(body)
    test = {
        'source': src,
        'version': version,
        'title': strings[1][2] if len(strings) > 1 else '',
        'count': len(questions),
        'questions': questions,
    }
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(test, f, ensure_ascii=False, indent=2)
    print(f'{len(questions)} questions -> {dst}')


if __name__ == '__main__':
    main()
