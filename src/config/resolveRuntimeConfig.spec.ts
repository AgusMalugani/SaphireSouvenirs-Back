import { resolveRuntimeConfig } from './resolveRuntimeConfig';

describe('resolveRuntimeConfig', () => {
  it('keeps dropSchema false by default in development', () => {
    const effectiveConfig = resolveRuntimeConfig({
      nodeEnvironment: 'development',
      dbSynchronize: true,
      dbDropSchema: false,
      seedOnStartup: false,
    });

    expect(effectiveConfig.dropSchema).toBe(false);
  });

  it('enables dropSchema in development when flag is true', () => {
    const effectiveConfig = resolveRuntimeConfig({
      nodeEnvironment: 'development',
      dbSynchronize: true,
      dbDropSchema: true,
      seedOnStartup: false,
    });

    expect(effectiveConfig.dropSchema).toBe(true);
  });

  it('uses dbSynchronize flag in development when true', () => {
    const effectiveConfig = resolveRuntimeConfig({
      nodeEnvironment: 'development',
      dbSynchronize: true,
      dbDropSchema: false,
      seedOnStartup: false,
    });

    expect(effectiveConfig.synchronize).toBe(true);
  });

  it('uses dbSynchronize flag in development when false', () => {
    const effectiveConfig = resolveRuntimeConfig({
      nodeEnvironment: 'development',
      dbSynchronize: false,
      dbDropSchema: false,
      seedOnStartup: false,
    });

    expect(effectiveConfig.synchronize).toBe(false);
  });

  it('uses seedOnStartup flag in development when true', () => {
    const effectiveConfig = resolveRuntimeConfig({
      nodeEnvironment: 'development',
      dbSynchronize: true,
      dbDropSchema: false,
      seedOnStartup: true,
    });

    expect(effectiveConfig.seedOnStartup).toBe(true);
  });

  it('forces synchronize off in production even when raw flag is true', () => {
    const effectiveConfig = resolveRuntimeConfig({
      nodeEnvironment: 'production',
      dbSynchronize: true,
      dbDropSchema: false,
      seedOnStartup: false,
    });

    expect(effectiveConfig.synchronize).toBe(false);
    expect(effectiveConfig.dropSchema).toBe(false);
  });

  it('allows dropSchema in production when explicitly enabled', () => {
    const effectiveConfig = resolveRuntimeConfig({
      nodeEnvironment: 'production',
      dbSynchronize: false,
      dbDropSchema: true,
      seedOnStartup: false,
    });

    expect(effectiveConfig.dropSchema).toBe(true);
    expect(effectiveConfig.synchronize).toBe(false);
    expect(effectiveConfig.seedOnStartup).toBe(false);
  });

  it('forces seed off in production even when raw flag is true', () => {
    const effectiveConfig = resolveRuntimeConfig({
      nodeEnvironment: 'production',
      dbSynchronize: false,
      dbDropSchema: false,
      seedOnStartup: true,
    });

    expect(effectiveConfig.seedOnStartup).toBe(false);
  });

  it('forces sync and seed off in production with all flags true', () => {
    const effectiveConfig = resolveRuntimeConfig({
      nodeEnvironment: 'production',
      dbSynchronize: true,
      dbDropSchema: true,
      seedOnStartup: true,
    });

    expect(effectiveConfig).toEqual({
      dropSchema: true,
      synchronize: false,
      seedOnStartup: false,
    });
  });
});
