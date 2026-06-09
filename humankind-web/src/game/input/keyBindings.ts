export const KEY_BINDING_ACTIONS = [
    'spin',
    'pause',
    'relicShop',
    'knowledge',
    'history',
    'ownedSymbols',
    'reroll',
    'skip',
    'selectFirst',
    'selectSecond',
    'selectThird',
] as const;

export type KeyBindingAction = (typeof KEY_BINDING_ACTIONS)[number];
export type KeyBindings = Record<KeyBindingAction, string>;

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
    spin: 'Space',
    pause: 'Escape',
    relicShop: 'KeyQ',
    knowledge: 'KeyW',
    history: 'KeyA',
    ownedSymbols: 'KeyS',
    reroll: 'KeyR',
    skip: 'KeyE',
    selectFirst: 'Digit1',
    selectSecond: 'Digit2',
    selectThird: 'Digit3',
};

const LEGACY_DEFAULT_KEY_BINDINGS = {
    spin: 'Space',
    pause: 'Escape',
    relicShop: 'KeyR',
    knowledge: 'KeyK',
    history: 'F12',
    ownedSymbols: 'KeyI',
} as const;

const MODIFIER_CODES = new Set([
    'AltLeft',
    'AltRight',
    'ControlLeft',
    'ControlRight',
    'MetaLeft',
    'MetaRight',
    'ShiftLeft',
    'ShiftRight',
]);

export const isBindableKeyCode = (code: string): boolean =>
    code.length > 0 && !MODIFIER_CODES.has(code);

export const sanitizeKeyBindings = (value: unknown): KeyBindings => {
    if (value == null || typeof value !== 'object') return { ...DEFAULT_KEY_BINDINGS };

    const rawSaved = value as Partial<Record<KeyBindingAction, unknown>>;
    const isLegacyLayout =
        rawSaved.reroll === undefined &&
        rawSaved.skip === undefined &&
        rawSaved.selectFirst === undefined &&
        rawSaved.selectSecond === undefined &&
        rawSaved.selectThird === undefined;
    const saved = isLegacyLayout
        ? Object.fromEntries(KEY_BINDING_ACTIONS.map((action) => {
            const legacyDefault = LEGACY_DEFAULT_KEY_BINDINGS[
                action as keyof typeof LEGACY_DEFAULT_KEY_BINDINGS
            ];
            const code = legacyDefault !== undefined && rawSaved[action] === legacyDefault
                ? DEFAULT_KEY_BINDINGS[action]
                : rawSaved[action];
            return [action, code];
        })) as Partial<Record<KeyBindingAction, unknown>>
        : rawSaved;

    const bindings = {} as KeyBindings;
    const usedCodes = new Set<string>();

    for (const action of KEY_BINDING_ACTIONS) {
        const savedCode = saved[action];
        const preferredCode =
            typeof savedCode === 'string' && isBindableKeyCode(savedCode) && !usedCodes.has(savedCode)
                ? savedCode
                : DEFAULT_KEY_BINDINGS[action];
        const code = !usedCodes.has(preferredCode)
            ? preferredCode
            : KEY_BINDING_ACTIONS
                .map((candidate) => DEFAULT_KEY_BINDINGS[candidate])
                .find((candidate) => !usedCodes.has(candidate))
                ?? DEFAULT_KEY_BINDINGS[action];

        bindings[action] = code;
        usedCodes.add(code);
    }

    return bindings;
};

export const rebindKey = (
    bindings: KeyBindings,
    action: KeyBindingAction,
    code: string,
): KeyBindings => {
    if (!isBindableKeyCode(code) || bindings[action] === code) return bindings;

    const conflictingAction = KEY_BINDING_ACTIONS.find(
        (candidate) => candidate !== action && bindings[candidate] === code,
    );
    const next = { ...bindings, [action]: code };

    if (conflictingAction) {
        next[conflictingAction] = bindings[action];
    }

    return next;
};

export const getActionForKeyCode = (
    bindings: KeyBindings,
    code: string,
): KeyBindingAction | null =>
    KEY_BINDING_ACTIONS.find((action) => bindings[action] === code) ?? null;

export const formatKeyCode = (code: string): string => {
    if (code === 'Space') return 'Space';
    if (code === 'Escape') return 'Esc';
    if (code === 'Enter') return 'Enter';
    if (code === 'Backspace') return 'Backspace';
    if (code === 'Delete') return 'Delete';
    if (code === 'Tab') return 'Tab';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
    if (code.startsWith('Arrow')) return code.slice(5);
    return code;
};
