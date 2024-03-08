import { AsyncLocalStorage } from 'async_hooks'

import * as compareVersions from 'compare-versions'
import { merge } from 'lodash'
import moment from 'moment'

import { PluginDepsCollection } from '@diia-inhouse/diia-app'

import { InternalServerError } from '@diia-inhouse/errors'
import { AlsData, DocStatus, DocumentType, Localization, PlatformType, TickerAtm, TickerAtmType, TickerAtmUsage } from '@diia-inhouse/types'

import {
    DocumentCover,
    DocumentTicker,
    DocumentTickerCode,
    DocumentTickerParams,
    DocumentTickerPlaceholder,
} from '@interfaces/services/documentAttributes'
import { DocumentAttributesService as DocumentAttributesServiceType } from '@interfaces/services/documents'

export default class DocumentAttributesService {
    private readonly trident = '|_|_|'

    readonly notFoundCover: DocumentCover = {
        title: 'Документ не знайдено 😔',
        text: 'Він відсутній у реєстрі або вже недійсний. Ви не можете користуватися документом у Дії.',
        actionButton: {
            name: 'Видалити документ',
            action: 'deleteDocument',
        },
    }

    private readonly covers: Partial<Record<DocumentType, Partial<Record<DocStatus, DocumentCover>>>> = {
        [DocumentType.InternalPassport]: {},
        [DocumentType.ForeignPassport]: {},
    }

    /** @deprecated */
    private readonly tickersV1: Record<Localization, Partial<Record<DocumentType, Partial<Record<DocumentTickerCode, DocumentTicker>>>>> = {
        [Localization.UA]: {
            [DocumentType.ForeignPassport]: {
                [DocumentTickerCode.ValidOnlyInUkraine]: {
                    type: 'info',
                    text: 'Паспорт в Дії дійсний лише в Україні',
                },
            },
        },
        [Localization.ENG]: {},
    }

    private readonly tickersCommon: Partial<Record<DocumentTickerCode, Record<Localization, TickerAtm>>> = {
        [DocumentTickerCode.UpdatedAt]: {
            [Localization.UA]: {
                usage: TickerAtmUsage.document,
                type: TickerAtmType.positive,
                value: Array(2).fill(`Документ оновлено о {${DocumentTickerPlaceholder.UpdatedAt}}`).join(' • ') + ' • ',
            },
            [Localization.ENG]: {
                usage: TickerAtmUsage.document,
                type: TickerAtmType.positive,
                value: Array(2).fill(`Document updated on {${DocumentTickerPlaceholder.UpdatedAt}}`).join(' • ') + ' • ',
            },
        },
        [DocumentTickerCode.Valid]: {
            [Localization.UA]: {
                usage: TickerAtmUsage.document,
                type: TickerAtmType.positive,
                value: Array(3).fill(`Документ дійсний`).join(' • ') + ' • ',
            },
            [Localization.ENG]: {
                usage: TickerAtmUsage.document,
                type: TickerAtmType.positive,
                value: Array(3).fill(`Document valid`).join(' • ') + ' • ',
            },
        },
        [DocumentTickerCode.UpdatedAtEnUa]: {
            [Localization.UA]: {
                usage: TickerAtmUsage.document,
                type: TickerAtmType.positive,
                value: `Document updated on {${DocumentTickerPlaceholder.UpdatedAt}} • Документ оновлено о {${DocumentTickerPlaceholder.UpdatedAt}} • `,
            },
            [Localization.ENG]: {
                usage: TickerAtmUsage.document,
                type: TickerAtmType.positive,
                value: `Document updated on {${DocumentTickerPlaceholder.UpdatedAt}} • Документ оновлено о {${DocumentTickerPlaceholder.UpdatedAt}} • `,
            },
        },
    }

    private readonly tickers: Partial<Record<DocumentType, Partial<Record<DocumentTickerCode, Partial<Record<Localization, TickerAtm>>>>>> =
        {}

    private readonly documentTypesForPrefixedTrident: Record<PlatformType, DocumentType[]> = {
        [PlatformType.Android]: [DocumentType.ForeignPassport],
        [PlatformType.Huawei]: [DocumentType.ForeignPassport],
        [PlatformType.iOS]: [DocumentType.ForeignPassport],
        [PlatformType.Browser]: [],
    }

    constructor(
        private readonly documentAttributesServices: PluginDepsCollection<DocumentAttributesServiceType>,
        private readonly asyncLocalStorage: AsyncLocalStorage<AlsData>,
    ) {
        this.loadPluginDeps(this.documentAttributesServices.items)
        this.documentAttributesServices.on('newItems', (instances) => this.loadPluginDeps(instances))
    }

    getCover(documentType: DocumentType, docStatus: DocStatus): DocumentCover | undefined {
        return this.covers[documentType]?.[docStatus]
    }

    /** @deprecated */
    getTickerV1(
        documentType: DocumentType,
        code: DocumentTickerCode,
        localization: Localization = Localization.UA,
        templateParams?: Partial<Record<DocumentTickerPlaceholder, string>>,
    ): DocumentTicker | undefined {
        const ticker = this.tickersV1[localization]?.[documentType]?.[code]

        if (ticker && templateParams) {
            return {
                ...ticker,
                text: this.handleTickerValue(ticker.text, templateParams),
            }
        }

        return ticker
    }

    getTicker(params: DocumentTickerParams): TickerAtm {
        const { code, localization = Localization.UA, documentType, templateParams, action } = params

        const ticker = documentType ? this.tickers[documentType]?.[code]?.[localization] : this.tickersCommon?.[code]?.[localization]
        if (!ticker) {
            throw new InternalServerError('Ticker not defined')
        }

        if (templateParams) {
            return {
                ...ticker,
                value: this.handleTickerValue(ticker.value, templateParams),
                action,
            }
        }

        return ticker
    }

    getDefaultTicker(localization: Localization): TickerAtm {
        return this.getTicker({
            code: DocumentTickerCode.UpdatedAt,
            localization,
            templateParams: {
                [DocumentTickerCode.UpdatedAt]: this.getUpdatedAtValue(),
            },
        })
    }

    getUpdatedAtValue(): string {
        return moment().format('HH:mm | DD.MM.YYYY')
    }

    getTrident(documentType: DocumentType): string {
        const store = this.asyncLocalStorage.getStore()

        if (!store || !store.headers) {
            return this.trident
        }

        const {
            headers: { platformType, appVersion },
        } = store

        if (!platformType || !appVersion) {
            return this.trident
        }

        const hackVersions: Record<PlatformType, string | null> = {
            [PlatformType.Android]: '3.0.51.954',
            [PlatformType.Huawei]: '3.0.51.954',
            [PlatformType.iOS]: '3.0.43.906',
            [PlatformType.Browser]: null,
        }

        const hackVersionByPlatform = hackVersions[platformType]

        if (!hackVersionByPlatform) {
            return this.trident
        }

        const hackRequired =
            this.documentTypesForPrefixedTrident[platformType].includes(documentType) &&
            compareVersions.compare(appVersion, hackVersionByPlatform, '>=')

        return hackRequired ? ` ${this.trident}` : this.trident
    }

    private handleTickerValue(text: string, templateParams: Partial<Record<DocumentTickerPlaceholder, string>>): string {
        for (const [placeholder, value] of Object.entries(templateParams)) {
            text = text.replaceAll(`{${placeholder}}`, value)
        }

        return text
    }

    private loadPluginDeps(instances: DocumentAttributesServiceType[]): void {
        instances.forEach((instance) => {
            const { covers = {}, documentTypesForPrefixedTrident = {}, tickers = {}, tickersV1 = {} } = instance

            Object.assign(this.covers, covers)
            Object.assign(this.tickers, tickers)
            merge(this.tickersV1, tickersV1)
            merge(this.documentTypesForPrefixedTrident, documentTypesForPrefixedTrident)
        })
    }
}
