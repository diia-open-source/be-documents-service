import {
    ActionCode,
    AppUser,
    ArrowedLinkAction,
    ButtonState,
    ListItemMlc,
    Logger,
    OnRegistrationsFinished,
    PlatformAppVersion,
    UserTokenData,
} from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import UserService from '@services/user'

import ManualDocumentsListDataMapper from '@dataMappers/manualDocumentsListDataMapper'

import { AnyDocumentService } from '@interfaces/services/documents'
import {
    ManualDocumentListItem,
    ManualDocumentListItemWithOrder,
    ManualDocumentsListResponse,
    ManualDocumentsListResponseV1,
    ShowInManualListStrategy,
} from '@interfaces/services/manualDocumentsList'
import { DocumentFilter } from '@interfaces/services/user'

export default class ManualDocumentsListService implements OnRegistrationsFinished {
    private readonly showInManualListStrategies: Record<string, ShowInManualListStrategy> = {}

    constructor(
        private readonly logger: Logger,

        private readonly userService: UserService,
        private readonly documentServices: Partial<AnyDocumentService>[],

        private readonly manualDocumentsListDataMapper: ManualDocumentsListDataMapper,
    ) {}

    onRegistrationsFinished(): void {
        for (const service of this.documentServices) {
            const { manualDocumentNames = [], showInManualList } = service

            for (const manualDocumentName of manualDocumentNames) {
                Object.assign(
                    this.showInManualListStrategies,
                    showInManualList ? { [manualDocumentName]: showInManualList.bind(service) } : {},
                )
            }
        }
    }

    async getList(user: UserTokenData, platformAppVersion: PlatformAppVersion): Promise<ManualDocumentsListResponse> {
        const documents = this.manualDocumentsListDataMapper.getActiveManualDocumentsList()
        const filteredDocuments = await this.hideUnavailableDocuments(user, platformAppVersion, documents)

        return {
            contextMenuOrg: {
                listItemGroupOrg: {
                    items: filteredDocuments.map(
                        ({ name, code }): ListItemMlc => ({
                            state: ButtonState.enabled,
                            label: name,
                            action: {
                                type: ArrowedLinkAction.addDocument,
                                subtype: code,
                            },
                        }),
                    ),
                },
                btnWhiteLargeAtm: {
                    state: ButtonState.enabled,
                    label: 'Закрити',
                    action: {
                        type: ActionCode.close,
                    },
                },
            },
        }
    }

    /** @deprecated */
    async getListV1(user: UserTokenData, platformAppVersion: PlatformAppVersion): Promise<ManualDocumentsListResponseV1> {
        const documents = this.manualDocumentsListDataMapper.getActiveManualDocumentsList()
        const filteredDocuments = await this.hideUnavailableDocuments(user, platformAppVersion, documents)

        return { documents: filteredDocuments }
    }

    private async hideUnavailableDocuments(
        user: AppUser,
        platformAppVersion: PlatformAppVersion,
        documents: ManualDocumentListItemWithOrder[],
    ): Promise<ManualDocumentListItem[]> {
        const { identifier: userIdentifier } = user

        const documentsFilteredByService: ManualDocumentListItemWithOrder[] = []

        await Promise.all(
            documents.map(async (document) => {
                let showInList = true
                try {
                    const showInManualList = this.showInManualListStrategies[document.code]

                    if (showInManualList) {
                        showInList = await showInManualList(user, document.code)
                    }
                } catch (err) {
                    this.logger.error('Failed to check is manual document should be showed', { err })

                    return
                }

                if (showInList) {
                    documentsFilteredByService.push(document)
                }
            }),
        )

        const documentsFilteredDefault = utils.filterByAppVersions(documentsFilteredByService, platformAppVersion)
        const hidableDocumentTypes = documentsFilteredDefault.filter((document) => Boolean(document.hiddenIfAnyOfDocumentsOwned))

        if (hidableDocumentTypes.length === 0) {
            return documentsFilteredDefault
        }

        const documentFilters = hidableDocumentTypes.map(({ hiddenIfAnyOfDocumentsOwned = [] }) =>
            hiddenIfAnyOfDocumentsOwned.map((documentType): DocumentFilter => ({ documentType })),
        )

        const { missingDocumnets } = await this.userService.hasDocuments(userIdentifier, documentFilters)

        const documentsToHide = hidableDocumentTypes.filter(({ hiddenIfAnyOfDocumentsOwned = [] }) =>
            hiddenIfAnyOfDocumentsOwned.some((documentType) => !missingDocumnets.includes(documentType)),
        )

        const manualDocumentTypesToHide = documentsToHide.map(({ code }) => code)

        this.logger.info('Manual documents to hide', { documentsToHide: manualDocumentTypesToHide })

        return documentsFilteredDefault
            .filter(({ code }) => !manualDocumentTypesToHide.includes(code))
            .map((document) => this.manualDocumentsListDataMapper.toListItemWithoutMeta(document))
    }
}
