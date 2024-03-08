import { randomUUID } from 'crypto'

import DiiaLogger from '@diia-inhouse/diia-logger'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocStatus, DocumentType, HttpStatusCode } from '@diia-inhouse/types'

import AnalyticsService from '@src/services/analytics'

import PluginDepsCollectionMock, { getDocumentAnalyticsService } from '@mocks/stubs/documentDepsCollection'

import { AppConfig } from '@interfaces/config'
import { AnalyticsActionResult, DocumentAnalyticsCategory } from '@interfaces/services'
import { Document } from '@interfaces/services/documents'

describe('AnalyticsService', () => {
    const configMock = <AppConfig>(<unknown>{
        app: {
            dateFormat: 'DD.MM.YYYY',
        },
    })
    const loggerMock = mockInstance(DiiaLogger)
    const analyticsService = new AnalyticsService(loggerMock, configMock, new PluginDepsCollectionMock([getDocumentAnalyticsService()]))

    const testKit = new TestKit()

    describe('method: `getActionResultByStatusCode`', () => {
        it.each([
            [AnalyticsActionResult.Success, HttpStatusCode.OK],
            [AnalyticsActionResult.NotFound, HttpStatusCode.NOT_FOUND],
            [AnalyticsActionResult.NotConfirmed, HttpStatusCode.FORBIDDEN],
            [AnalyticsActionResult.Error, HttpStatusCode.BAD_REQUEST],
        ])('should return %s for %s', (analyticsActionResult, httpStatusCode) => {
            expect(analyticsService.getActionResultByStatusCode(<number>httpStatusCode)).toBe(analyticsActionResult)
        })
    })

    describe('method: `getActionResultByDocStatus`', () => {
        it.each([
            [DocStatus.Ok, AnalyticsActionResult.Success],
            [DocStatus.OldModel, AnalyticsActionResult.OldModel],
            [DocStatus.AdditionalVerification, AnalyticsActionResult.NeedVerification],
            [DocStatus.NoPhoto, AnalyticsActionResult.NoPhoto],
            [DocStatus.Confirming, AnalyticsActionResult.Confirming],
            [DocStatus.NotConfirmed, AnalyticsActionResult.NotConfirmed],
            [DocStatus.Inactive, AnalyticsActionResult.Inactive],
        ])('should return %s for %s', (docStatus, analyticsActionResult) => {
            expect(analyticsService.getActionResultByDocStatus(docStatus)).toBe(analyticsActionResult)
        })
    })

    describe('method: `getActionResult`', () => {
        it('should return error for both undefined parameters', () => {
            expect(analyticsService.getActionResult(undefined, undefined)).toBe(AnalyticsActionResult.Error)
        })
    })

    describe('method: `logDocumentAnalytics`', () => {
        it('should call logger.info with given document information', () => {
            const { user } = testKit.session.getUserSession()
            const headers = testKit.session.getHeaders()
            const document = {
                id: randomUUID(),
                docSubtype: 'subtype',
                expirationDate: '2050-11-03',
            }

            analyticsService.logDocumentAnalytics({
                documentType: <DocumentType>'document-type',
                document: <Document>document,
                userIdentifier: user.identifier,
                headers,
                statusCode: undefined,
                documentId: undefined,
                data: undefined,
                category: DocumentAnalyticsCategory.GetDocuments,
            })

            expect(loggerMock.info).toHaveBeenCalledWith(expect.any(String), {
                analytics: expect.objectContaining({
                    data: expect.objectContaining({
                        documentId: document.id,
                        subtype: document.docSubtype,
                        expirationDate: document.expirationDate,
                    }),
                }),
            })
        })

        it('should call logger.info with given document information with expiration date which is present inside docData', () => {
            const { user } = testKit.session.getUserSession()
            const headers = testKit.session.getHeaders()
            const document = {
                id: randomUUID(),
                docSubtype: 'subtype',
                expirationDate: '2050-11-03',
            }

            analyticsService.logDocumentAnalytics({
                documentType: <DocumentType>'document-type',
                document: <Document>(<unknown>{ ...document, docData: { expirationDate: document.expirationDate } }),
                userIdentifier: user.identifier,
                headers,
                statusCode: undefined,
                documentId: undefined,
                data: undefined,
                category: DocumentAnalyticsCategory.GetDocuments,
            })

            expect(loggerMock.info).toHaveBeenCalledWith(expect.any(String), {
                analytics: expect.objectContaining({
                    data: expect.objectContaining({
                        documentId: document.id,
                        subtype: document.docSubtype,
                        expirationDate: document.expirationDate,
                    }),
                }),
            })
        })

        it('should call logger.info with given documentId', () => {
            const { user } = testKit.session.getUserSession()
            const headers = testKit.session.getHeaders()
            const document = <Document>{
                id: randomUUID(),
                docSubtype: 'subtype',
                expirationDate: '2050-11-03',
            }

            analyticsService.logDocumentAnalytics({
                documentType: <DocumentType>'document-type',
                document: undefined,
                userIdentifier: user.identifier,
                headers,
                statusCode: undefined,
                documentId: document.id,
                data: undefined,
                category: DocumentAnalyticsCategory.GetDocuments,
            })

            expect(loggerMock.info).toHaveBeenCalledWith(expect.any(String), {
                analytics: expect.objectContaining({
                    data: {
                        documentId: document.id,
                    },
                }),
            })
        })

        it('should call logger.info with given data', () => {
            const { user } = testKit.session.getUserSession()
            const headers = testKit.session.getHeaders()
            const data = {
                documentId: randomUUID(),
            }

            analyticsService.logDocumentAnalytics({
                documentType: <DocumentType>'document-type',
                document: undefined,
                userIdentifier: user.identifier,
                headers,
                statusCode: undefined,
                documentId: undefined,
                data,
                category: DocumentAnalyticsCategory.GetDocuments,
            })

            expect(loggerMock.info).toHaveBeenCalledWith(expect.any(String), {
                analytics: expect.objectContaining({
                    data,
                }),
            })
        })
    })
})
