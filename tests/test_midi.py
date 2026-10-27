import copy
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build_midi', ROOT / 'apps/midi-studio/build_midi.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class MidiTests(unittest.TestCase):
    def setUp(self):
        self.score = json.loads((ROOT / 'examples/midi/simple-loop.json').read_text())

    def test_roundtrip_with_browser_parser(self):
        self.assertIsNotNone(shutil.which('node'), 'Install Node.js to run the interoperability check')
        with tempfile.TemporaryDirectory() as folder:
            midi = Path(folder) / 'test.mid'
            midi.write_bytes(builder.build_midi(self.score))
            code = """
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={Uint8Array,DataView};vm.createContext(context);
vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),context);
const bytes=fs.readFileSync(process.argv[2]);context.buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const song=vm.runInContext('parseMidi(buffer)',context);
assert.equal(song.notes.length,18);assert(Math.abs(song.duration-4)<1e-6);
assert.equal(song.notes.filter(n=>n.channel===9).length,8);
assert(song.notes.every(n=>n.duration>0&&n.velocity>0));
const bass=song.notes.find(n=>n.channel===1&&n.note===36);
assert.equal(bass.start,0);assert.equal(bass.duration,1);
"""
            subprocess.run(['node', '-e', code, str(ROOT / 'apps/midi-studio/midi-backing.js'), str(midi)], check=True)

    def test_rejects_invalid_score_before_output(self):
        mutations = [
            lambda s: s.update(bpm=0),
            lambda s: s.update(length_beats=1),
            lambda s: s['tracks'][0]['notes'][0].update(pitch=128),
            lambda s: s['tracks'][0]['notes'][0].update(duration=-1),
            lambda s: s['tracks'][0]['notes'].append(copy.deepcopy(s['tracks'][0]['notes'][0])),
            lambda s: s['tracks'][1].update(channel=0),
        ]
        for mutate in mutations:
            with self.subTest(mutation=mutate):
                score = copy.deepcopy(self.score)
                mutate(score)
                with self.assertRaises(ValueError):
                    builder.build_midi(score)

    def test_tick_rounding_does_not_create_zero_length_note(self):
        self.score['tracks'][0]['notes'][0]['duration'] = 0.00001
        self.assertTrue(builder.build_midi(self.score).startswith(b'MThd'))


if __name__ == '__main__':
    unittest.main()
