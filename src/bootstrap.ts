import moment from 'moment'

import { Application, ServiceContext } from '@diia-inhouse/diia-app'

import configFactory from '@src/config'
import deps from '@src/deps'
import { getLoadDepsFromFolderOptions } from '@src/documents/deps'

import { AppDeps } from '@interfaces/application'
import { AppConfig } from '@interfaces/config'

export async function bootstrap(serviceName: string): Promise<void> {
    const app = new Application<ServiceContext<AppConfig, AppDeps>>(serviceName)

    await app.setConfig(configFactory)

    app.setDeps(deps)
    getLoadDepsFromFolderOptions().forEach((options) => app.loadDepsFromFolder(options))

    const { config, start } = app.initialize()

    await start()

    moment.updateLocale((<AppConfig>config).app.dateLocale, {
        months: 'Січня_Лютого_Березня_Квітня_Травня_Червня_Липня_Серпня_Вересня_Жовтня_Листопада_Грудня'.split('_'),
    })
}
