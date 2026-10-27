# AI Studios for Px

**Versão 0.1.0 · Experimental · Licença MIT**

Ferramentas criativas reutilizáveis para MIDI, vídeo e modelos low poly.
Cada aplicação deve funcionar sem depender dos personagens ou do tema de um projeto.

| Aplicação | Estado |
| --- | --- |
| [MIDI Studio](apps/midi-studio/) | Gerador JSON → MIDI e player retrô extraídos; exemplo genérico incluído |
| [Video Studio](apps/video-studio/) | Migração planejada; o exportador atual ainda depende da cena original e do macOS |
| [Low Poly Studio](apps/low-poly-studio/) | Migração planejada; modelos e visualizador ainda estão nos estudos originais |
| [Skills](skills/) | Serão criadas após validar os fluxos genéricos |

## Primeiro teste

Requer Python 3.9 ou posterior. O gerador não precisa de pacotes externos.

```sh
python3 apps/midi-studio/build_midi.py examples/midi/simple-loop.json build/simple-loop.mid
```

Abra `apps/midi-studio/index.html` no navegador e selecione o arquivo gerado.
A reprodução começa ao clicar em **Tocar em loop**. A página funciona como arquivo local.

Para validar geração e compatibilidade com o player, requer também Node.js 16 ou posterior:

```sh
python3 -m unittest discover -s tests -v
```

## Organização

- `apps/`: código de cada ferramenta e suas instruções de uso.
- `examples/`: entradas pequenas, genéricas e independentes de um tema.
- `skills/`: futura documentação de execução para agentes.
- `build/` e `exports/`: saídas locais ignoradas pelo Git.

## Migração

1. MIDI: tornar notas, BPM, instrumentos e duração configuráveis — implementação inicial disponível.
2. Low poly: separar malha, visualizador e animação dos modelos específicos.
3. Vídeo: receber a cena e o áudio como entradas; documentar dependências por sistema operacional.
4. Skills: descrever entradas, comandos e critérios de conferência dos fluxos já estáveis.

Os arquivos do projeto original foram preservados. Músicas, imagens de referência e vídeos do debate não foram copiados para este repositório.

## Licença

Licença [MIT](LICENSE): você pode usar, modificar e distribuir o código, inclusive comercialmente, mantendo o aviso de copyright e a licença. O software é fornecido sem garantia.

A licença cobre o código deste repositório; não concede direitos sobre músicas, fotografias, marcas ou outros conteúdos de terceiros usados em projetos futuros.

## Versões e contribuição

Confira o que cada versão permite fazer e suas limitações no [histórico de versões](CHANGELOG.md). A versão atual também está no arquivo `VERSION`. Para colaborar, leia [CONTRIBUTING.md](CONTRIBUTING.md).
