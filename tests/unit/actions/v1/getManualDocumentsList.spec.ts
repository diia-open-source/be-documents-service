import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetManualDocumentsListAction from '@actions/v1/getManualDocumentsList'

import ManualDocumentsListService from '@services/manualDocumentsList'

describe(`Action ${GetManualDocumentsListAction.name}`, () => {
    const testKit = new TestKit()
    const manualDocumentsListService = mockInstance(ManualDocumentsListService)
    const action = new GetManualDocumentsListAction(manualDocumentsListService)

    it('should return manual documents list', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()

        const documents = [
            {
                code: 'code',
                name: 'name',
                isActive: true,
            },
        ]

        jest.spyOn(manualDocumentsListService, 'getListV1').mockResolvedValueOnce({ documents })

        expect(await action.handler({ session, headers })).toMatchObject({ documents })
        expect(manualDocumentsListService.getListV1).toHaveBeenCalledWith(session.user)
    })
})
