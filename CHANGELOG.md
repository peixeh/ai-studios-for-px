# Histórico de versões

## 0.1.0 — 2026-10-26

Primeira versão pública do **AI Studios for Px**. O módulo disponível é o MIDI Studio; vídeo, low poly e skills ainda estão em planejamento de migração.

### Disponível

- Geração de MIDI padrão formato 1 a partir de uma partitura já transcrita em JSON.
- BPM, compasso, duração do loop, canais, programas MIDI, alturas e intensidades configuráveis.
- Notas em batidas de semínima, com validação de duração, canal e sobreposição.
- Exportação opcional dos dados MIDI em JavaScript/base64 para páginas locais.
- Player Web Audio com agudo, baixo e bateria sintéticos, volume, loop e parada.
- Exemplo genérico de duas barras em 4/4, com três trilhas.
- Testes de validação e de compatibilidade entre o gerador Python e o parser do player.
- Licença MIT e documentação de contribuição.

### Limitações conhecidas

- Não lê partituras em imagens ou PDF automaticamente. As notas devem ser transcritas antes.
- Não converte gravações em MIDI, não separa instrumentos e não gera vocais.
- Player aceita MIDI formato 0/1 com divisão PPQ; não suporta formato 2 ou SMPTE.
- Player usa timbres retrô; não reproduz fielmente os programas General MIDI.
- Gerador aceita um andamento e um compasso por arquivo; mudanças internas não estão disponíveis na entrada JSON.
- Um canal por trilha; alturas iguais sobrepostas na mesma trilha são rejeitadas.
- Testes automatizados executados com Python e Node no macOS. Reprodução de áudio ainda requer conferência no navegador do usuário.

### Ainda não incluído

- Exportador de MP4 genérico.
- Editor ou gerador genérico de modelos 3D low poly.
- Skills instaláveis.
- Imagens, músicas e vídeos do projeto de origem.

### Compatibilidade

- Gerador: Python 3.9+ e biblioteca padrão, sem instalação de dependências.
- Player: navegador moderno com Web Audio; é necessário clicar para iniciar áudio.
- Testes: Python 3.9+ e Node.js 16+.

### Política de versões

Usamos `MAJOR.MINOR.PATCH`. Durante `0.x`, a interface ainda é experimental; alterações de formato serão indicadas neste histórico. Novas funcionalidades incrementam `MINOR`; correções compatíveis incrementam `PATCH`. A primeira API estável será `1.0.0`.
