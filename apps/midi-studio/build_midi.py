"""Generate Standard MIDI Format 1 from a JSON score; Python standard library only.
Times use quarter-note beats; channels and GM programs use zero-based numbers.
"""
import argparse
import base64
import json
import math
import struct
from pathlib import Path


def integer(value, low, high, name):
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise ValueError(f'{name} must be an integer from {low} to {high}')
    return value


def number(value, low, name, exclusive=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f'{name} must be finite')
    if value < low or (exclusive and value == low):
        raise ValueError(f'{name} must be {">" if exclusive else ">="} {low}')
    return value


def vlq(value):
    integer(value, 0, 0x0fffffff, 'MIDI delta')
    result = [value & 127]
    value >>= 7
    while value:
        result.insert(0, (value & 127) | 128)
        value >>= 7
    return bytes(result)


def meta(kind, data):
    return bytes([255, kind]) + vlq(len(data)) + data


def track(events, end):
    out = bytearray()
    previous = 0
    for tick, priority, data in sorted(events, key=lambda item: (item[0], item[1])):
        out.extend(vlq(tick - previous))
        out.extend(data)
        previous = tick
    out.extend(vlq(end - previous))
    out.extend(b'\xff\x2f\x00')
    return b'MTrk' + struct.pack('>I', len(out)) + out


def build_midi(score):
    ppq = integer(score.get('ppq', 480), 1, 32767, 'ppq')
    bpm = number(score.get('bpm', 120), 0, 'bpm', exclusive=True)
    tempo = round(60000000 / bpm)
    integer(tempo, 1, 0xffffff, 'tempo in microseconds')
    signature = score.get('time_signature', [4, 4])
    numerator = integer(signature[0], 1, 255, 'time signature numerator')
    denominator = integer(signature[1], 1, 128, 'time signature denominator')
    if denominator & (denominator - 1):
        raise ValueError('Time signature denominator must be a power of two')
    source_tracks = score['tracks']
    if not source_tracks:
        raise ValueError('Provide at least one track')
    prepared, last_tick = [], 0
    used_channels = set()
    for index, source in enumerate(source_tracks):
        channel = integer(source.get('channel', index), 0, 15, 'channel')
        if channel in used_channels:
            raise ValueError('Use a separate MIDI channel for each track')
        used_channels.add(channel)
        events = [(0, 0, meta(3, source.get('name', f'Track {index + 1}').encode('utf8')))]
        if 'program' in source:
            program = integer(source['program'], 0, 127, 'program')
            events.append((0, 0, bytes([0xc0 | channel, program])))
        intervals = {}
        for note in source.get('notes', []):
            pitch = integer(note['pitch'], 0, 127, 'pitch')
            velocity = integer(note.get('velocity', 80), 1, 127, 'velocity')
            start = round(number(note['start'], 0, 'start') * ppq)
            duration = max(1, round(number(note['duration'], 0, 'duration', exclusive=True) * ppq))
            end = start + duration
            for a, b in intervals.get(pitch, []):
                if start < b and end > a:
                    raise ValueError(f'Overlapping pitch {pitch} in track {index + 1}')
            intervals.setdefault(pitch, []).append((start, end))
            events.extend([(start, 2, bytes([0x90 | channel, pitch, velocity])),
                           (end, 1, bytes([0x80 | channel, pitch, 0]))])
            last_tick = max(last_tick, end)
        prepared.append(events)
    requested = round(number(score.get('length_beats', last_tick / ppq), 0, 'length_beats') * ppq)
    if requested < last_tick:
        raise ValueError('length_beats cannot cut off a note')
    end = max(1, requested)
    conductor = [(0, 0, meta(81, tempo.to_bytes(3, 'big'))),
                 (0, 0, meta(88, bytes([numerator, int(math.log2(denominator)), 24, 8])))]
    tracks = [track(conductor, end)] + [track(events, end) for events in prepared]
    return b'MThd' + struct.pack('>IHHH', 6, 1, len(tracks), ppq) + b''.join(tracks)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('score', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--js', type=Path, help='Also write browser data as globalThis.MIDI_DATA')
    args = parser.parse_args()
    try:
        blob = build_midi(json.loads(args.score.read_text(encoding='utf8')))
    except (ValueError, KeyError, TypeError, IndexError) as error:
        parser.error(str(error))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(blob)
    if args.js:
        args.js.parent.mkdir(parents=True, exist_ok=True)
        args.js.write_text('globalThis.MIDI_DATA = ' + json.dumps(base64.b64encode(blob).decode()) + ';\n', encoding='utf8')
    print(f'MIDI saved: {args.output} ({len(blob)} bytes)')


if __name__ == '__main__':
    main()
