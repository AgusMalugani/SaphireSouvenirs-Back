export type NodeEnvironment = 'development' | 'production';

export interface RuntimeConfigInput {
  nodeEnvironment: NodeEnvironment;
  dbSynchronize: boolean;
  seedOnStartup: boolean;
}

export interface EffectiveRuntimeConfig {
  dropSchema: false;
  synchronize: boolean;
  seedOnStartup: boolean;
}

export function resolveRuntimeConfig(
  runtimeConfigInput: RuntimeConfigInput,
): EffectiveRuntimeConfig {
  if (runtimeConfigInput.nodeEnvironment === 'production') {
    return {
      dropSchema: false,
      synchronize: false,
      seedOnStartup: false,
    };
  }

  return {
    dropSchema: false,
    synchronize: runtimeConfigInput.dbSynchronize,
    seedOnStartup: runtimeConfigInput.seedOnStartup,
  };
}
