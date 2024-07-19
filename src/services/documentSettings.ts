import { FilterQuery } from '@diia-inhouse/db'
import { Logger } from '@diia-inhouse/types'
import { DocumentVisibilitySettingsItem } from '@diia-inhouse/user-service-client'

import UserDocumentSettingsService from '@services/userDocumentSettings'

import documentSettingModel from '@models/documentSetting'

import { DocumentSettingModel, DocumentSettingVersion, ExpirationType } from '@interfaces/models/documentSetting'

export default class DocumentSettingsService {
    constructor(
        private readonly logger: Logger,
        private readonly userDocumentSettingsService: UserDocumentSettingsService,
    ) {}

    private documentSettings: Map<string, DocumentSettingModel> = new Map()

    async isDocumentTypeHidden(
        documentType: string,
        documentsSettings: DocumentSettingModel[],
        userDocumentVisibilitySetting?: DocumentVisibilitySettingsItem,
    ): Promise<boolean> {
        const documentSetting = documentsSettings.find(({ type }) => type === documentType)
        if (!documentSetting) {
            return false
        }

        const { defaultHidden = false } = documentSetting
        const userSettingsValue = this.userDocumentSettingsService.isDocumentTypeHidden(userDocumentVisibilitySetting)

        if (!userDocumentVisibilitySetting || userSettingsValue === undefined) {
            return defaultHidden
        }

        return Boolean(userDocumentVisibilitySetting.hiddenDocumentType)
    }

    async getDocumentsSettings(version = DocumentSettingVersion.V1): Promise<DocumentSettingModel[]> {
        return await documentSettingModel.find({ version })
    }

    async getDocumentExpirationTime(type: string, expirationType: ExpirationType, version: DocumentSettingVersion): Promise<number> {
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
