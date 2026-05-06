export const AUDIO_CUE_IDS = [
    'spin_start',
    'spin_loop',
    'reel_stop',
    'symbol_activate',
    'resource_food',
    'resource_gold',
    'resource_knowledge',
    'combat_hit',
    'symbol_destroy',
    'era_transition',
    'selection_open',
    'game_over',
    'victory',
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

export interface AudioPlaybackHandle {
    stop: () => void;
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

export class AudioManager {
    private audioContext: AudioContext | null = null;
    private cueDefinitions = new Map<string, AudioCueDefinition>();
    private decodedBuffers = new Map<string, AudioBuffer>();
    private loadingBuffers = new Map<string, Promise<AudioBuffer>>();
    private masterVolume = 1;
    private muted = false;
    private unlocked = false;

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
            await context.resume();
        }

        if (!this.unlocked) {
            const silentBuffer = context.createBuffer(1, 1, context.sampleRate);
            const source = context.createBufferSource();
            source.buffer = silentBuffer;
            source.connect(context.destination);
            source.start(0);
            this.unlocked = true;
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
                gain.gain.value = clamp01(this.masterVolume * cueVolume * playVolume);

                source.connect(gain);
                gain.connect(context.destination);
                source.start(0);

                return {
                    stop: () => {
                        try {
                            source.stop();
                        } catch {
                            // Source nodes can only be stopped once.
                        }
                        source.disconnect();
                        gain.disconnect();
                    },
                };
            })
            .catch((error) => {
                console.warn(`[audio] Failed to play cue "${id}"`, error);
                return null;
            });
    }

    public setMasterVolume(volume: number) {
        this.masterVolume = clamp01(volume);
    }

    public setMuted(muted: boolean) {
        this.muted = muted;
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
}

export const audioManager = new AudioManager();
