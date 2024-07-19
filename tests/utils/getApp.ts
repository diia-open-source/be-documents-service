import { Application, ServiceContext, ServiceOperator } from '@diia-inhouse/diia-app'

import { QueueDeps } from '@diia-inhouse/diia-queue'

import config from '@src/config'
import { getLoadDepsFromFolderOptions } from '@src/documents/deps'

import { TestDeps } from '@tests/interfaces/utils'
import deps from '@tests/utils/deps'

import { AppDeps } from '@interfaces/application'
import { AppConfig } from '@interfaces/config'

export async function getApp(): Promise<ServiceOperator<AppConfig, AppDeps & TestDeps & QueueDeps>> {
    const app = new Application<ServiceContext<AppConfig, AppDeps & TestDeps & QueueDeps>>('Documents')

    await app.setConfig(config)

    await app.setDeps(deps)

    await Promise.all(getLoadDepsFromFolderOptions().map((options) => app.loadDepsFromFolder(options)))

    return await app.initialize()
}
