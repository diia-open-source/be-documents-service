import { Logger } from '@diia-inhouse/types'
import { DocumentVisibilitySettingsItem, UserServiceClient } from '@diia-inhouse/user-service-client'

import { CommonDocument } from '@interfaces/services/documents'

export default class UserDocumentSettingsService {
    constructor(
        private readonly logger: Logger,
        private readonly userServiceClient: UserServiceClient,
    ) {}

    async getDocumentVisibilitySettings(userIdentifier: string, documentType: string): Promise<DocumentVisibilitySettingsItem | undefined> {
        const settings = await this.userServiceClient.getUserDocumentSettings({ userIdentifier, features: [] })

        return this.findSettingsByType(settings.documentVisibilitySettings, documentType)
    }

    findSettingsByType(settingItems: DocumentVisibilitySettingsItem[], documentType: string): DocumentVisibilitySettingsItem | undefined {
        return settingItems.find((setting) => setting.documentType === documentType)
    }

    filterDocuments(visibilitySettings: DocumentVisibilitySettingsItem | undefined, items: CommonDocument[]): CommonDocument[] {
        if (!visibilitySettings) {
            return items
        }

        const { hiddenDocuments, documentType } = visibilitySettings

        return items.filter(({ id: documentId }) => {
            if (hiddenDocuments.includes(documentId)) {
                this.logger.info(`Hide document by visibility settings: ${documentType} id: ${documentId}`)

                return false
            }

            return true
        })
    }

    isDocumentTypeHidden(visibilitySettings: DocumentVisibilitySettingsItem | undefined): boolean | undefined {
        if (!visibilitySettings || visibilitySettings.hiddenDocumentType === undefined) {
            return undefined
        }

        return visibilitySettings.hiddenDocumentType
    }

    getHiddenDocuments(visibilitySettings: DocumentVisibilitySettingsItem | undefined): string[] {
        if (!visibilitySettings) {
            return []
        }

        return visibilitySettings.hiddenDocuments
    }
}
