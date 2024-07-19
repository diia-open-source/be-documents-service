import TestKit from '@diia-inhouse/test'

import GetDocumentNamesAction from '@src/actions/v1/getDocumentNames'

import { getApp } from '@tests/utils/getApp'

describe(`Action ${GetDocumentNamesAction.name}`, () => {
    let app: Awaited<ReturnType<typeof getApp>>
    let action: GetDocumentNamesAction
    const testKit = new TestKit()

    beforeAll(async () => {
        app = await getApp()

        action = app.container.build(GetDocumentNamesAction)

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    describe('method handler', () => {
        it('should successfully return document type to name records', async () => {
            const result = await action.handler({
                headers: testKit.session.getHeaders(),
                params: { documentTypes: [] },
            })

            expect(result).toMatchObject({
                documentTypeToName: {
                    'internal-passport': 'Паспорт громадянина України',
                    'foreign-passport': 'Закордонний паспорт',
                    'taxpayer-card': 'РНОКПП',
                },
            })
        })
    })
})
