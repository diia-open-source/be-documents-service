declare module 'luhn-string' {
    interface LuhnString {
        random(len: number): string
    }

    const luhn: LuhnString

    export = luhn
}
