import { ObjectId } from 'bson'

import { MoleculerService } from '@diia-inhouse/diia-app'

import { mockInstance } from '@diia-inhouse/test'
import { ActionVersion } from '@diia-inhouse/types'

import AddressService from '@services/address'

describe(`Service ${AddressService.name}`, () => {
    const moleculerService = mockInstance(MoleculerService)

    const service = new AddressService(moleculerService)

    describe(`method: ${service.findCommunityCodeByKoatuu.name}`, () => {
        it('should return community code by koatuu', async () => {
            const koatuu = 'koatuu'
            const communityCode = 'code'

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(communityCode)

            expect(await service.findCommunityCodeByKoatuu(koatuu)).toBe(communityCode)
            expect(moleculerService.act).toHaveBeenCalledWith(
                'Address',
                { name: 'findCommunityCodeByKoatuu', actionVersion: ActionVersion.V1 },
                { params: { koatuu } },
            )
        })
    })

    describe(`method: ${service.findCommunityCodeByKodificatorCode.name}`, () => {
        it('should return community code by kodificatorCode', async () => {
            const kodificatorCode = 'koatuu'
            const communityCode = 'code'

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(communityCode)

            expect(await service.findCommunityCodeByKodificatorCode(kodificatorCode)).toBe(communityCode)
            expect(moleculerService.act).toHaveBeenCalledWith(
                'Address',
                { name: 'findCommunityCodeByKodificatorCode', actionVersion: ActionVersion.V1 },
                { params: { kodificatorCode } },
            )
        })
    })

    describe(`method: ${service.findCodifierCodeByKoatuu.name}`, () => {
        it('should return codifier code by koatuu', async () => {
            const koatuu = 'koatuu'
            const codifierCode = 'code'

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(codifierCode)

            expect(await service.findCodifierCodeByKoatuu(koatuu)).toBe(codifierCode)
            expect(moleculerService.act).toHaveBeenCalledWith(
                'Address',
                { name: 'findCodifierCodeByKoatuu', actionVersion: ActionVersion.V1 },
                { params: { koatuu } },
            )
        })
    })

    describe(`method: ${service.findCodifierByKoatuu.name}`, () => {
        it('should return codifier info', async () => {
            const codifier = {
                name: 'name',
                categoryId: new ObjectId(),
                level: 'level',
                koatuu: ['1'],
            }
            const koatuu = 'koatuu'

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(codifier)

            expect(await service.findCodifierByKoatuu(koatuu)).toMatchObject(codifier)
            expect(moleculerService.act).toHaveBeenCalledWith(
                'Address',
                { name: 'findCodifierByKoatuu', actionVersion: ActionVersion.V1 },
                { params: { koatuu } },
            )
        })
    })
})
