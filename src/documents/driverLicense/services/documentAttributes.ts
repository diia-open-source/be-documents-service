import { DocStatus, DocumentType, Localization, PlatformType, TickerAtm, TickerAtmType, TickerAtmUsage } from '@diia-inhouse/types'

import { DocumentCover, DocumentTicker, DocumentTickerCode, DocumentTickerPlaceholder } from '@interfaces/services/documentAttributes'
import { DocumentAttributesService } from '@interfaces/services/documents'

export default class DriverLicenseAttributesService implements DocumentAttributesService {
    readonly covers: Partial<Record<DocumentType, Partial<Record<DocStatus, DocumentCover>>>> = {
        [DocumentType.DriverLicense]: {
            [DocStatus.NoPhoto]: {
                title: 'Відсутнє фото в реєстрі 😔',
                text: 'Запишіться в електронну чергу, щоб додати або оновити фото.',
                actionButton: {
                    name: 'Записатися',
                    action: 'inLine',
                },
            },
            [DocStatus.AdditionalVerification]: {
                title: 'Документ потребує верифікації 😔',
                text: 'Перейдіть до кабінету водія та заповніть онлайн-форму.',
                actionButton: {
                    name: 'До кабінету водія',
                    action: 'toDriverAccount',
                },
            },
            [DocStatus.OldModel]: {
                title: 'Документ старого зразка 😔',
                text: 'Запишіться в електронну чергу, щоб його оновити та додати до застосунку.',
                actionButton: {
                    name: 'Записатися',
                    action: 'inLine',
                },
            },
            [DocStatus.Inactive]: {
                title: 'Термін дії посвідчення закінчився 😔',
                text: 'Ви можете отримати нове водійське посвідчення і видалити цей документ.',
                actionButton: {
                    name: 'Видалити документ',
                    action: 'deleteDocument',
                },
            },
        },
    }

    readonly documentTypesForPrefixedTrident: Partial<Record<PlatformType, DocumentType[]>> = {
        [PlatformType.Android]: [DocumentType.DriverLicense],
        [PlatformType.Huawei]: [DocumentType.DriverLicense],
    }

    readonly tickers: Partial<Record<DocumentType, Partial<Record<DocumentTickerCode, Partial<Record<Localization, TickerAtm>>>>>> = {
        [DocumentType.DriverLicense]: {
            [DocumentTickerCode.ValidUntil]: {
                [Localization.UA]: {
                    usage: TickerAtmUsage.document,
                    type: TickerAtmType.positive,
                    value: `Дійсне до {${DocumentTickerPlaceholder.ValidUntil}} • Документ оновлено о {${DocumentTickerPlaceholder.UpdatedAt}} • `,
                },
                [Localization.ENG]: {
                    usage: TickerAtmUsage.document,
                    type: TickerAtmType.positive,
                    value: `Valid until {${DocumentTickerPlaceholder.ValidUntil}} • Document updated on {${DocumentTickerPlaceholder.UpdatedAt}} • `,
                },
            },
        },
    }

    /** @deprecated */
    readonly tickersV1: Record<Localization, Partial<Record<DocumentType, Partial<Record<DocumentTickerCode, DocumentTicker>>>>> = {
        [Localization.UA]: {
            [DocumentType.DriverLicense]: {
                [DocumentTickerCode.ValidUntil]: {
                    type: 'info',
                    text: `Дійсне до {${DocumentTickerPlaceholder.ValidUntil}} • УКРАЇНА • Дійсне до {${DocumentTickerPlaceholder.ValidUntil}} • УКРАЇНА • `,
                },
            },
        },
        [Localization.ENG]: {
            [DocumentType.DriverLicense]: {
                [DocumentTickerCode.ValidUntil]: {
                    type: 'info',
                    text: `Valid until {${DocumentTickerPlaceholder.ValidUntil}} • UKRAINE • Valid until {${DocumentTickerPlaceholder.ValidUntil}} • UKRAINE • `,
                },
            },
        },
    }
}
