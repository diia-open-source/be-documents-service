import path from 'node:path'

import { globSync } from 'glob'
import { mergeWith } from 'lodash'

import { EnvService } from '@diia-inhouse/env'

export const mergeConfigs = (destination: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> => {
    return mergeWith(destination, source, (dstValue, srcValue) => {
        if (!Array.isArray(srcValue)) {
            return
        }

        const valuesArray = (Array.isArray(dstValue) ? dstValue : []).concat(srcValue)

        return [...new Set(valuesArray)]
    })
}

export const getConfigs = async (envService: EnvService, serviceName: string): Promise<Record<string, unknown>> => {
    const files = globSync('dist/documents/*/config.js')
    const factories = files.map((file) => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pluginConfigFactory = require(path.resolve(process.cwd(), file)).default

        return pluginConfigFactory
    })
    const pluginConfigs = await Promise.all(factories.map((getPluginConfig) => getPluginConfig(envService, serviceName)))

    let configs: Record<string, unknown> = {}
    for (const pluginConfig of pluginConfigs) {
        configs = mergeConfigs(configs, pluginConfig)
    }

    return configs
}
