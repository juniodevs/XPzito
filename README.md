# XPzito 🤖

> **⚠️ STATUS: EM CONSTRUÇÃO (Mas já utilizável!)**

## Sobre o Projeto

O **XPzito** é um bot e cronômetro interativo desenvolvido com inspiração no **fdstron** do *jogandofds*. Ele foi criado para ser utilizado em **longplays**, marcando o final dos episódios de uma maneira divertida e automatizada.

### Como funciona?
Quando o cronômetro chega ao fim (ou é acionado manualmente), o bot:
1. **Aparece na tela** com uma animação de entrada.
2. **Toca um áudio aleatório** de uma lista pré-definida.
3. **Movimenta a boca** enquanto o áudio toca (simulação de fala).
4. **Sai da tela** com uma animação de saída.

### Funcionalidade Multiplayer (Viewer)
Uma das principais funcionalidades é a capacidade de sincronização com os espectadores (viewers).
- O streamer pode enviar um **link único** para todos os espectadores.
- Quando o bot é acionado no painel de controle, ele aparece e toca o áudio **simultaneamente** para todos que estiverem com o link aberto.
- Isso permite que todos tenham a mesma experiência ao vivo, ouvindo o mesmo áudio e vendo a animação ao mesmo tempo.

---

## 🚀 Como Usar

### Pré-requisitos
- **Node.js** instalado no computador.

### Instalação
1. Clone ou baixe este repositório.
2. Execute o arquivo `install.bat` na raiz do projeto.
   - Isso irá instalar todas as dependências necessárias e preparar o projeto.

### Iniciando o Bot
1. Execute o arquivo `run-api.bat`.
2. O servidor será iniciado e uma janela do navegador deve abrir (ou você pode acessar manualmente).

### Acessando as Páginas
- **Painel de Configuração:** `http://localhost:4000/config`
  - Aqui você controla o cronômetro, testa o bot e gerencia as configurações.
- **Link do Viewer:** `http://localhost:4000/viewer`
  - Este é o link que deve ser usado no OBS (como fonte de navegador) ou enviado para os amigos/viewers.

---

## 📁 Personalização (Áudios e Imagens)

Para que o bot funcione com a sua cara, você precisa adicionar os arquivos de mídia nas pastas corretas dentro de `api/public/media`.

### Estrutura de Pastas

```
api/
  public/
    media/
      audio/
        random/       <-- Coloque aqui os áudios aleatórios (mp3, wav)
        transition/   <-- Coloque aqui os sons de transição (transition-in.mp3/transition-out.mp3)
      bot/            <-- Coloque aqui as imagens do bot (bot-open.png, bot-closed.png)
```

### Detalhes dos Arquivos

1.  **Áudios Aleatórios (`api/public/media/audio/random/`)**
    -   Adicione quantos arquivos de áudio quiser. O bot escolherá um aleatoriamente a cada vez que for acionado.

2.  **Sons de Transição (`api/public/media/audio/transition/`)**
    -   Recomendado ter arquivos para entrada e saída (ex: `transition-in.mp3` e `transition-out.mp3`). O sistema tentará usar esses sons durante as animações de entrada e saída do bot.

3.  **Imagens do Bot (`api/public/media/bot/`)**
    -   Para a animação da boca funcionar, você precisa de duas imagens:
        -   Uma com a boca **aberta** (o nome do arquivo deve conter "open", ex: `bot-open.png`).
        -   Uma com a boca **fechada** (o nome do arquivo deve conter "closed", ex: `bot-closed.png`).

---

## 🛠️ Tecnologias Utilizadas

-   **Frontend:** React, Vite, GSAP (animações), Howler.js (áudio).
-   **Backend:** Node.js, Express, Socket.io (para comunicação em tempo real).
-   **Linguagem:** TypeScript.

---

## 📺 Créditos e Canais

- **Jogandofoddaci (Inspiração Original):** [https://www.youtube.com/@jogandofoddaci](https://www.youtube.com/@jogandofoddaci)
- **DoubleXXP (Canal de Longplays do Criador):** [https://www.youtube.com/@DoubleXXP](https://www.youtube.com/@DoubleXXP)

---

*Divirta-se nas suas longplays!*
