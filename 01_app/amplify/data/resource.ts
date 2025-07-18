import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Aircraft: a.model({
    userId: a.string().required(),
    aircraftId: a.id().required(),
    name: a.string().required(),
    registrationNumber: a.string().required(),
    manufacturer: a.string().required(),
    model: a.string().required(),
    serialNumber: a.string(),
    weight: a.float(),
    maxWeight: a.float(),
    active: a.boolean().default(true),
    notes: a.string(),
  })
    .identifier(['userId', 'aircraftId'])
    .authorization(allow => [allow.owner()]),

  Pilot: a.model({
    userId: a.string().required(),
    pilotId: a.id().required(),
    name: a.string().required(),
    licenseNumber: a.string(),
    email: a.string(),
    phone: a.string(),
    active: a.boolean().default(true),
    notes: a.string(),
  })
    .identifier(['userId', 'pilotId'])
    .authorization(allow => [allow.owner()]),

  FlightLog: a.model({
    userId: a.string().required(),
    flightLogId: a.id().required(),
    aircraftId: a.string().required(),
    pilotId: a.string().required(),
    date: a.date().required(),
    takeoffTime: a.datetime(),
    landingTime: a.datetime(),
    flightDuration: a.integer(),
    takeoffLocationId: a.string(),
    landingLocationId: a.string(),
    purpose: a.string(),
    notes: a.string(),
    weatherConditions: a.string(),
    incidentReport: a.string(),
  })
    .identifier(['userId', 'flightLogId'])
    .authorization(allow => [allow.owner()]),

  FlightLocation: a.model({
    userId: a.string().required(),
    locationId: a.id().required(),
    name: a.string().required(),
    address: a.string().required(),
    lat: a.float().required(),
    lon: a.float().required(),
    tags: a.string().array(),
    usageCount: a.integer().default(0),
    active: a.boolean().default(true),
  })
    .identifier(['userId', 'locationId'])
    .authorization(allow => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});