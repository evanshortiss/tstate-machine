export type PartialProperties<T> = {
  [F in keyof T]?: T[F];
};
