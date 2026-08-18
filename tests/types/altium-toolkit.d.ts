declare module "altium-toolkit" {
  export type AltiumToolkitDocument = Record<string, unknown> & {
    model: Array<Record<string, unknown> & { type?: string }>
  }

  export const Parser: {
    parseAsync(
      input: { data: ArrayBuffer; fileName: string },
      options?: { worker?: boolean },
    ): Promise<AltiumToolkitDocument>
  }

  export const PcbSvgRenderer: {
    render(
      document: AltiumToolkitDocument,
      options?: Record<string, unknown>,
    ): string
  }
}
