import { FilterQuery } from 'mongoose'

import { DocumentType, Logger } from '@diia-inhouse/types'

import documentSettingModel from '@models/documentSetting'

import { DocumentSettingModel, DocumentSettingVersion, ExpirationType } from '@interfaces/models/documentSetting'

export default class DocumentSettingsService {
    constructor(private readonly logger: Logger) {}

    private documentSettings: Map<string, DocumentSettingModel> = new Map()

    async getDocumentExpirationTime(type: DocumentType, expirationType: ExpirationType, version: DocumentSettingVersion): Promise<number> {
        const key = `${type}:${version}`
        const cachedDocumentSetting = this.documentSettings.get(key)
        if (cachedDocumentSetting) {
            return cachedDocumentSetting.expirationTime[expirationType] ?? 0
        }

        const query: FilterQuery<DocumentSettingModel> = { type, version }

        const documentSetting = await documentSettingModel.findOne(query)

        if (!documentSetting) {
            this.logger.error(`There is no document settings`, { type, version })

            return 0
        }

        this.documentSettings.set(key, documentSetting)

        return documentSetting.expirationTime[expirationType] ?? 0
    }
}
