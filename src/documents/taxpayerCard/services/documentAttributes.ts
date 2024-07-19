import { DocStatus, Localization, TickerAtm, TickerAtmType, TickerAtmUsage } from '@diia-inhouse/types'

import { DocumentType } from '@src/documents/taxpayerCard/interfaces/services'

import { DocumentCover, DocumentTicker, DocumentTickerCode, DocumentTickerPlaceholder } from '@interfaces/services/documentAttributes'
import { DocumentAttributesService } from '@interfaces/services/documents'

export default class TaxpayerCardAttributesService implements DocumentAttributesService {
    readonly covers: Partial<Record<DocumentType, Partial<Record<DocStatus, DocumentCover>>>> = {
        [DocumentType.TaxpayerCard]: {
            [DocStatus.Confirming]: {
                title: 'Ваш документ проходить верифікацію 😔',
                text: 'Ми перевіряємо РНОКПП, отриманий від вашого банку, з даними у реєстрах Державної податкової служби.',
            },
            [DocStatus.NotConfirmed]: {
                title: 'У ваших даних є помилка 😔',
                text: 'Будь ласка, зверніться до банку, за яким ви авторизувалися в Дії, для перевірки даних. Якщо в банку всі дані правильні — зверніться до Державної податкової служби за місцем реєстрації проживання.',
            },
        },
    }

    readonly tickers: Partial<Record<DocumentType, Partial<Record<DocumentTickerCode, Partial<Record<Localization, TickerAtm>>>>>> = {
        [DocumentType.TaxpayerCard]: {
            [DocumentTickerCode.Valid]: {
                [Localization.UA]: {
                    usage: TickerAtmUsage.document,
                    type: TickerAtmType.positive,
                    value: `Документ оновлено о {${DocumentTickerPlaceholder.UpdatedAt}} • Перевірено Державною податковою службою • `,
                },
            },
        },
    }

    /** @deprecated */
    readonly tickersV1: Record<Localization, Partial<Record<DocumentType, Partial<Record<DocumentTickerCode, DocumentTicker>>>>> = {
        [Localization.UA]: {
            [DocumentType.TaxpayerCard]: {
                [DocumentTickerCode.Valid]: {
                    type: 'info',
                    text: 'РНОКПП дійсний. Перевірено Державною податковою службою',
                },
            },
        },
        [Localization.ENG]: {},
    }
}
