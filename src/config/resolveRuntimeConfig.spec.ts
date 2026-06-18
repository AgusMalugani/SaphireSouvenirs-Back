import { resolveRuntimeConfig } from './resolveRuntimeConfig';

describe('resolveRuntimeConfig', () => {
  it('keeps dropSchema false in development', () => {
    const effectiveConfig = resolveRuntimeConfig({
      nodeEnvironment: 'development',
      dbSynchronize: true,
      seedOnStartup: false,
    });

    expect(effectiveConfig.dropSchema).toBe(false);
  });

  it('uses dbSynchronize flag in development when true', () => {
    const effectiveConfig = resolveRuntimeConfig({
      nodeEnvironment: 'development',
      dbSynchronize: true,
      seedOnStartup: false,
    });

    expect(effectiveConfig.synchronize).toBe(true);
  });

  it('uses dbSynchronize flag in development when false', () => {
    const effectiveConfig = resolveRuntimeConfig({
      nodeEnvironment: 'development',
      dbSynchronize: false,
      seedOnStartup: false,
    });

    expect(effectiveConfig.synchronize).toBe(false);
  });

  it('uses seedOnStartup flag in development when true', () => {
    const effectiveConfig = resolveRuntimeConfig({
      nodeEnvironment: 'development',
      dbSynchronize: true,
      seedOnStartup: true,
    });

    expect(effectiveConfig.seedOnStartup).toBe(true);
  });

  it('forces synchronize off in production even when raw flag is true', () => {
    const effectiveConfig = resolveRuntimeConfig({
      nodeEnvironment: 'production',
      dbSynchronize: true,
      seedOnStartup: false,
    });

    expect(effectiveConfig.synchronize).toBe(false);
    expect(effectiveConfig.dropSchema).toBe(false);
  });

  it('forces seed off in production even when raw flag is true', () => {
    const effectiveConfig = resolveRuntimeConfig({
      nodeEnvironment: 'production',
      dbSynchronize: false,
      seedOnStartup: true,
    });

    expect(effectiveConfig.seedOnStartup).toBe(false);
  });

  it('forces both sync and seed off in production with all flags true', () => {
    const effectiveConfig = resolveRuntimeConfig({
      nodeEnvironment: 'production',
      dbSynchronize: true,
      seedOnStartup: true,
    });

    expect(effectiveConfig).toEqual({
      dropSchema: false,
      synchronize: false,
      seedOnStartup: false,
    });
  });
});
