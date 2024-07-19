import { SessionType } from '@diia-inhouse/types'

import GetSortedByDefaultDocumentTypesAction from '@src/actions/v1/getSortedByDefaultDocumentTypes'

import { getApp } from '@tests/utils/getApp'

describe(`Action ${GetSortedByDefaultDocumentTypesAction.name}`, () => {
    let app: Awaited<ReturnType<typeof getApp>>
    let action: GetSortedByDefaultDocumentTypesAction

    beforeAll(async () => {
        app = await getApp()

        action = app.container.build(GetSortedByDefaultDocumentTypesAction)

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    describe('method handler', () => {
        it('should successfully return sorted by default document types', async () => {
            const result = await action.handler()

            expect({
                sortedDocumentTypes: {
                    [SessionType.EResident]: { items: [] },
                    ...result.sortedDocumentTypes,
                },
            }).toEqual({
                sortedDocumentTypes: {
                    [SessionType.EResident]: { items: expect.any(Array) },
                    [SessionType.User]: { items: expect.any(Array) },
                },
            })
        })
    })
})
