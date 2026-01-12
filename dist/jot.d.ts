export interface StringifyOptions {
  pretty?: boolean
  indent?: string
}
export declare function stringify(data: unknown, options?: StringifyOptions): string
export declare function parse(input: string): unknown
