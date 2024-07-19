import GetDocumentTypesAction from '@src/actions/v1/getDocumentTypes'

import { getApp } from '@tests/utils/getApp'

import { PassportDocumentType } from '@interfaces/services/passport'

describe(`Action ${GetDocumentTypesAction.name}`, () => {
    let app: Awaited<ReturnType<typeof getApp>>
    let action: GetDocumentTypesAction

    beforeAll(async () => {
        app = await getApp()

        action = app.container.build(GetDocumentTypesAction)

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    describe('method handler', () => {
        it('should successfully return list of document types', async () => {
            const result = await action.handler()

            expect(result).toMatchObject({
                documentTypes: expect.arrayContaining([PassportDocumentType.InternalPassport, PassportDocumentType.ForeignPassport]),
            })
        })
    })
})
