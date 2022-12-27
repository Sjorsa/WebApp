function syncCookieWithInput(elemId) {
    const elem = document.getElementById(elemId);
    const isCheckbox = elem.matches('input[type="checkbox"]');

    if (elem.dataset.restore === 'false') {
        return;
    }

    // If cookie exists, set input value to cookie value
    const value = getCookie(elemId);
    if (value !== null) {
        if (isCheckbox) {
            elem.checked = value === '1';
        } else {
            elem.value = value;
        }
    }

    // If input value is updated, set cookie accordingly
    elem.addEventListener('input', event => {
        if (isCheckbox) {
            setCookie(elemId, event.target.checked ? '1' : '0');
        } else {
            setCookie(elemId, event.target.value);
        }
    });
}

function syncCookiesWithInputs() {
    [
        'settings-queue-size',
        'settings-audio-quality',
        'settings-volume',
        'settings-queue-removal-behaviour',
        'settings-theme',
        'settings-meme-mode',
        'settings-language',
    ].forEach(syncCookieWithInput);
}

function youTubeDownload(event) {
    event.preventDefault();

    const output = document.getElementById('youtube-dl-output');
    output.style.backgroundColor = '';
    output.textContent = 'downloading...';

    const spinner = document.getElementById('youtube-dl-spinner');
    spinner.classList.remove('hidden');

    const directory = document.getElementById('youtube-dl-directory').value;
    const url = document.getElementById('youtube-dl-url').value;

    (async function(){
        const response = await jsonPost('/ytdl', {directory: directory, url: url});
        const json = await response.json();
        output.textContent = 'Status code: ' + json.code + '\n--- stdout ---\n' + json.stdout + '\n--- stderr ---\n' + json.stderr;
        if (json.code == 0) {
            output.append('\n--- javascript ---\n')
            output.append('Scanning playlist...\n');
            await Track.scanPlaylist(directory);
            output.append('Done, updating local track list...\n');
            await Track.updateLocalTrackList();
            output.append('Done!');
            output.style.backgroundColor = 'darkgreen';
        } else {
            output.style.backgroundColor = 'darkred';
        }
    })().then(() => {
        spinner.classList.add('hidden');
    }).catch(err => {
        console.error(err);
        spinner.classList.add('hidden');
        alert('error, check console');
    });
}

function applyTheme() {
    const select = document.getElementById('settings-theme');
    if (select.value === 'dark' || select.value === 'browser' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.getElementsByTagName('body')[0].classList.remove('light');
    } else if (select.value === 'light' || select.value === 'browser') {
        document.getElementsByTagName('body')[0].classList.add('light');
    } else {
        console.warn('unexpected theme setting: ' + select.value)
    }
}