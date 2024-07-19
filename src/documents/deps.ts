import path from 'node:path'

import { LoadedModuleDescriptor } from 'awilix/lib/load-modules'
import { globSync } from 'glob'
import { camelCase, upperFirst } from 'lodash'
import { singular } from 'pluralize'

import { LoadDepsFromFolderOptions, NameAndRegistrationPair } from '@diia-inhouse/diia-app'

import { AppConfig } from '@interfaces/config'
import { PassportDocumentType } from '@interfaces/services/passport'

const serviceEntries = ['', 'Analytics', 'Attributes', 'Expiration', 'Pdf']
const dataMapperEntries = ['', 'DesignSystem']

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

function getLoadDocumentDep(folderName: string, fileMask: string, groupName?: string): LoadDepsFromFolderOptions {
    const [docType, depDir] = folderName.split(path.posix.sep).slice(-2)
    const depType = singular(depDir)

    return {
        folderName,
        nameFormatter: (name, descriptor): string => {
            const entryName = serviceEntries.find((entry) => name === `document${entry}`)

            if (['service', 'dataMapper'].includes(depType) && entryName !== undefined) {
                return [docType, entryName, upperFirst(depType)].join('')
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
        ...dataMapperEntries.map((entryName) =>
            getLoadDocumentDep(`${dir}/dataMappers`, `**/document${entryName}.js`, `document${entryName}DataMappers`),
        ),
        getLoadDocumentDep(`${dir}/services`, '**/*.js'),
        ...serviceEntries.map((entryName) =>
            getLoadDocumentDep(`${dir}/services`, `**/document${entryName}.js`, `document${entryName}Services`),
        ),
    ]
}

export const getLoadDepsFromFolderOptions = (): LoadDepsFromFolderOptions[] => {
    const documentFolders = globSync(`dist/documents/*/`)

    return documentFolders.flatMap((folder) => getLoadDocumentFolderDeps(folder))
}

export const getProvidersDeps = (config: AppConfig): NameAndRegistrationPair<Record<string, unknown>> => {
    const files = globSync('dist/documents/*/providers/index.js')
    let deps: NameAndRegistrationPair<Record<string, unknown>> = {}

    for (const file of files) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getProvidersDeps: getDocumentProvidersDeps } = require(path.resolve(process.cwd(), file))

        deps = {
            ...deps,
            ...getDocumentProvidersDeps(config),
        }
    }

    return deps
}

const getDocumentTypes = (): string[] => {
    const files = globSync('dist/documents/*/interfaces/services/index.js')

    return files.flatMap((file): string[] => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { DocumentType } = require(path.resolve(process.cwd(), file))

        return Object.values(DocumentType)
    })
}

export const documentTypes = [...Object.values(PassportDocumentType), ...getDocumentTypes()]
