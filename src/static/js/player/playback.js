function seekRelative(delta) {
    const audioElem = getAudioElement();

    const newTime = audioElem.currentTime + delta;
    if (newTime < 0) {
        seekAbsolute(0);
    } else if (newTime > audioElem.duration) {
        seekAbsolute(audioElem.duration);
    } else {
        seekAbsolute(newTime);
    }
}

function seekAbsolute(position) {
    if (!isFinite(position)) {
        console.warn('Ignoring seek with non-finite position', position);
        return;
    }

    getAudioElement().currentTime = position;
    eventBus.publish(MusicEvent.PLAYBACK_CHANGE);
}

function getTransformedVolume(volumeZeroToHundred) {
    // https://www.dr-lex.be/info-stuff/volumecontrols.html
    // Values for 60dB dynamic range
    const a = 1e-3
    const b = 6.907 // slightly lower than value in article so result never exceeds 1.0
    const x = volumeZeroToHundred / 100;
    return a * Math.exp(x * b);
}

function onVolumeChange() {
    const slider = document.getElementById('settings-volume');
    const volume = slider.value;

    slider.classList.remove('input-volume-high', 'input-volume-medium', 'input-volume-low');
    if (volume > 60) {
        slider.classList.add('input-volume-high');
    } else if (volume > 20) {
        slider.classList.add('input-volume-medium');
    } else {
        slider.classList.add('input-volume-low');
    }

    const audioElem = getAudioElement();
    audioElem.volume = getTransformedVolume(volume);
}

/**
 * @returns {HTMLAudioElement}
 */
function getAudioElement() {
    return document.getElementById('audio');
}

async function replaceAudioSource() {
    const sourceUrl = queue.currentTrack.audioBlobUrl;
    const audio = getAudioElement();
    audio.src = sourceUrl;
    // Ensure audio volume matches slider
    onVolumeChange();
    try {
        await audio.play();
    } catch (exception) {
        console.warn(exception);
    }
}

function replaceAlbumImages() {
    const imageUrl = queue.currentTrack.imageBlobUrl;

    const cssUrl = `url("${imageUrl}")`;

    const bgBottom = document.getElementById('bg-image-1');
    const bgTop = document.getElementById('bg-image-2');
    const fgBottom = document.getElementById('album-cover-1');
    const fgTop = document.getElementById('album-cover-2');

    // Set bottom to new image
    bgBottom.style.backgroundImage = cssUrl;
    fgBottom.style.backgroundImage = cssUrl;

    // Slowly fade out old top image
    bgTop.style.opacity = 0;
    fgTop.style.opacity = 0;

    setTimeout(() => {
        // To prepare for next replacement, move bottom image to top image
        bgTop.style.backgroundImage = cssUrl;
        fgTop.style.backgroundImage = cssUrl;
        // Make it visible
        bgTop.style.opacity = 1;
        fgTop.style.opacity = 1;
    }, 200);
}

function replaceLyrics() {
    const queuedTrack = queue.currentTrack;
    const notFoundElem = document.getElementById('lyrics-not-found');
    const textElem = document.getElementById('lyrics-text');
    const sourceElem = document.getElementById('lyrics-source');
    if (queuedTrack.lyrics.found) {
        notFoundElem.classList.add('hidden');
        textElem.classList.remove('hidden');
        sourceElem.classList.remove('hidden');

        sourceElem.href = queuedTrack.lyrics.source;
        textElem.innerHTML = queuedTrack.lyrics.html + '<br>';
    } else {
        notFoundElem.classList.remove('hidden');
        textElem.classList.add('hidden');
        sourceElem.classList.add('hidden');
    }
    document.getElementById('lyrics-scroll').scrollTo({top: 0, behavior: 'smooth'});
}

function trackInfoUnavailableSpan() {
    const span = document.createElement('span');
    span.style.color = COLOR_MISSING_METADATA;
    span.textContent = '[track info unavailable]';
    return span;
}

function replaceTrackDisplayTitle() {
    if (queue.currentTrack !== null) {
        const track = queue.currentTrack.track();
        if (track !== null) {
            document.getElementById('current-track').replaceChildren(track.displayHtml(true));
            document.title = track.displayText(true);
        } else {
            document.getElementById('current-track').replaceChildren(trackInfoUnavailableSpan());
            document.title = '[track info unavailable]';
        }
    } else {
        // Nothing playing
        document.getElementById('current-track').textContent = '-';
    }

    const previous = queue.getPreviousTrack();
    if (previous !== null) {
        const previousTrack = previous.track();
        if (previousTrack !== null) {
            document.getElementById('previous-track').replaceChildren(previousTrack.displayHtml(true));
        } else {
            document.getElementById('previous-track').replaceChildren(trackInfoUnavailableSpan());
        }
    } else {
        document.getElementById('previous-track').textContent = '-';
    }
}

function replaceAllTrackHtml() {
    replaceAudioSource();
    replaceAlbumImages();
    replaceLyrics();
    replaceTrackDisplayTitle();
}

eventBus.subscribe(MusicEvent.TRACK_CHANGE, replaceAllTrackHtml);

// Update track title, metadata may have changed
eventBus.subscribe(MusicEvent.TRACK_LIST_CHANGE, replaceTrackDisplayTitle);

function toggleLyrics() {
    if (document.getElementById('sidebar-lyrics').classList.contains('hidden')) {
        switchLyrics();
    } else {
        switchAlbumCover();
    }
}

/**
 * Display lyrics, hide album art
 */
function switchLyrics() {
    // document.getElementById('button-album').classList.remove('hidden');
    // document.getElementById('button-lyrics').classList.add('hidden');
    document.getElementById('sidebar-lyrics').classList.remove('hidden');
    document.getElementById('sidebar-album-covers').classList.add('hidden');
}

/**
 * Display album art, hide lyrics
 */
function switchAlbumCover() {
    // document.getElementById('button-album').classList.add('hidden');
    // document.getElementById('button-lyrics').classList.remove('hidden');
    document.getElementById('sidebar-lyrics').classList.add('hidden');
    document.getElementById('sidebar-album-covers').classList.remove('hidden');
}
