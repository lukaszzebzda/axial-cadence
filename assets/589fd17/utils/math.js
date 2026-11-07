export const TAU = Math.PI * 2;
export function normAngle(a) {
    a = a % TAU;
    if (a < 0)
        a += TAU;
    return a;
}
