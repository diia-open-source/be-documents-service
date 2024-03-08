import moment from 'moment'

import { IdentifierService } from '@diia-inhouse/crypto'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { BadRequestError, InternalServerError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { AuthDocumentType, DocumentType } from '@diia-inhouse/types'

import Utils from '@src/utils'

import { AppConfig } from '@interfaces/config'

type FullName = {
    lastName: string
    firstName: string
    middleName?: string
}

describe('Utils', () => {
    const testKit = new TestKit()
    const loggerMock = mockInstance(DiiaLogger)
    const identifierService = new IdentifierService({ salt: 'salt' })
    const config = <AppConfig>{
        app: {
            dateFormat: 'DD.MM.YYYY',
            dateLocale: 'uk',
        },
    }

    const appUtils = new Utils(config, loggerMock, identifierService)

    moment.updateLocale(config.app.dateLocale, {
        months: 'Січня_Лютого_Березня_Квітня_Травня_Червня_Липня_Серпня_Вересня_Жовтня_Листопада_Грудня'.split('_'),
    })

    describe('convertDate', () => {
        it.each([
            ['empty string was passed', '', undefined],
            ['not valid date string was passed', '33-18.2024', undefined],
            ['fromFormat is not specified and date string format cannot be parsed', '14 Січ 1995', undefined],
            ['date string format does not match fromFormat', '12/25/2023', { fromFormat: 'DD.MM.YYYY' }],
        ])('should return undefined if %s', (_msg, date, ops) => {
            const result = appUtils.convertDate(date, ops)

            expect(result).toBeUndefined()
        })

        it.each([
            ['to format specified in config if toFormat is not specified', '2011-11-22', undefined, '22.11.2011'],
            ['to specified format', '2013-11-22', { toFormat: 'MM/DD/YY' }, '11/22/13'],
            ['to specified format and use locale from config if it is not specified', '2013-11-22', { toFormat: 'll' }, '22 лист 2013 р.'],
            ['to specified format and use specified locale', '2013-11-22', { toFormat: 'll', locale: 'de' }, '22. Nov. 2013'],
        ])('should convert date %s', (_msg, date, ops, expected) => {
            const result = appUtils.convertDate(date, ops)

            expect(result).toBe(expected)
        })
    })

    describe('throwInternalExceptionOnError', () => {
        it('should log error and throw InternalServerError', () => {
            const error = new Error('Mocked error')

            const loggerSpy = jest.spyOn(loggerMock, 'error')

            expect(() => appUtils.throwInternalExceptionOnError(error)).toThrow(new InternalServerError())
            expect(loggerSpy).toHaveBeenCalledWith('Internal error occured: ', error)
        })
    })

    describe('generateRandomNumber', () => {
        it.each([
            [0, 1],
            [-100, 100],
            [-1000, -100],
            [100, 1500],
            [2000, 3000000],
        ])('should return random number between %d and %d', (min, max) => {
            const result = appUtils.generateRandomNumber(min, max)

            expect(result).toEqual(expect.any(Number))
            expect(result).toBeGreaterThanOrEqual(min)
            expect(result).toBeLessThanOrEqual(max)
        })
    })

    describe('collectRepresentative', () => {
        it.each([
            ['without document', testKit.session.getUserSession().user, {}],
            [
                `with document if its type is ${AuthDocumentType.IdCard}`,
                testKit.session.getUserSession({ document: { type: AuthDocumentType.IdCard, value: '987654321' } }).user,
                { document: '987654321' },
            ],
            [
                `with document if its type is ${AuthDocumentType.PaperInternalPassport}`,
                testKit.session.getUserSession({ document: { type: AuthDocumentType.IdCard, value: '087654321' } }).user,
                { document: '087654321' },
            ],
            [
                `with document if user has passport number and no document`,
                testKit.session.getUserSession({ passport: '910283746', document: undefined }).user,
                { document: '910283746' },
            ],
            [
                `with document if user has passport serie and number and no document`,
                testKit.session.getUserSession({ passport: 'ае789321', document: undefined }).user,
                { document: 'ае789321' },
            ],
        ])('should return representative %s', (_msg, user, expectedModifier) => {
            const { itn, fName, mName, lName } = user
            const expected = { rnokpp: itn, firstname: fName, middlename: mName, lastname: lName, ...expectedModifier }

            const result = appUtils.collectRepresentative(user)

            expect(result).toEqual(expected)
        })
    })

    describe('collectPerson', () => {
        it.each([
            ['without document', testKit.session.getUserSession().user, {}],
            [
                `with document if its type is ${AuthDocumentType.IdCard}`,
                testKit.session.getUserSession({ document: { type: AuthDocumentType.IdCard, value: '987654321' } }).user,
                { document: '987654321' },
            ],
            [
                `with document if its type is ${AuthDocumentType.PaperInternalPassport}`,
                testKit.session.getUserSession({ document: { type: AuthDocumentType.IdCard, value: '087654321' } }).user,
                { document: '087654321' },
            ],
            [
                `with document if user has passport number and no document`,
                testKit.session.getUserSession({ passport: '910283746', document: undefined }).user,
                { document: '910283746' },
            ],
            [
                `with document if user has passport serie and number and no document`,
                testKit.session.getUserSession({ passport: 'ае789321', document: undefined }).user,
                { document: 'ае789321' },
            ],
        ])('should return person %s', (_msg, user, expectedModifier) => {
            const { itn } = user
            const expected = { rnokpp: itn, ...expectedModifier }

            const result = appUtils.collectPerson(user)

            expect(result).toEqual(expected)
        })
    })

    describe('isFutureDate', () => {
        it.each([
            [false, 'date is not valid', '22-12.2023'],
            [true, 'date is future', moment().add(5, 'days').format('YYYY-MM-DD')],
            [false, 'date is future', moment().subtract(3, 'days').format('YYYY-MM-DD')],
        ])('should return %s if %s', (expected, _msg, date) => {
            const result = appUtils.isFutureDate(date)

            expect(result).toEqual(expected)
        })
    })

    describe('isExpiredDate', () => {
        it.each([
            [false, 'date is not valid', '22-12.2023'],
            [false, 'date is future', moment().add(7, 'days').format('YYYY-MM-DD')],
            [true, 'date is future', moment().subtract(4, 'days').format('YYYY-MM-DD')],
        ])('should return %s if %s', (expected, _msg, date) => {
            const result = appUtils.isExpiredDate(date)

            expect(result).toEqual(expected)
        })
    })

    describe('isValidDate', () => {
        it.each([
            [false, 'date is not valid', '22-12.2023'],
            [true, 'date is valid', '2010-11-12'],
        ])('should return %s if %s', (expected, _msg, date) => {
            const result = appUtils.isValidDate(date)

            expect(result).toEqual(expected)
        })
    })

    describe('getAge', () => {
        it('should throw error if date string is not valid', () => {
            expect(() => appUtils.getAge('12/30/2010')).toThrow(new Error('Invalid user birthday'))
        })

        it.each([
            [59, 'date with default format is passed', moment().subtract(59, 'years').format('DD.MM.YYYY'), undefined],
            [63, 'date with custom format is passed', moment().subtract(63, 'years').format('MM/DD/YYYY'), 'MM/DD/YYYY'],
        ])('should return %i when %s', (expected, _msg, date, format) => {
            const result = appUtils.getAge(date, format)

            expect(result).toBe(expected)
        })
    })

    describe('assertObjectHasOnlyOneOf', () => {
        it('should throw error if object has more than one of keys', () => {
            const obj = { a: 'a', b: 'b', c: 'c', d: 'd' }
            const keys = ['b', 'd']

            expect(() => appUtils.assertObjectHasOnlyOneOf(obj, 'b', 'd')).toThrow(
                new BadRequestError(`Expected to have only one of [${keys.join(', ')}]`),
            )
        })

        it('should throw error if object has no any of keys', () => {
            const obj = { a: 'a', f: 'f', c: 'c', e: 'e' }
            const keys = ['b', 'd']

            expect(() => appUtils.assertObjectHasOnlyOneOf(obj, <keyof typeof obj>'b', <keyof typeof obj>'d')).toThrow(
                new BadRequestError(`Expected to have one of [${keys.join(', ')}]`),
            )
        })

        it('should return undefined if object has one of keys', () => {
            const obj = { a: 'a', b: 'b', c: 'c', f: 'f' }

            const result = appUtils.assertObjectHasOnlyOneOf(obj, 'b', <keyof typeof obj>'d')

            expect(result).toBeUndefined()
        })
    })

    describe('createFullNameHash', () => {
        const latinAlphabet = 'abcdefghijklmnopqrstuvwxyz'
        const cyrillicAlphabet = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'
        const ukrainianAlphabet = 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'
        const ukrainianCharsFromCyrillic = 'абвгдежзийклмнопрстуфхцчшщьюя'
        const symbols = ' \'"’()[]{}<>:,―!.«»-‐?‘’;/⁄&@*\\/•^¡¿¬#№%¶′§~'

        it.each([
            [
                {
                    lastName: 'Левченко - Пономаренко',
                    firstName: "Мар'яна",
                },
                'левченкопономаренкомаряна',
            ],
            [
                {
                    lastName: 'Левченко - Пономаренко',
                    firstName: "Мар'яна",
                    middleName: 'Олександрівна',
                },
                'левченкопономаренкомарянаолександрівна',
            ],
            [
                {
                    lastName: 'Дія',
                    firstName: 'Надія',
                    middleName: 'Володимирівна',
                },
                'діянадіяволодимирівна',
            ],
            [
                {
                    lastName: `${cyrillicAlphabet}${cyrillicAlphabet.toUpperCase()}`,
                    firstName: `${latinAlphabet}${latinAlphabet.toUpperCase()}`,
                    middleName: `${ukrainianAlphabet}${ukrainianAlphabet.toUpperCase()}${symbols}`,
                },
                `${ukrainianCharsFromCyrillic}${ukrainianCharsFromCyrillic}${ukrainianAlphabet}${ukrainianAlphabet}`,
            ],
        ])(
            'full name %p should create hash from prepared full name %s',
            ({ lastName, firstName, middleName }: FullName, preparedFullName: string) => {
                // Act
                const hash: string = appUtils.createFullNameHash(lastName, firstName, middleName)

                // Assert
                const fullNameIdentifier = identifierService.createIdentifier(preparedFullName)

                expect(hash).toEqual(fullNameIdentifier)
            },
        )
    })

    describe('getStorageDataByDocumentTypes', () => {
        it.each([
            ['empty array if document type was not passed', undefined, {}, []],
            ['empty array if storage data was not passed', DocumentType.InternalPassport, undefined, []],
            ['empty array if document type and storage data were not passed', undefined, undefined, []],
            ['empty array if data was not found by document type', DocumentType.InternalPassport, {}, []],
        ])('should return %s', (_msg, documentType, storageData, expected) => {
            const result = appUtils.getStorageDataByDocumentTypes(documentType, storageData)

            expect(result).toEqual(expected)
        })
    })
})
