'use strict'

process.env['DEEL_BE_TEMPLATE_STORAGE'] = process.env['DEEL_BE_TEMPLATE_STORAGE'] || './database-test.sqlite3'

const supertest = require('supertest');
const app = require('../src/app');
const { Profile, Contract, Job } = require('../src/model');

describe('HTTP API', () => {

  beforeAll(async () => {
    await Profile.sync({ force: true });
    await Contract.sync({ force: true });
    await Job.sync({ force: true });
  })

  it('tests nothing', () => {})

})
