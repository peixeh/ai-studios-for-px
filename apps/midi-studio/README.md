# MIDI Studio

## Criar MIDI

```sh
python3 apps/midi-studio/build_midi.py examples/midi/simple-loop.json build/example.mid
```

O JSON contém `bpm`, `time_signature`, `length_beats` opcional e uma lista `tracks`.
Cada trilha contém `name`, `channel`, `program` opcional e `notes`.
Cada nota contém `start`, `duration`, `pitch` e `velocity` opcional (padrão: 80).

- Tempos usam batidas de semínima: em 120 BPM, uma batida dura 0,5 s.
- `channel` vai de 0 a 15; o canal 9 representa bateria General MIDI.
- `program` e `pitch` usam valores MIDI de 0 a 127.
- `velocity` vai de 1 a 127.
- Use um canal diferente por trilha; alturas iguais sobrepostas na mesma trilha são rejeitadas.
- `length_beats` pode acrescentar silêncio ao final, mas não cortar notas.
- O arquivo gerado é MIDI padrão formato 1, com trilha de tempo e trilhas de notas.

Para embutir os dados numa página local, acrescente `--js build/midi-data.js`.
Esse arquivo define `globalThis.MIDI_DATA` com o MIDI em base64.

## Ouvir

Abra `index.html`, selecione um `.mid` e clique em **Tocar em loop**.
O sintetizador Web Audio usa onda quadrada no canal 0, triangular nos demais canais melódicos e sons sintéticos na bateria. Não é um banco de instrumentos General MIDI.

O parser aceita MIDI de formato 0 ou 1 com tempo PPQ, mudanças de andamento e pedal de sustentação. Não aceita formato 2 nem divisão SMPTE.

## Limites

O gerador recebe notas já transcritas: não reconhece partituras em imagens nem extrai instrumentos de gravações. O exemplo é um pequeno exercício genérico de agudo, baixo e bateria.
