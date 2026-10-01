export const HOME_TOUR_STEPS = [
  { hash: "hero", copyKey: "tourHero" },
  { hash: "status", copyKey: "tourStatus" },
  { hash: "cuaca", copyKey: "tourCuaca" },
  { hash: "sik", copyKey: "tourSik" },
  { hash: "dibi", copyKey: "tourDibi" },
  { hash: "peta-teaser", copyKey: "tourPeta" },
  { hash: "partisipasi", copyKey: "tourLapor" },
  { hash: "transparansi", copyKey: "tourTransparansi" },
] as const;

export type HomeTourStep = (typeof HOME_TOUR_STEPS)[number];
