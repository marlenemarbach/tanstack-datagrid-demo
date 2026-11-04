/**
 * Row ids: groups use their group path, records `#<record id>`, so the two
 * can never collide.
 */

export const recordRowId = (recordId: string) => `#${recordId}`

/** The record id of a record row id (`#42` -> `42`). */
export const recordIdOf = (rowId: string) => rowId.slice(1)
