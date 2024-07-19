import { QueueConnectionConfig, QueueConnectionType } from '@diia-inhouse/diia-queue'
import { EnvService } from '@diia-inhouse/env'
import { mockInstance } from '@diia-inhouse/test'

import getQueueConfig from '@src/queueConfig'

describe('getQueueConfig', () => {
    it('should successfully compose and return queue config', () => {
        const serviceName = 'Documents'
        const envService = mockInstance(EnvService)
        const queuePluginConfig = <QueueConnectionConfig>{}

        const result = getQueueConfig(serviceName, envService, queuePluginConfig)

        expect(result).toEqual({
            serviceRulesConfig: expect.any(Object),
            [QueueConnectionType.Internal]: expect.any(Object),
            [QueueConnectionType.External]: expect.any(Object),
        })
    })
})
