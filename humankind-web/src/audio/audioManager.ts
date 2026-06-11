export const AUDIO_CUE_IDS = [
    'spin_loop',
    'button_hover',
    'button_click',
    'denied',
    'relic_buy',
    'open_reward',
    'cow_butcher',
    'symbol_interact',
    'attack_melee',
    'attack_ranged',
    'enemy_invade',
    'symbol_choice_chose',
    'symbol_choice_reroll',
    'resource_food',
    'resource_gold',
    'resource_knowledge',
    'knowledge_upgraded_1',
    'knowledge_upgraded_2',
    'level_up',
    'xp_fill',
    'selection_open',
    'main_theme',
    'board_ambient',
    'gameover_music',
    'victory_music',
    'ancient_01',
    'ancient_02',
    'ancient_03',
    'ancient_04',
    'ancient_05',
    'ancient_06',
    'ancient_07',
    'medieval_01',
    'medieval_02',
    'medieval_03',
    'medieval_04',
    'medieval_05',
    'medieval_06',
    'modern_01',
    'modern_02',
    'modern_03',
    'modern_04',
    'modern_05',
] as const;

export type AudioCueId = (typeof AUDIO_CUE_IDS)[number];

export interface AudioCueDefinition {
    src: string;
    volume?: number;
    loop?: boolean;
    preload?: boolean;
}

export interface AudioPlayOptions {
    volume?: number;
    loop?: boolean;
    playbackRate?: number;
}

export interface AudioMusicOptions {
    volume?: number;
    fadeInMs?: number;
}

export interface AudioStopMusicOptions {
    fadeOutMs?: number;
}

export interface AudioLoopOptions {
    volume?: number;
    fadeInMs?: number;
}

export interface AudioStopLoopOptions {
    fadeOutMs?: number;
}

export interface AudioPlaylistOptions extends AudioMusicOptions {
    minGapMs?: number;
    maxGapMs?: number;
}

export interface AudioStopPlaylistOptions {
    fadeOutMs?: number;
}

export interface AudioPlaybackHandle {
    stop: (options?: { fadeOutMs?: number }) => void;
    setPlaybackRate?: (playbackRate: number) => void;
}

export interface AudioManagerSnapshot {
    isMuted: boolean;
    isUnlocked: boolean;
    masterVolume: number;
    registeredCueCount: number;
}

type AudioContextConstructor = new () => AudioContext;
type WebAudioWindow = Window &
    typeof globalThis & {
        webkitAudioContext?: AudioContextConstructor;
    };

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const clampGain = (value: number) => Math.min(8, Math.max(0, Number.isFinite(value) ? value : 0));
const DEFAULT_LOOP_FADE_IN_MS = 650;
const MIN_LOOP_FADE_IN_MS = 250;
const MAIN_THEME_MIN_FADE_IN_MS = 3000;
const MUSIC_OUTPUT_GAIN = 0.5;
const DEFAULT_PLAYLIST_GAP_MIN_MS = 2000;
const DEFAULT_PLAYLIST_GAP_MAX_MS = 3000;

const resolveStartFadeInMs = (fadeInMs?: number) => {
    const requestedFadeInMs =
        typeof fadeInMs === 'number' && Number.isFinite(fadeInMs) ? fadeInMs : DEFAULT_LOOP_FADE_IN_MS;
    return Math.max(MIN_LOOP_FADE_IN_MS, requestedFadeInMs);
};

const resolveMusicStartFadeInMs = (id: AudioCueId | string, fadeInMs?: number) => {
    const resolvedFadeInMs = resolveStartFadeInMs(fadeInMs);
    return id === 'main_theme' ? Math.max(MAIN_THEME_MIN_FADE_IN_MS, resolvedFadeInMs) : resolvedFadeInMs;
};

export class AudioManager {
    private audioContext: AudioContext | null = null;
    private cueDefinitions = new Map<string, AudioCueDefinition>();
    private decodedBuffers = new Map<string, AudioBuffer>();
    private loadingBuffers = new Map<string, Promise<AudioBuffer>>();
    private masterVolume = 1;
    private musicVolume = 1;
    private effectVolume = 1;
    private ambientVolume = 1;
    private muted = false;
    private unlocked = false;
    private activeMusic: {
        id: string;
        source: AudioBufferSourceNode;
        gain: GainNode;
        cueVolume: number;
        playVolume: number;
    } | null = null;
    private musicNodes = new Set<{
        source: AudioBufferSourceNode;
        gain: GainNode;
    }>();
    private desiredMusic: {
        id: string;
        options: AudioMusicOptions;
    } | null = null;
    private musicRunId = 0;
    private activeEffectLoops = new Map<string, {
        source: AudioBufferSourceNode;
        gain: GainNode;
        cueVolume: number;
        playVolume: number;
    }>();
    private desiredEffectLoops = new Map<string, AudioLoopOptions>();
    private effectLoopRunIds = new Map<string, number>();
    private activeMusicPlaylist: {
        id: string;
        cueIds: string[];
        source: AudioBufferSourceNode | null;
        gain: GainNode | null;
        cueVolume: number;
        playVolume: number;
        lastCueId: string | null;
        options: AudioPlaylistOptions;
        gapTimeoutId: number | null;
    } | null = null;
    private desiredMusicPlaylist: {
        id: string;
        cueIds: string[];
        options: AudioPlaylistOptions;
    } | null = null;
    private musicPlaylistRunId = 0;

    public registerCue(id: AudioCueId | string, definition: AudioCueDefinition) {
        this.cueDefinitions.set(id, definition);
        this.decodedBuffers.delete(id);
        this.loadingBuffers.delete(id);

        if (definition.preload) {
            void this.preloadCue(id);
        }
    }

    public registerCues(cues: Partial<Record<AudioCueId, AudioCueDefinition>> & Record<string, AudioCueDefinition>) {
        for (const [id, definition] of Object.entries(cues)) {
            this.registerCue(id, definition);
        }
    }

    public async preloadCue(id: AudioCueId | string) {
        const definition = this.cueDefinitions.get(id);
        if (!definition) return null;
        return this.loadBuffer(id, definition);
    }

    public async preloadAll() {
        await Promise.all([...this.cueDefinitions.keys()].map((id) => this.preloadCue(id)));
    }

    public async getCueDurationMs(id: AudioCueId | string) {
        const definition = this.cueDefinitions.get(id);
        if (!definition) return null;
        const buffer = await this.loadBuffer(id, definition);
        return buffer.duration * 1000;
    }

    public async unlock() {
        const context = this.getAudioContext();
        if (!context) return false;

        if (context.state === 'suspended') {
            try {
                await context.resume();
            } catch {
                return false;
            }
        }

        if (!this.unlocked) {
            const silentBuffer = context.createBuffer(1, 1, context.sampleRate);
            const source = context.createBufferSource();
            source.buffer = silentBuffer;
            source.connect(context.destination);
            source.start(0);
            this.unlocked = true;
        }

        if (this.desiredMusic && !this.activeMusic) {
            void this.playMusic(this.desiredMusic.id, this.desiredMusic.options);
        }

        if (this.desiredMusicPlaylist && !this.activeMusicPlaylist) {
            void this.playMusicPlaylist(
                this.desiredMusicPlaylist.id,
                this.desiredMusicPlaylist.cueIds,
                this.desiredMusicPlaylist.options,
            );
        }

        for (const [id, options] of this.desiredEffectLoops) {
            if (!this.activeEffectLoops.has(id)) {
                void this.playEffectLoop(id, options);
            }
        }

        return true;
    }

    public play(id: AudioCueId | string, options: AudioPlayOptions = {}) {
        const definition = this.cueDefinitions.get(id);
        if (!definition || this.muted || this.masterVolume <= 0) {
            return Promise.resolve<AudioPlaybackHandle | null>(null);
        }

        const context = this.getAudioContext();
        if (!context) return Promise.resolve<AudioPlaybackHandle | null>(null);

        if (context.state === 'suspended') {
            void context.resume().catch(() => undefined);
        }

        return this.loadBuffer(id, definition)
            .then((buffer) => {
                if (this.muted || this.masterVolume <= 0) return null;

                const source = context.createBufferSource();
                const gain = context.createGain();
                const cueVolume = definition.volume ?? 1;
                const playVolume = options.volume ?? 1;

                source.buffer = buffer;
                source.loop = options.loop ?? definition.loop ?? false;
                source.playbackRate.value = Math.max(0.01, options.playbackRate ?? 1);
                gain.gain.value = clamp01(this.masterVolume * this.effectVolume * cueVolume * playVolume);

                source.connect(gain);
                gain.connect(context.destination);
                source.start(0);

                let stopped = false;
                const disconnect = () => {
                    if (stopped) return;
                    stopped = true;
                    try {
                        source.stop();
                    } catch {
                        // Source nodes can only be stopped once.
                    }
                    source.disconnect();
                    gain.disconnect();
                };

                return {
                    stop: (stopOptions: { fadeOutMs?: number } = {}) => {
                        if (stopped) return;
                        const fadeOutMs = Math.max(0, stopOptions.fadeOutMs ?? 0);
                        if (fadeOutMs === 0) {
                            disconnect();
                            return;
                        }

                        const now = context.currentTime;
                        gain.gain.cancelScheduledValues(now);
                        gain.gain.setValueAtTime(gain.gain.value, now);
                        gain.gain.linearRampToValueAtTime(0, now + fadeOutMs / 1000);
                        window.setTimeout(disconnect, fadeOutMs + 50);
                    },
                    setPlaybackRate: (playbackRate: number) => {
                        if (stopped) return;
                        const now = context.currentTime;
                        source.playbackRate.cancelScheduledValues(now);
                        source.playbackRate.setValueAtTime(Math.max(0.01, playbackRate), now);
                    },
                };
            })
            .catch((error) => {
                console.warn(`[audio] Failed to play cue "${id}"`, error);
                return null;
            });
    }

    public playMusic(id: AudioCueId | string, options: AudioMusicOptions = {}) {
        const definition = this.cueDefinitions.get(id);
        if (!definition) return Promise.resolve(false);

        const context = this.getAudioContext();
        if (!context) return Promise.resolve(false);

        if (this.activeMusic?.id === id) {
            this.desiredMusic = { id, options };
            this.activeMusic.cueVolume = definition.volume ?? 1;
            this.activeMusic.playVolume = options.volume ?? this.activeMusic.playVolume;
            this.rampMusicGain(this.activeMusic, options.fadeInMs ?? 0);
            return Promise.resolve(true);
        }

        this.stopActiveMusic({ fadeOutMs: 0, clearDesired: false });
        this.disconnectAllMusicNodes();
        this.desiredMusic = { id, options };
        const runId = ++this.musicRunId;

        if (this.muted || this.masterVolume <= 0 || this.musicVolume <= 0) {
            return Promise.resolve(false);
        }

        if (context.state === 'suspended' && !this.unlocked) {
            void context.resume().catch(() => undefined);
            return Promise.resolve(false);
        }

        return this.loadBuffer(id, definition)
            .then((buffer) => {
                if (runId !== this.musicRunId || this.muted || this.masterVolume <= 0 || this.musicVolume <= 0) {
                    return false;
                }

                const fadeInMs = resolveMusicStartFadeInMs(id, options.fadeInMs);
                const source = context.createBufferSource();
                const gain = context.createGain();
                const cueVolume = definition.volume ?? 1;
                const playVolume = options.volume ?? 1;
                const now = context.currentTime;

                source.buffer = buffer;
                source.loop = true;
                gain.gain.cancelScheduledValues(now);
                gain.gain.value = 0;
                gain.gain.setValueAtTime(0, now);

                source.connect(gain);
                gain.connect(context.destination);
                source.start(0);
                this.musicNodes.add({ source, gain });

                this.activeMusic = { id, source, gain, cueVolume, playVolume };
                this.fadeInMusicFromSilence(this.activeMusic, fadeInMs);
                return true;
            })
            .catch((error) => {
                console.warn(`[audio] Failed to play music "${id}"`, error);
                return false;
            });
    }

    public stopMusic(options: AudioStopMusicOptions = {}) {
        this.stopActiveMusic({ ...options, clearDesired: true });
    }

    public playMusicPlaylist(id: string, cueIds: Array<AudioCueId | string>, options: AudioPlaylistOptions = {}) {
        const playableCueIds = cueIds.map(String).filter((cueId) => this.cueDefinitions.has(cueId));
        if (playableCueIds.length === 0) return Promise.resolve(false);

        const context = this.getAudioContext();
        if (!context) return Promise.resolve(false);

        if (this.activeMusicPlaylist?.id === id) {
            this.activeMusicPlaylist.cueIds = playableCueIds;
            this.activeMusicPlaylist.options = options;
            this.activeMusicPlaylist.playVolume = options.volume ?? this.activeMusicPlaylist.playVolume;
            if (this.activeMusicPlaylist.gain) {
                this.rampPlaylistGain(this.activeMusicPlaylist, 0);
            }
            this.desiredMusicPlaylist = { id, cueIds: playableCueIds, options };
            return Promise.resolve(true);
        }

        this.stopMusicPlaylist({ fadeOutMs: 0 });
        this.desiredMusicPlaylist = { id, cueIds: playableCueIds, options };
        const runId = ++this.musicPlaylistRunId;

        if (this.muted || this.masterVolume <= 0 || this.musicVolume <= 0) {
            return Promise.resolve(false);
        }

        if (context.state === 'suspended' && !this.unlocked) {
            void context.resume().catch(() => undefined);
            return Promise.resolve(false);
        }

        this.activeMusicPlaylist = {
            id,
            cueIds: playableCueIds,
            source: null,
            gain: null,
            cueVolume: 1,
            playVolume: options.volume ?? 1,
            lastCueId: null,
            options,
            gapTimeoutId: null,
        };

        void this.startNextPlaylistTrack(this.activeMusicPlaylist, runId, true);
        return Promise.resolve(true);
    }

    public stopMusicPlaylist(options: AudioStopPlaylistOptions = {}) {
        this.desiredMusicPlaylist = null;
        const playlist = this.activeMusicPlaylist;
        this.activeMusicPlaylist = null;
        ++this.musicPlaylistRunId;
        if (!playlist) return;
        this.clearPlaylistGapTimer(playlist);
        this.stopPlaylistTrack(playlist, Math.max(0, options.fadeOutMs ?? 0));
    }

    public playEffectLoop(id: AudioCueId | string, options: AudioLoopOptions = {}) {
        const definition = this.cueDefinitions.get(id);
        if (!definition) return Promise.resolve(false);

        const context = this.getAudioContext();
        if (!context) return Promise.resolve(false);

        const activeLoop = this.activeEffectLoops.get(id);
        if (activeLoop) {
            activeLoop.cueVolume = definition.volume ?? 1;
            activeLoop.playVolume = options.volume ?? activeLoop.playVolume;
            this.desiredEffectLoops.set(id, options);
            this.rampEffectLoopGain(activeLoop, options.fadeInMs ?? 0);
            return Promise.resolve(true);
        }

        this.desiredEffectLoops.set(id, options);
        const runId = (this.effectLoopRunIds.get(id) ?? 0) + 1;
        this.effectLoopRunIds.set(id, runId);

        if (this.muted || this.masterVolume <= 0 || this.ambientVolume <= 0) {
            return Promise.resolve(false);
        }

        if (context.state === 'suspended' && !this.unlocked) {
            void context.resume().catch(() => undefined);
            return Promise.resolve(false);
        }

        return this.loadBuffer(id, definition)
            .then((buffer) => {
                if (
                    this.effectLoopRunIds.get(id) !== runId ||
                    this.muted ||
                    this.masterVolume <= 0 ||
                    this.ambientVolume <= 0
                ) {
                    return false;
                }

                const fadeInMs = resolveStartFadeInMs(options.fadeInMs);
                const source = context.createBufferSource();
                const gain = context.createGain();
                const cueVolume = definition.volume ?? 1;
                const playVolume = options.volume ?? 1;
                const now = context.currentTime;

                source.buffer = buffer;
                source.loop = true;
                gain.gain.cancelScheduledValues(now);
                gain.gain.value = 0;
                gain.gain.setValueAtTime(0, now);

                source.connect(gain);
                gain.connect(context.destination);
                source.start(0);

                const loop = { source, gain, cueVolume, playVolume };
                this.activeEffectLoops.set(id, loop);
                this.fadeInEffectLoopFromSilence(loop, fadeInMs);
                return true;
            })
            .catch((error) => {
                console.warn(`[audio] Failed to play effect loop "${id}"`, error);
                return false;
            });
    }

    public stopEffectLoop(id: AudioCueId | string, options: AudioStopLoopOptions = {}) {
        this.desiredEffectLoops.delete(id);
        const runId = (this.effectLoopRunIds.get(id) ?? 0) + 1;
        this.effectLoopRunIds.set(id, runId);

        const loop = this.activeEffectLoops.get(id);
        this.activeEffectLoops.delete(id);
        if (!loop) return;

        const context = this.audioContext;
        const fadeOutMs = Math.max(0, options.fadeOutMs ?? 0);
        if (!context || fadeOutMs === 0) {
            this.disconnectEffectLoop(loop);
            return;
        }

        const now = context.currentTime;
        const stopAt = now + fadeOutMs / 1000;
        loop.gain.gain.cancelScheduledValues(now);
        loop.gain.gain.setValueAtTime(loop.gain.gain.value, now);
        loop.gain.gain.linearRampToValueAtTime(0, stopAt);
        window.setTimeout(() => this.disconnectEffectLoop(loop), fadeOutMs + 50);
    }

    private stopActiveMusic(options: AudioStopMusicOptions & { clearDesired: boolean }) {
        if (options.clearDesired) {
            this.desiredMusic = null;
        }
        const music = this.activeMusic;
        this.activeMusic = null;
        ++this.musicRunId;
        if (!music) return;

        const context = this.audioContext;
        const fadeOutMs = Math.max(0, options.fadeOutMs ?? 0);
        if (!context || fadeOutMs === 0) {
            this.disconnectMusic(music);
            return;
        }

        const now = context.currentTime;
        const stopAt = now + fadeOutMs / 1000;
        music.gain.gain.cancelScheduledValues(now);
        music.gain.gain.setValueAtTime(music.gain.gain.value, now);
        music.gain.gain.linearRampToValueAtTime(0, stopAt);
        window.setTimeout(() => this.disconnectMusic(music), fadeOutMs + 50);
    }

    public setMasterVolume(volume: number) {
        this.masterVolume = clamp01(volume);
        this.syncActiveMusicVolume();
        this.syncActivePlaylistVolume();
        this.syncActiveEffectLoopVolumes();
        this.resumeDesiredAudio();
    }

    public setMusicVolume(volume: number) {
        this.musicVolume = clamp01(volume);
        this.syncActiveMusicVolume();
        this.syncActivePlaylistVolume();
        this.resumeDesiredAudio();
    }

    public setEffectVolume(volume: number) {
        this.effectVolume = clamp01(volume);
    }

    public setAmbientVolume(volume: number) {
        this.ambientVolume = clamp01(volume);
        this.syncActiveEffectLoopVolumes();
        this.resumeDesiredAudio();
    }

    public setMuted(muted: boolean) {
        this.muted = muted;
        this.syncActiveMusicVolume();
        this.syncActivePlaylistVolume();
        this.syncActiveEffectLoopVolumes();
        this.resumeDesiredAudio();
    }

    public getSnapshot(): AudioManagerSnapshot {
        return {
            isMuted: this.muted,
            isUnlocked: this.unlocked,
            masterVolume: this.masterVolume,
            registeredCueCount: this.cueDefinitions.size,
        };
    }

    public dispose() {
        this.cueDefinitions.clear();
        this.decodedBuffers.clear();
        this.loadingBuffers.clear();
        this.unlocked = false;
        this.stopMusic({ fadeOutMs: 0 });
        this.stopMusicPlaylist({ fadeOutMs: 0 });
        for (const id of [...this.activeEffectLoops.keys(), ...this.desiredEffectLoops.keys()]) {
            this.stopEffectLoop(id, { fadeOutMs: 0 });
        }
        this.disconnectAllMusicNodes();

        const context = this.audioContext;
        this.audioContext = null;
        if (context && context.state !== 'closed') {
            void context.close();
        }
    }

    private getAudioContext() {
        if (this.audioContext) return this.audioContext;
        if (typeof window === 'undefined') return null;

        const webAudioWindow = window as WebAudioWindow;
        const AudioContextClass = webAudioWindow.AudioContext ?? webAudioWindow.webkitAudioContext;
        if (!AudioContextClass) return null;

        this.audioContext = new AudioContextClass();
        return this.audioContext;
    }

    private loadBuffer(id: AudioCueId | string, definition: AudioCueDefinition) {
        const cached = this.decodedBuffers.get(id);
        if (cached) return Promise.resolve(cached);

        const loading = this.loadingBuffers.get(id);
        if (loading) return loading;

        const context = this.getAudioContext();
        if (!context) return Promise.reject(new Error('Web Audio API is not available.'));

        const nextLoading = fetch(definition.src)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Audio request failed with ${response.status}: ${definition.src}`);
                }
                return response.arrayBuffer();
            })
            .then((arrayBuffer) => context.decodeAudioData(arrayBuffer))
            .then((buffer) => {
                this.decodedBuffers.set(id, buffer);
                this.loadingBuffers.delete(id);
                return buffer;
            })
            .catch((error) => {
                this.loadingBuffers.delete(id);
                throw error;
            });

        this.loadingBuffers.set(id, nextLoading);
        return nextLoading;
    }

    private resolveMusicGain(cueVolume: number, playVolume: number) {
        if (this.muted) return 0;
        return clamp01(this.masterVolume * this.musicVolume * cueVolume * playVolume * MUSIC_OUTPUT_GAIN);
    }

    private resolveAmbientGain(cueVolume: number, playVolume: number) {
        if (this.muted) return 0;
        return clampGain(this.masterVolume * this.ambientVolume * cueVolume * playVolume);
    }

    private rampMusicGain(music: NonNullable<AudioManager['activeMusic']>, fadeInMs: number) {
        const context = this.audioContext;
        if (!context) return;
        const targetVolume = this.resolveMusicGain(music.cueVolume, music.playVolume);
        const now = context.currentTime;
        music.gain.gain.cancelScheduledValues(now);
        music.gain.gain.setValueAtTime(music.gain.gain.value, now);
        if (fadeInMs > 0) {
            music.gain.gain.linearRampToValueAtTime(targetVolume, now + fadeInMs / 1000);
        } else {
            music.gain.gain.setValueAtTime(targetVolume, now);
        }
    }

    private fadeInMusicFromSilence(music: NonNullable<AudioManager['activeMusic']>, fadeInMs: number) {
        const context = this.audioContext;
        if (!context) return;
        const targetVolume = this.resolveMusicGain(music.cueVolume, music.playVolume);
        const now = context.currentTime;
        music.gain.gain.cancelScheduledValues(now);
        music.gain.gain.value = 0;
        music.gain.gain.setValueAtTime(0, now);
        music.gain.gain.linearRampToValueAtTime(targetVolume, now + fadeInMs / 1000);
    }

    private syncActiveMusicVolume() {
        if (!this.activeMusic) return;
        this.rampMusicGain(this.activeMusic, 0);
    }

    private choosePlaylistCueId(playlist: NonNullable<AudioManager['activeMusicPlaylist']>) {
        if (playlist.cueIds.length === 1) return playlist.cueIds[0]!;
        const candidates = playlist.cueIds.filter((id) => id !== playlist.lastCueId);
        return candidates[Math.floor(Math.random() * candidates.length)] ?? playlist.cueIds[0]!;
    }

    private async startNextPlaylistTrack(
        playlist: NonNullable<AudioManager['activeMusicPlaylist']>,
        runId: number,
        immediate: boolean,
    ) {
        if (runId !== this.musicPlaylistRunId || this.activeMusicPlaylist !== playlist) return;
        if (this.muted || this.masterVolume <= 0 || this.musicVolume <= 0) return;

        const context = this.getAudioContext();
        if (!context) return;
        if (context.state === 'suspended' && !this.unlocked) return;

        const delayMs = immediate ? 0 : this.getPlaylistGapMs(playlist.options);
        if (delayMs > 0) {
            playlist.gapTimeoutId = window.setTimeout(() => {
                playlist.gapTimeoutId = null;
                void this.startNextPlaylistTrack(playlist, runId, true);
            }, delayMs);
            return;
        }

        const cueId = this.choosePlaylistCueId(playlist);
        const definition = this.cueDefinitions.get(cueId);
        if (!definition) return;

        try {
            const buffer = await this.loadBuffer(cueId, definition);
            if (runId !== this.musicPlaylistRunId || this.activeMusicPlaylist !== playlist) return;

            const source = context.createBufferSource();
            const gain = context.createGain();
            const cueVolume = definition.volume ?? 1;
            const playVolume = playlist.options.volume ?? 1;
            const now = context.currentTime;

            source.buffer = buffer;
            source.loop = false;
            gain.gain.cancelScheduledValues(now);
            gain.gain.value = 0;
            gain.gain.setValueAtTime(0, now);

            source.connect(gain);
            gain.connect(context.destination);

            playlist.source = source;
            playlist.gain = gain;
            playlist.cueVolume = cueVolume;
            playlist.playVolume = playVolume;
            playlist.lastCueId = cueId;

            source.onended = () => {
                if (runId !== this.musicPlaylistRunId || this.activeMusicPlaylist !== playlist) return;
                source.onended = null;
                if (playlist.source === source) {
                    playlist.source = null;
                    playlist.gain = null;
                }
                source.disconnect();
                gain.disconnect();
                void this.startNextPlaylistTrack(playlist, runId, false);
            };

            source.start(0);
            this.fadeInPlaylistFromSilence(playlist, resolveStartFadeInMs(playlist.options.fadeInMs));
        } catch (error) {
            console.warn(`[audio] Failed to play playlist cue "${cueId}"`, error);
            void this.startNextPlaylistTrack(playlist, runId, false);
        }
    }

    private getPlaylistGapMs(options: AudioPlaylistOptions) {
        const minGapMs = Math.max(0, options.minGapMs ?? DEFAULT_PLAYLIST_GAP_MIN_MS);
        const maxGapMs = Math.max(minGapMs, options.maxGapMs ?? DEFAULT_PLAYLIST_GAP_MAX_MS);
        return minGapMs + Math.random() * (maxGapMs - minGapMs);
    }

    private rampPlaylistGain(playlist: NonNullable<AudioManager['activeMusicPlaylist']>, fadeInMs: number) {
        const context = this.audioContext;
        if (!context || !playlist.gain) return;
        const targetVolume = this.resolveMusicGain(playlist.cueVolume, playlist.playVolume);
        const now = context.currentTime;
        playlist.gain.gain.cancelScheduledValues(now);
        playlist.gain.gain.setValueAtTime(playlist.gain.gain.value, now);
        if (fadeInMs > 0) {
            playlist.gain.gain.linearRampToValueAtTime(targetVolume, now + fadeInMs / 1000);
        } else {
            playlist.gain.gain.setValueAtTime(targetVolume, now);
        }
    }

    private fadeInPlaylistFromSilence(playlist: NonNullable<AudioManager['activeMusicPlaylist']>, fadeInMs: number) {
        const context = this.audioContext;
        if (!context || !playlist.gain) return;
        const targetVolume = this.resolveMusicGain(playlist.cueVolume, playlist.playVolume);
        const now = context.currentTime;
        playlist.gain.gain.cancelScheduledValues(now);
        playlist.gain.gain.value = 0;
        playlist.gain.gain.setValueAtTime(0, now);
        playlist.gain.gain.linearRampToValueAtTime(targetVolume, now + fadeInMs / 1000);
    }

    private syncActivePlaylistVolume() {
        if (!this.activeMusicPlaylist) return;
        this.rampPlaylistGain(this.activeMusicPlaylist, 0);
    }

    private rampEffectLoopGain(loop: {
        gain: GainNode;
        cueVolume: number;
        playVolume: number;
    }, fadeInMs: number) {
        const context = this.audioContext;
        if (!context) return;
        const targetVolume = this.resolveAmbientGain(loop.cueVolume, loop.playVolume);
        const now = context.currentTime;
        loop.gain.gain.cancelScheduledValues(now);
        loop.gain.gain.setValueAtTime(loop.gain.gain.value, now);
        if (fadeInMs > 0) {
            loop.gain.gain.linearRampToValueAtTime(targetVolume, now + fadeInMs / 1000);
        } else {
            loop.gain.gain.setValueAtTime(targetVolume, now);
        }
    }

    private fadeInEffectLoopFromSilence(loop: {
        gain: GainNode;
        cueVolume: number;
        playVolume: number;
    }, fadeInMs: number) {
        const context = this.audioContext;
        if (!context) return;
        const targetVolume = this.resolveAmbientGain(loop.cueVolume, loop.playVolume);
        const now = context.currentTime;
        loop.gain.gain.cancelScheduledValues(now);
        loop.gain.gain.value = 0;
        loop.gain.gain.setValueAtTime(0, now);
        loop.gain.gain.linearRampToValueAtTime(targetVolume, now + fadeInMs / 1000);
    }

    private syncActiveEffectLoopVolumes() {
        for (const loop of this.activeEffectLoops.values()) {
            this.rampEffectLoopGain(loop, 0);
        }
    }

    private resumeDesiredAudio() {
        if (this.muted || this.masterVolume <= 0) return;

        if (this.desiredMusic && !this.activeMusic && this.musicVolume > 0) {
            void this.playMusic(this.desiredMusic.id, this.desiredMusic.options);
        }

        if (this.desiredMusicPlaylist && !this.activeMusicPlaylist && this.musicVolume > 0) {
            void this.playMusicPlaylist(
                this.desiredMusicPlaylist.id,
                this.desiredMusicPlaylist.cueIds,
                this.desiredMusicPlaylist.options,
            );
        }

        if (this.ambientVolume <= 0) return;
        for (const [id, options] of this.desiredEffectLoops) {
            if (!this.activeEffectLoops.has(id)) {
                void this.playEffectLoop(id, options);
            }
        }
    }

    private disconnectMusic(music: NonNullable<AudioManager['activeMusic']>) {
        try {
            music.source.stop();
        } catch {
            // Source nodes can only be stopped once.
        }
        music.source.disconnect();
        music.gain.disconnect();
        for (const node of this.musicNodes) {
            if (node.source === music.source && node.gain === music.gain) {
                this.musicNodes.delete(node);
                break;
            }
        }
    }

    private disconnectEffectLoop(loop: {
        source: AudioBufferSourceNode;
        gain: GainNode;
    }) {
        try {
            loop.source.stop();
        } catch {
            // Source nodes can only be stopped once.
        }
        loop.source.disconnect();
        loop.gain.disconnect();
    }

    private clearPlaylistGapTimer(playlist: NonNullable<AudioManager['activeMusicPlaylist']>) {
        if (playlist.gapTimeoutId === null) return;
        window.clearTimeout(playlist.gapTimeoutId);
        playlist.gapTimeoutId = null;
    }

    private stopPlaylistTrack(
        playlist: NonNullable<AudioManager['activeMusicPlaylist']>,
        fadeOutMs: number,
    ) {
        const source = playlist.source;
        const gain = playlist.gain;
        playlist.source = null;
        playlist.gain = null;
        if (!source || !gain) return;

        source.onended = null;
        const context = this.audioContext;
        if (!context || fadeOutMs === 0) {
            this.disconnectPlaylistTrack(source, gain);
            return;
        }

        const now = context.currentTime;
        const stopAt = now + fadeOutMs / 1000;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, stopAt);
        window.setTimeout(() => this.disconnectPlaylistTrack(source, gain), fadeOutMs + 50);
    }

    private disconnectPlaylistTrack(source: AudioBufferSourceNode, gain: GainNode) {
        try {
            source.stop();
        } catch {
            // Source nodes can only be stopped once.
        }
        source.disconnect();
        gain.disconnect();
    }

    private disconnectAllMusicNodes() {
        for (const node of this.musicNodes) {
            try {
                node.source.stop();
            } catch {
                // Source nodes can only be stopped once.
            }
            node.source.disconnect();
            node.gain.disconnect();
        }
        this.musicNodes.clear();
    }
}

export const audioManager = new AudioManager();
