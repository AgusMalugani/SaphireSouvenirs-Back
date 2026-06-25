export type NodeEnvironment = 'development' | 'production';

export interface RuntimeConfigInput {
  nodeEnvironment: NodeEnvironment;
  dbSynchronize: boolean;
  dbDropSchema: boolean;
  seedOnStartup: boolean;
}

export interface EffectiveRuntimeConfig {
  dropSchema: boolean;
  synchronize: boolean;
  seedOnStartup: boolean;
}

export function resolveRuntimeConfig(
  runtimeConfigInput: RuntimeConfigInput,
): EffectiveRuntimeConfig {
  if (runtimeConfigInput.nodeEnvironment === 'production') {
    return {
      dropSchema: runtimeConfigInput.dbDropSchema,
      synchronize: false,
      seedOnStartup: false,
    };
  }

  return {
    dropSchema: runtimeConfigInput.dbDropSchema,
    synchronize: runtimeConfigInput.dbSynchronize,
    seedOnStartup: runtimeConfigInput.seedOnStartup,
  };
}
