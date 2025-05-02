function transformarLinkParaChat(url) {
  try {
    const u = new URL(url);

    if (u.hostname.includes('twitch.tv')) {
      const canal = u.pathname.split('/').filter(Boolean)[0];
      return `https://www.twitch.tv/popout/${canal}/chat?popout=`;
    }

    if (u.hostname.includes('youtube.com')) {
      const videoId = u.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/live_chat?v=${videoId}&dark_theme=1`;
      }
    }

    if (u.hostname.includes('loco.com')) {
      return url;
    }

    if (u.hostname.includes('kick.com')) {
      const canal = u.pathname.split('/').filter(Boolean)[0];
      return `https://kick.com/${canal}/chatroom`;
    }

    return url;
  } catch (e) {
    return url;
  }
}

document.querySelector('#qtd').addEventListener('change', (e) => {
  const qtd = parseInt(e.target.value);
  const container = document.querySelector('#inputs');
  container.innerHTML = '';

  const icones = {
    twitch: 'iccones/twitch.png',
    youtube: 'iccones/youtube.png',
    loco: 'iccones/loco.png',
    kick: 'iccones/kick.png',
  };

  function detectarPlataforma(link) {
    link = link.toLowerCase();
    if (link.includes('twitch.tv')) return 'twitch';
    if (link.includes('youtube.com') || link.includes('youtu.be')) return 'youtube';
    if (link.includes('kick.com')) return 'kick';
    if (link.includes('loco')) return 'loco';
    return null;
  }

  if (qtd > 0 && qtd <= 6) {
    for (let i = 0; i < qtd; i++) {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.marginBottom = '8px';

      const icon = document.createElement('img');
      icon.style.width = '24px';
      icon.style.marginRight = '8px';
      icon.style.visibility = 'hidden';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Cole o link da live';
      input.style.flex = '1';

      input.addEventListener('input', () => {
        const plataforma = detectarPlataforma(input.value);
        if (plataforma) {
          icon.src = icones[plataforma];
          icon.style.visibility = 'visible';
          input.placeholder = `Link da live (${plataforma})`;
        } else {
          icon.style.visibility = 'hidden';
          input.placeholder = 'Cole o link da live';
        }
      });

      wrapper.appendChild(icon);
      wrapper.appendChild(input);
      container.appendChild(wrapper);
    }

    const btn = document.createElement('button');
    btn.textContent = 'Iniciar';
    btn.onclick = () => {
      const links = Array.from(container.querySelectorAll('input'))
        .map(input => transformarLinkParaChat(input.value.trim()))
        .filter(link => link.length > 0);

      if (links.length > 0) {
        window.electronAPI.startChats(links);
      } else {
        alert('Preencha ao menos um link.');
      }
    };
    container.appendChild(btn);
  }
});
