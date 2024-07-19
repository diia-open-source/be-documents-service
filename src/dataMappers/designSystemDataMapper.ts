import {
    ActionCode,
    FrontCardItem,
    Icon,
    IconAtmActionType,
    Localization,
    TableItemHorizontalMlc,
    TableItemMlc,
    TableItemVerticalMlc,
    TickerAtm,
} from '@diia-inhouse/types'

import { DesignSystemFrontCardParams } from '@interfaces/dataMappers'
import { ComponentIdFrontCard, DocumentMediaAlias } from '@interfaces/services/documents'

export default class DesignSystemDataMapper {
    getFrontCard(
        docName: string,
        docType: string,
        bottomLabel: string,
        tickerAtm: TickerAtm,
        items: TableItemMlc[],
        params: DesignSystemFrontCardParams = {},
    ): FrontCardItem[] {
        const { locale = Localization.UA, withPhoto = true, withEllipseMenu = true, docNumberCopy = false } = params
        const componentIds = this.getComponentIds(locale)

        return [
            {
                docHeadingOrg: {
                    componentId: componentIds[ComponentIdFrontCard.Heading],
                    headingWithSubtitlesMlc: {
                        componentId: componentIds[ComponentIdFrontCard.DocName],
                        value: docName,
                        subtitles: [],
                    },
                },
            },
            withPhoto
                ? {
                      tableBlockTwoColumnsPlaneOrg: {
                          componentId: componentIds[ComponentIdFrontCard.DocData],
                          photo: DocumentMediaAlias.Photo,
                          items,
                      },
                  }
                : {
                      tableBlockPlaneOrg: {
                          componentId: componentIds[ComponentIdFrontCard.DocData],
                          items,
                      },
                  },
            {
                tickerAtm: {
                    ...tickerAtm,
                    componentId: componentIds[ComponentIdFrontCard.Ticker],
                },
            },
            {
                docButtonHeadingOrg: {
                    componentId: componentIds[ComponentIdFrontCard.BottomHeading],
                    ...(docNumberCopy
                        ? {
                              docNumberCopyMlc: {
                                  componentId: componentIds[ComponentIdFrontCard.FullName],
                                  value: bottomLabel,
                                  icon: {
                                      code: Icon.copy,
                                      action: {
                                          type: IconAtmActionType.copy,
                                      },
                                  },
                              },
                          }
                        : {
                              headingWithSubtitlesMlc: {
                                  componentId: componentIds[ComponentIdFrontCard.FullName],
                                  value: bottomLabel,
                                  subtitles: [],
                              },
                          }),
                    ...(withEllipseMenu && {
                        iconAtm: {
                            componentId: componentIds[ComponentIdFrontCard.Icon],
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

    getComponentIds(locale = Localization.UA, postfix?: string): Record<ComponentIdFrontCard, string> {
        const componentIdsData = Object.values(ComponentIdFrontCard).map((name) => [
            name,
            this.getComponentIdWithLocale(name, locale, postfix),
        ])

        return Object.fromEntries(componentIdsData)
    }

    private getComponentIdWithLocale(value: ComponentIdFrontCard, locale: Localization, postfix?: string): string {
        return [value, postfix, locale].filter(Boolean).join('_')
    }
}
