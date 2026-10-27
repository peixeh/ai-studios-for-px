# Video Studio — migração planejada

O exportador original produz quadros PNG e uma mistura WAV em Python/Pillow/NumPy;
um codificador Swift/AVFoundation monta o MP4 com H.264 e AAC no macOS.

Antes de extrair a aplicação: substituir sprites, roteiro, layout e efeitos específicos por entradas configuráveis; validar o encaixe de texto; manter áudio e eventos sincronizados. A implementação genérica ainda não foi migrada para esta pasta.
