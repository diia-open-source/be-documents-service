import TestKit, { mockInstance } from '@diia-inhouse/test'

import HasValidTaxpayerCardAction from '@src/documents/taxpayerCard/actions/v1/hasValidTaxpayerCard'
import TaxpayerCardService from '@src/documents/taxpayerCard/services/document'

describe(`Action ${HasValidTaxpayerCardAction.name}`, () => {
    const testKit = new TestKit()
    const taxpayerCardService = mockInstance(TaxpayerCardService)
    const action = new HasValidTaxpayerCardAction(taxpayerCardService)

    it('should return true if has valid taxpayer card', async () => {
        const { headers, session } = testKit.session.getUserActionArguments()
        const args = {
            session,
            headers,
        }

        const taxpayerCard = testKit.docs.getTaxpayerCard()

        jest.spyOn(taxpayerCardService, 'getValidTaxpayerCard').mockResolvedValueOnce(taxpayerCard)

        expect(await action.handler(args)).toBeTruthy()
        expect(taxpayerCardService.getValidTaxpayerCard).toHaveBeenCalledWith(args.session.user)
    })
})
