import { asClass } from 'awilix'

import { Application, GrpcService, MoleculerService, ServiceContext, ServiceOperator } from '@diia-inhouse/diia-app'

import { EventBus, ExternalEventBus, Queue, ScheduledTask, Task } from '@diia-inhouse/diia-queue'
import { mockClass } from '@diia-inhouse/test'

import config from '@src/config'
import { getLoadDepsFromFolderOptions } from '@src/documents/deps'

import { TestDeps } from '@tests/interfaces/utils'
import deps from '@tests/utils/deps'

import { AppDeps } from '@interfaces/application'
import { AppConfig } from '@interfaces/config'

export async function getApp(): Promise<ServiceOperator<AppConfig, AppDeps & TestDeps>> {
    const app = new Application<ServiceContext<AppConfig, AppDeps & TestDeps>>('Documents')

    await app.setConfig(config)

    app.setDeps(deps)
    getLoadDepsFromFolderOptions().forEach((options) => app.loadDepsFromFolder(options))

    app.overrideDeps({
        moleculer: asClass(mockClass(MoleculerService)).singleton(),
        grpcService: asClass(mockClass(GrpcService)).singleton(),
        queue: asClass(mockClass(Queue)).singleton(),
        scheduledTask: asClass(mockClass(ScheduledTask)).singleton(),
        eventBus: asClass(mockClass(EventBus)).singleton(),
        externalEventBus: asClass(mockClass(ExternalEventBus)).singleton(),
        task: asClass(mockClass(Task)).singleton(),
    })

    return app.initialize()
}
