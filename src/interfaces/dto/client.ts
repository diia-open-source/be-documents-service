export interface IdWithValue {
    ID: number | string | null
    VALUE: string | null
}

export interface Client {
    clientId: number
    country: IdWithValue
    sex: IdWithValue
    person: IdWithValue
    lastNameUA: string
    firstNameUA: string
    middleNameUA: string
    lastNameRU: string
    firstNameRU: string
    middleNameRU: string
    lastNameEN: string
    firstNameEN: string
    middleNameEN: string
    inn: number
    innChar: string
    birthday: string
}

export interface ClientAddress {
    claddrId: number
    clientId: number
    addressType: IdWithValue
    isReal: string
    addressId: number
    city: IdWithValue
    cityType: IdWithValue
    region: string
    distr: string | null
    distrCity: string | null
    streetType: IdWithValue
    street: string | null
    postalCode: string | null
    corps: string | null
    isDirty: string
    address: string
    country: IdWithValue
    nhouse: string | null
    shouse: string | null
    nflat: string | null
    sflat: string | null
}
