export function isEarthEngineConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(
    env.WEATHERNEXT_EE_PROJECT &&
      (env.GOOGLE_APPLICATION_CREDENTIALS ||
        env.WEATHERNEXT_EE_ACCESS_TOKEN ||
        env.WEATHERNEXT_EE_RAW_PATH),
  );
}
