/** RFC 9457 problem details, as required by the Zalando guidelines. */
export class Problem extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail?: string,
  ) {
    super(detail ?? title)
  }

  toJSON() {
    return { type: 'about:blank', title: this.title, status: this.status, detail: this.detail }
  }
}
