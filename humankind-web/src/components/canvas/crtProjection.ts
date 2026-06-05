export const CRT_CURVATURE = 0.07;

type Point = {
    x: number;
    y: number;
};

const normalizePoint = (x: number, y: number, width: number, height: number): Point => ({
    x: (x / Math.max(1, width)) * 2 - 1,
    y: (y / Math.max(1, height)) * 2 - 1,
});

const denormalizePoint = (x: number, y: number, width: number, height: number): Point => ({
    x: (x * 0.5 + 0.5) * width,
    y: (y * 0.5 + 0.5) * height,
});

/**
 * Converts a point on the visibly curved screen back into the source coordinate
 * sampled by the CRT shader. Pixi uses this for hit testing.
 */
export function mapCrtOutputToSource(
    x: number,
    y: number,
    width: number,
    height: number,
    curvature = CRT_CURVATURE,
): Point {
    const point = normalizePoint(x, y, width, height);
    const baseScale = 1 - curvature;
    return denormalizePoint(
        point.x * (baseScale + curvature * point.y * point.y),
        point.y * (baseScale + curvature * point.x * point.x),
        width,
        height,
    );
}

/**
 * Projects a source coordinate to where it appears after the CRT shader.
 * Used by DOM tooltips that follow Pixi objects.
 */
export function mapCrtSourceToOutput(
    x: number,
    y: number,
    width: number,
    height: number,
    curvature = CRT_CURVATURE,
): Point {
    const source = normalizePoint(x, y, width, height);
    const baseScale = 1 - curvature;
    let outputX = source.x / Math.max(0.001, baseScale);
    let outputY = source.y / Math.max(0.001, baseScale);

    for (let index = 0; index < 8; index += 1) {
        outputX = source.x / Math.max(0.001, baseScale + curvature * outputY * outputY);
        outputY = source.y / Math.max(0.001, baseScale + curvature * outputX * outputX);
    }

    return denormalizePoint(outputX, outputY, width, height);
}
