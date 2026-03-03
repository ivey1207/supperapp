declare module 'polyline-encoded' {
    export function decode(string: string, precision?: number): [number, number][];
    export function encode(points: [number, number][], precision?: number): string;
}
