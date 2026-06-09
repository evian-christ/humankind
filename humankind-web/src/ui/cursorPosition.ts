interface RootLike {
    clientWidth: number;
    clientHeight: number;
    getBoundingClientRect: () => Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
}

export function viewportPointToRootPoint(root: RootLike, clientX: number, clientY: number) {
    const rect = root.getBoundingClientRect();
    const scaleX = rect.width / root.clientWidth;
    const scaleY = rect.height / root.clientHeight;
    const safeScaleX = Math.max(scaleX, 0.001);
    const safeScaleY = Math.max(scaleY, 0.001);

    return {
        x: (clientX - rect.left) / safeScaleX,
        y: (clientY - rect.top) / safeScaleY,
    };
}
