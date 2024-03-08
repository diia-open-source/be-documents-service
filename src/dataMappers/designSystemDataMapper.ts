import { PluginDepsCollection } from '@diia-inhouse/diia-app'

import {
    ActionCode,
    DocumentTypeCamelCase,
    FrontCardItem,
    Icon,
    IconAtmActionType,
    Localization,
    TableItemHorizontalMlc,
    TableItemMlc,
    TableItemVerticalMlc,
    TickerAtm,
} from '@diia-inhouse/types'

import { DocumentDesignSystemDataMapper } from '@interfaces/dataMappers'
import { ComponentIdFrontCard, DocumentMediaAlias } from '@interfaces/services/documents'

export default class DesignSystemDataMapper {
    private readonly docTypeToComponentDocumentName: Partial<Record<DocumentTypeCamelCase, string>> = {}

    constructor(private readonly documentDesignSystemDataMappers: PluginDepsCollection<DocumentDesignSystemDataMapper>) {
        this.loadPluginDeps(this.documentDesignSystemDataMappers.items)
        this.documentDesignSystemDataMappers.on('newItems', (instances) => this.loadPluginDeps(instances))
    }

    getFrontCardWithPhotoDefault(
        docName: string,
        docType: DocumentTypeCamelCase,
        fullName: string,
        tickerAtm: TickerAtm,
        items: TableItemMlc[],
        locale = Localization.UA,
        isVerification = false,
    ): FrontCardItem[] {
        return [
            {
                docHeadingOrg: {
                    componentId: this.getComponentIdWithLocale(
                        ComponentIdFrontCard.Heading,
                        locale,
                        this.docTypeToComponentDocumentName[docType],
                    ),
                    headingWithSubtitlesMlc: {
                        componentId: this.getComponentIdWithLocale(
                            ComponentIdFrontCard.DocName,
                            locale,
                            this.docTypeToComponentDocumentName[docType],
                        ),
                        value: docName,
                        subtitles: [],
                    },
                },
            },
            {
                tableBlockTwoColumnsPlaneOrg: {
                    componentId: this.getComponentIdWithLocale(
                        ComponentIdFrontCard.DocData,
                        locale,
                        this.docTypeToComponentDocumentName[docType],
                    ),
                    photo: DocumentMediaAlias.Photo,
                    items,
                },
            },
            {
                tickerAtm: {
                    ...tickerAtm,
                    componentId: this.getComponentIdWithLocale(
                        ComponentIdFrontCard.Ticker,
                        locale,
                        this.docTypeToComponentDocumentName[docType],
                    ),
                },
            },
            {
                docButtonHeadingOrg: {
                    componentId: this.getComponentIdWithLocale(
                        ComponentIdFrontCard.BottomHeading,
                        locale,
                        this.docTypeToComponentDocumentName[docType],
                    ),
                    headingWithSubtitlesMlc: {
                        componentId: this.getComponentIdWithLocale(
                            ComponentIdFrontCard.FullName,
                            locale,
                            this.docTypeToComponentDocumentName[docType],
                        ),
                        value: fullName,
                        subtitles: [],
                    },
                    ...(!isVerification && {
                        iconAtm: {
                            componentId: this.getComponentIdWithLocale(
                                ComponentIdFrontCard.Icon,
                                locale,
                                this.docTypeToComponentDocumentName[docType],
                            ),
                            code: Icon.ellipseKebab,
                            accessibilityDescription: docType,
                            action: {
                                type: IconAtmActionType.ellipseMenu,
                                subtype: docType,
                            },
                        },
                    }),
                },
            },
        ]
    }

    getFrontCardDefault(
        docName: string,
        docType: DocumentTypeCamelCase,
        fullName: string,
        tickerAtm: TickerAtm,
        items: TableItemMlc[],
        isVerification = false,
    ): FrontCardItem[] {
        return [
            {
                docHeadingOrg: {
                    headingWithSubtitlesMlc: {
                        value: docName,
                        subtitles: [],
                    },
                },
            },
            {
                tableBlockPlaneOrg: {
                    items,
                },
            },
            { tickerAtm },
            {
                docButtonHeadingOrg: {
                    headingWithSubtitlesMlc: {
                        value: fullName,
                        subtitles: [],
                    },
                    ...(!isVerification && {
                        iconAtm: {
                            code: Icon.ellipseKebab,
                            accessibilityDescription: docType,
                            action: {
                                type: IconAtmActionType.ellipseMenu,
                                subtype: docType,
                            },
                        },
                    }),
                },
            },
        ]
    }

    getTableItemHorizontalWithCopyAction(value: string, label: string, secondaryLabel?: string): TableItemHorizontalMlc {
        return {
            label,
            secondaryLabel,
            value,
            icon: {
                code: ActionCode.copy,
                action: {
                    type: IconAtmActionType.copy,
                },
            },
        }
    }

    getTableItemVerticalWithCopyAction(value: string, label?: string, secondaryLabel?: string): TableItemVerticalMlc {
        return {
            label,
            secondaryLabel,
            value,
            icon: {
                code: ActionCode.copy,
                action: {
                    type: IconAtmActionType.copy,
                },
            },
            valueIcons: [],
            valueImages: [],
        }
    }

    getComponentIdWithLocale(value: ComponentIdFrontCard, locale: Localization, docName?: string): string {
        return [value, docName, locale].filter(Boolean).join('_')
    }

    private loadPluginDeps(instances: DocumentDesignSystemDataMapper[]): void {
        instances.forEach((instance) => {
            const { documentTypeToComponentDocumentName = {} } = instance

            Object.assign(this.docTypeToComponentDocumentName, documentTypeToComponentDocumentName)
        })
    }
}
