import path from 'path'

import { globSync } from 'glob'

import { EnvService } from '@diia-inhouse/env'

export const getConfigs = async (envService: EnvService, serviceName: string): Promise<Record<string, unknown>> => {
    const files = globSync('dist/documents/*/config.js')
    const factories = files.map((file) => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pluginConfigFactory = require(path.resolve(process.cwd(), file)).default

        return pluginConfigFactory
    })
    const pluginConfigs = await Promise.all(factories.map((getPluginConfig) => getPluginConfig(envService, serviceName)))

    return pluginConfigs.reduce((acc, pluginConfig) => ({ ...acc, ...pluginConfig }), {})
}
