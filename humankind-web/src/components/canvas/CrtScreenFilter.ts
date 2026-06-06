import * as PIXI from 'pixi.js';
import { CRT_CURVATURE } from './crtProjection';

const CRT_FRAGMENT_SHADER = `
in vec2 vTextureCoord;

out vec4 finalColor;

uniform sampler2D uTexture;
uniform highp vec4 uInputClamp;
uniform highp vec4 uInputSize;
uniform float uCurvature;
uniform float uScanlineStrength;
uniform float uChromaticAberration;

void main()
{
    vec2 textureSpan = max(uInputClamp.zw - uInputClamp.xy, vec2(0.00001));
    vec2 outputUv = (vTextureCoord - uInputClamp.xy) / textureSpan;
    vec2 outputPoint = outputUv * 2.0 - 1.0;
    float baseScale = 1.0 - uCurvature;
    vec2 sourcePoint = outputPoint * (
        baseScale + uCurvature * outputPoint.yx * outputPoint.yx
    );
    vec2 sourceUv = sourcePoint * 0.5 + 0.5;

    if (sourceUv.x < 0.0 || sourceUv.x > 1.0 || sourceUv.y < 0.0 || sourceUv.y > 1.0)
    {
        finalColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    vec2 sampleCoord = uInputClamp.xy + sourceUv * textureSpan;
    float radiusSquared = dot(outputPoint, outputPoint);
    vec2 channelOffset = outputPoint
        * radiusSquared
        * uInputSize.zw
        * uChromaticAberration;

    vec4 color = texture(uTexture, sampleCoord);
    color.r = texture(uTexture, clamp(
        sampleCoord + channelOffset,
        uInputClamp.xy,
        uInputClamp.zw
    )).r;
    color.b = texture(uTexture, clamp(
        sampleCoord - channelOffset,
        uInputClamp.xy,
        uInputClamp.zw
    )).b;

    float scanline = 1.0 - uScanlineStrength
        * (0.5 + 0.5 * sin(gl_FragCoord.y * 3.14159265));
    float vignette = 1.0 - 0.22 * smoothstep(0.42, 1.75, radiusSquared);
    float reflection = pow(max(
        0.0,
        1.0 - distance(outputUv, vec2(0.24, -0.12)) * 0.92
    ), 5.0) * 0.055;

    color.rgb = color.rgb * scanline * vignette + reflection * color.a;
    finalColor = color;
}
`;

export function createCrtScreenFilter(curvature = CRT_CURVATURE): PIXI.Filter {
    return PIXI.Filter.from({
        gl: {
            name: 'crt-screen-filter',
            vertex: PIXI.defaultFilterVert,
            fragment: CRT_FRAGMENT_SHADER,
        },
        resources: {
            crtUniforms: new PIXI.UniformGroup({
                uCurvature: { value: curvature, type: 'f32' },
                uScanlineStrength: { value: 0.16, type: 'f32' },
                uChromaticAberration: { value: 1.35, type: 'f32' },
            }),
        },
        antialias: 'off',
        clipToViewport: false,
        padding: 0,
        resolution: 'inherit',
    });
}
