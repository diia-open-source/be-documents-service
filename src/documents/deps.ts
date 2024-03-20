import path from 'path'

import { LoadedModuleDescriptor } from 'awilix/lib/load-modules'
import { globSync } from 'glob'
import { camelCase, upperFirst } from 'lodash'
import { singular } from 'pluralize'

import { DepsResolver, LoadDepsFromFolderOptions } from '@diia-inhouse/diia-app'

import { AppConfig } from '@interfaces/config'

function nameFormatter(descriptor: LoadedModuleDescriptor, folderName: string, depType: string): string {
    const parsedPath = path.parse(descriptor.path)
    const fileName = parsedPath.name
    const dependencyPath = parsedPath.dir
        .split(folderName)[1]
        .split(path.sep)
        .map((p) => upperFirst(p))

    if (fileName !== 'index') {
        dependencyPath.push(upperFirst(fileName))
    }

    return camelCase(`${dependencyPath.join('')}${upperFirst(depType)}`)
}

function getLoadDocumentDep(folderName: string, fileMask: string, groupName?: string, pluginGroupName?: string): LoadDepsFromFolderOptions {
    const [docType, depDir] = folderName.split(/[\\/]/).slice(-2)
    const depType = singular(depDir)

    return {
        folderName,
        pluginGroupName,
        nameFormatter: (name, descriptor): string => {
            if ((depType === 'service' || depType === 'dataMapper') && name === 'document') {
                return `${docType}${upperFirst(depType)}`
            }

            if ((depType === 'service' || depType === 'dataMapper') && name === 'documentAnalytics') {
                return `${docType}Analytics${upperFirst(depType)}`
            }

            if ((depType === 'service' || depType === 'dataMapper') && name === 'documentAttributes') {
                return `${docType}Attributes${upperFirst(depType)}`
            }

            if ((depType === 'service' || depType === 'dataMapper') && name === 'documentExpiration') {
                return `${docType}Expiration${upperFirst(depType)}`
            }

            return nameFormatter(descriptor, folderName, depType)
        },
        ...(groupName ? { groupName } : {}),
        ...(fileMask ? { fileMask } : {}),
    }
}

function getLoadDocumentFolderDeps(folder: string): LoadDepsFromFolderOptions[] {
    const dir = folder.replace('dist/', '')

    return [
        getLoadDocumentDep(`${dir}/actions`, '**/*.js', 'actionList'),
        getLoadDocumentDep(`${dir}/tasks`, '**/*.js', 'taskList'),
        getLoadDocumentDep(`${dir}/scheduledTasks`, '**/*.js', 'scheduledTaskList'),
        getLoadDocumentDep(`${dir}/eventListeners`, '**/*.js', 'eventListenerList'),
        getLoadDocumentDep(`${dir}/externalEventListeners`, '**/*.js', 'externalEventListenerList'),
        getLoadDocumentDep(`${dir}/dataMappers`, '**/*.js'),
        getLoadDocumentDep(`${dir}/dataMappers`, '**/document.js', undefined, 'documentDataMappers'),
        getLoadDocumentDep(`${dir}/dataMappers`, '**/documentDesignSystem.js', undefined, 'documentDesignSystemDataMappers'),
        getLoadDocumentDep(`${dir}/services`, '**/*.js'),
        getLoadDocumentDep(`${dir}/services`, '**/document.js', undefined, 'documentServices'),
        getLoadDocumentDep(`${dir}/services`, '**/documentAnalytics.js', undefined, 'documentAnalyticsServices'),
        getLoadDocumentDep(`${dir}/services`, '**/documentAttributes.js', undefined, 'documentAttributesServices'),
        getLoadDocumentDep(`${dir}/services`, '**/documentExpiration.js', undefined, 'documentExpirationServices'),
    ]
}

export const getLoadDepsFromFolderOptions = (): LoadDepsFromFolderOptions[] => {
    const documentFolders = globSync(`dist/documents/*/`)

    return documentFolders.map((folder) => getLoadDocumentFolderDeps(folder)).flat()
}

export const getProvidersDeps = (config: AppConfig): DepsResolver<Record<string, unknown>> => {
    const files = globSync('dist/documents/*/providers/index.js')

    return files.reduce((deps, file) => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getProvidersDeps: getDocumentProvidersDeps } = require(path.resolve(process.cwd(), file))

        return {
            ...deps,
            ...getDocumentProvidersDeps(config),
        }
    }, {})
}
