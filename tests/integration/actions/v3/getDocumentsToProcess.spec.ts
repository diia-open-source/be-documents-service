import { Task } from '@diia-inhouse/diia-queue'
import TestKit from '@diia-inhouse/test'

import GetDocumentsToProcessAction from '@src/actions/v3/getDocumentsToProcess'

import DocumentsEisProvider from '@providers/eis/documentsEis'

import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'
import { getApp } from '@tests/utils/getApp'

import { PassportDocumentType } from '@interfaces/services/passport'

describe(`Action ${GetDocumentsToProcessAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let getDocumentsToProcess: GetDocumentsToProcessAction
    let documentEisProvider: DocumentsEisProvider
    let task: Task

    beforeAll(async () => {
        app = await getApp()

        getDocumentsToProcess = app.container.build(GetDocumentsToProcessAction)
        documentEisProvider = app.container.resolve<DocumentsEisProvider>('documentsEisProvider')
        task = app.container.resolve<Task>('task')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it(`should return ${PassportDocumentType.InternalPassport}`, async () => {
        // Arrange
        const defaultArgs = testKit.session.getUserActionArguments()

        const eisSpy = jest.spyOn(documentEisProvider, 'getPassports').mockResolvedValueOnce(getPassport())

        jest.spyOn(task, 'publish').mockImplementationOnce(async () => true)

        // Act
        const result = await getDocumentsToProcess.handler({
            ...defaultArgs,
            params: { documentTypes: [PassportDocumentType.InternalPassport] },
        })

        // Assert

        expect(eisSpy).toHaveBeenCalledTimes(1)

        expect(result.internalPassport?.data[0]).toBeDefined()
    })

    it(`should return ${PassportDocumentType.ForeignPassport}`, async () => {
        // Arrange
        const defaultArgs = testKit.session.getUserActionArguments()

        const eisSpy = jest.spyOn(documentEisProvider, 'getPassports').mockResolvedValueOnce(getPassport())

        jest.spyOn(task, 'publish').mockImplementationOnce(async () => true)

        // Act
        const result = await getDocumentsToProcess.handler({
            ...defaultArgs,
            params: { documentTypes: [PassportDocumentType.ForeignPassport] },
        })

        // Assert

        expect(eisSpy).toHaveBeenCalledTimes(1)

        expect(result.foreignPassport?.data[0]).toBeDefined()
    })
})
