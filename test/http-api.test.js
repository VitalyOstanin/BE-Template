'use strict'

process.env['DEEL_BE_TEMPLATE_STORAGE'] = process.env['DEEL_BE_TEMPLATE_STORAGE'] || './database-test.sqlite3'

const supertest = require('supertest');
const app = require('../src/app');
const request = supertest(app);
const { Profile, Contract, Job } = require('../src/model');

describe
describe('HTTP API', () => {

  beforeAll(async () => {
    await Profile.sync({ force: true });
    await Contract.sync({ force: true });
    await Job.sync({ force: true });
  })

  describe('contracts', () => {
    it('should return own contract', async () => {
      const [
        client1,
        contractor1,
      ] = await Profile.bulkCreate([
        {
          firstName: 'John',
          lastName: 'Snow',
          profession: 'Knows nothing',
          balance: 451.3,
          type:'client'
        },
        {
          firstName: 'Linus',
          lastName: 'Torvalds',
          profession: 'Programmer',
          balance: 1214,
          type:'contractor'
        },
      ])
      const [
        contract1,
      ] = await Contract.bulkCreate([
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client1.id,
          ContractorId: contractor1.id,
        },
      ])

      const { body: contract } = await request
        .get(`/contracts/${contract1.id}`)
        .set({ profile_id: contractor1.id });

      expect(contract).toMatchObject({
        id: contract1.id,
        status: 'in_progress',
        ClientId: client1.id,
        ContractorId: contractor1.id,
      })
    })

    it("should not return someone else's contract", async () => {
      const [
        client1,
        contractor1,
        contractor2,
      ] = await Profile.bulkCreate([
        {
          firstName: 'John',
          lastName: 'Snow',
          profession: 'Knows nothing',
          balance: 451.3,
          type:'client'
        },
        {
          firstName: 'Linus',
          lastName: 'Torvalds',
          profession: 'Programmer',
          balance: 1214,
          type:'contractor'
        },
        {
          firstName: 'John',
          lastName: 'Lenon',
          profession: 'Musician',
          balance: 64,
          type:'contractor'
        },
      ])
      const [
        ,
        contract2,
      ] = await Contract.bulkCreate([
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client1.id,
          ContractorId: contractor1.id,
        },
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client1.id,
          ContractorId: contractor2.id,
        },
      ])

      await request
        .get(`/contracts/${contract2.id}`)
        .set({ profile_id: contractor1.id })
        .expect(404);
    });

    it("should return list of contracts", async () => {
      const [
        client1,
        client2,
        contractor1,
        contractor2,
      ] = await Profile.bulkCreate([
        {
          firstName: 'John',
          lastName: 'Snow',
          profession: 'Knows nothing',
          balance: 451.3,
          type: 'client'
        },
        {
          firstName: 'Mr',
          lastName: 'Robot',
          profession: 'Hacker',
          balance: 231.11,
          type:'client'
        },
        {
          firstName: 'Linus',
          lastName: 'Torvalds',
          profession: 'Programmer',
          balance: 1214,
          type:'contractor'
        },
        {
          firstName: 'John',
          lastName: 'Lenon',
          profession: 'Musician',
          balance: 64,
          type:'contractor'
        },
      ])
      const [
        ,
        ,
        contract3,
        contract4,
      ] = await Contract.bulkCreate([
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client1.id,
          ContractorId: contractor1.id,
        },
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client1.id,
          ContractorId: contractor2.id,
        },
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client2.id,
          ContractorId: contractor2.id,
        },
        {
          terms: 'bla bla bla',
          status: 'terminated',
          ClientId: client2.id,
          ContractorId: contractor2.id,
        },
      ])

      const { body: contracts } = await request
        .get('/contracts')
        .set({ profile_id: client2.id });

      expect(contracts).toMatchObject(
        [
          { id: contract3.id },
        ]
      );
    });

  })

  describe('jobs', () => {

    it('should return list of unpaid jobs', async () => {
      const [
        client1,
        contractor1,
        contractor2,
      ] = await Profile.bulkCreate([
        {
          firstName: 'John',
          lastName: 'Snow',
          profession: 'Knows nothing',
          balance: 451.3,
          type: 'client'
        },
        {
          firstName: 'Linus',
          lastName: 'Torvalds',
          profession: 'Programmer',
          balance: 1214,
          type:'contractor'
        },
        {
          firstName: 'John',
          lastName: 'Lenon',
          profession: 'Musician',
          balance: 64,
          type:'contractor'
        },
      ])
      const [
        contract1,
        contract2,
      ] = await Contract.bulkCreate([
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client1.id,
          ContractorId: contractor1.id,
        },
        {
          terms: 'bla bla bla',
          status: 'terminated',
          ClientId: client1.id,
          ContractorId: contractor2.id,
        },
      ])
      const [
        job1,
      ] = await Job.bulkCreate([
        {
          description: 'work',
          price: 200,
          ContractId: contract1.id,
        },
        {
          description: 'work',
          paid: true,
          paymentDate:'2020-08-15T19:11:26.737Z',
          price: 200,
          ContractId: contract1.id,
        },
        {
          description: 'work',
          price: 200,
          ContractId: contract2.id,
        },
        {
          description: 'work',
          paid: true,
          paymentDate:'2020-08-15T19:11:26.737Z',
          price: 200,
          ContractId: contract2.id,
        },
      ])

      const { body: unpaidJobs } = await request
        .get('/jobs/unpaid')
        .set({ profile_id: client1.id });

      expect(unpaidJobs).toMatchObject(
        [
          { id: job1.id },
        ]
      );
    });

    it('should process payment successfully', async () => {
      const [
        client1,
        contractor1,
        contractor2,
      ] = await Profile.bulkCreate([
        {
          firstName: 'John',
          lastName: 'Snow',
          profession: 'Knows nothing',
          balance: 1000,
          type: 'client'
        },
        {
          firstName: 'Linus',
          lastName: 'Torvalds',
          profession: 'Programmer',
          balance: 1000,
          type:'contractor'
        },
        {
          firstName: 'John',
          lastName: 'Lenon',
          profession: 'Musician',
          balance: 64,
          type:'contractor'
        },
      ])
      const [
        contract1,
        contract2,
      ] = await Contract.bulkCreate([
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client1.id,
          ContractorId: contractor1.id,
        },
        {
          terms: 'bla bla bla',
          status: 'terminated',
          ClientId: client1.id,
          ContractorId: contractor2.id,
        },
      ])
      const [
        job1,
      ] = await Job.bulkCreate([
        {
          description: 'work',
          price: 200,
          ContractId: contract1.id,
        },
        {
          description: 'work',
          paid: true,
          paymentDate:'2020-08-15T19:11:26.737Z',
          price: 200,
          ContractId: contract1.id,
        },
        {
          description: 'work',
          price: 200,
          ContractId: contract2.id,
        },
        {
          description: 'work',
          paid: true,
          paymentDate:'2020-08-15T19:11:26.737Z',
          price: 200,
          ContractId: contract2.id,
        },
      ])

      await request
        .post(`/jobs/${job1.id}/pay`)
        .set({ profile_id: client1.id });

      await client1.reload();
      await contractor1.reload();

      expect(client1).toMatchObject({
        balance: 800,
      })

      expect(contractor1).toMatchObject({
        balance: 1200,
      })
    })

    it('should fail payment', async () => {
      const [
        client1,
        contractor1,
        contractor2,
      ] = await Profile.bulkCreate([
        {
          firstName: 'John',
          lastName: 'Snow',
          profession: 'Knows nothing',
          balance: 150,
          type: 'client'
        },
        {
          firstName: 'Linus',
          lastName: 'Torvalds',
          profession: 'Programmer',
          balance: 1000,
          type:'contractor'
        },
        {
          firstName: 'John',
          lastName: 'Lenon',
          profession: 'Musician',
          balance: 64,
          type:'contractor'
        },
      ])
      const [
        contract1,
        contract2,
      ] = await Contract.bulkCreate([
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client1.id,
          ContractorId: contractor1.id,
        },
        {
          terms: 'bla bla bla',
          status: 'terminated',
          ClientId: client1.id,
          ContractorId: contractor2.id,
        },
      ])
      const [
        job1,
      ] = await Job.bulkCreate([
        {
          description: 'work',
          price: 200,
          ContractId: contract1.id,
        },
        {
          description: 'work',
          paid: true,
          paymentDate:'2020-08-15T19:11:26.737Z',
          price: 200,
          ContractId: contract1.id,
        },
        {
          description: 'work',
          price: 200,
          ContractId: contract2.id,
        },
        {
          description: 'work',
          paid: true,
          paymentDate:'2020-08-15T19:11:26.737Z',
          price: 200,
          ContractId: contract2.id,
        },
      ])

      await request
        .post(`/jobs/${job1.id}/pay`)
        .set({ profile_id: client1.id })
        .expect(422);

      await client1.reload();
      await contractor1.reload();

      expect(client1).toMatchObject({
        balance: 150,
      })

      expect(contractor1).toMatchObject({
        balance: 1000,
      })
    })
  })

  describe('balances', () => {

    it('should deposit money to user balance successfully', async () => {
      const [
        client1,
        contractor1,
        contractor2,
      ] = await Profile.bulkCreate([
        {
          firstName: 'John',
          lastName: 'Snow',
          profession: 'Knows nothing',
          balance: 400,
          type: 'client'
        },
        {
          firstName: 'Linus',
          lastName: 'Torvalds',
          profession: 'Programmer',
          balance: 1214,
          type:'contractor'
        },
        {
          firstName: 'John',
          lastName: 'Lenon',
          profession: 'Musician',
          balance: 64,
          type:'contractor'
        },
      ])
      const [
        contract1,
        contract2,
      ] = await Contract.bulkCreate([
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client1.id,
          ContractorId: contractor1.id,
        },
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client1.id,
          ContractorId: contractor2.id,
        },
      ])
      await Job.bulkCreate([
        {
          description: 'work',
          price: 200,
          ContractId: contract1.id,
        },
        {
          description: 'work',
          paid: true,
          paymentDate:'2020-08-15T19:11:26.737Z',
          price: 200,
          ContractId: contract1.id,
        },
        {
          description: 'work',
          price: 200,
          ContractId: contract2.id,
        },
      ])

      await request
        .post(`/balances/deposit/${client1.id}`)
        .send({ amount: 100 })
        .set({ profile_id: client1.id });

      await client1.reload()

      expect(client1).toMatchObject(
        { balance: 500 },
      );
    });

    it('should fail deposit money to user balance', async () => {
      const [
        client1,
        contractor1,
        contractor2,
      ] = await Profile.bulkCreate([
        {
          firstName: 'John',
          lastName: 'Snow',
          profession: 'Knows nothing',
          balance: 400,
          type: 'client'
        },
        {
          firstName: 'Linus',
          lastName: 'Torvalds',
          profession: 'Programmer',
          balance: 1214,
          type:'contractor'
        },
        {
          firstName: 'John',
          lastName: 'Lenon',
          profession: 'Musician',
          balance: 64,
          type:'contractor'
        },
      ])
      const [
        contract1,
        contract2,
      ] = await Contract.bulkCreate([
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client1.id,
          ContractorId: contractor1.id,
        },
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client1.id,
          ContractorId: contractor2.id,
        },
      ])
      await Job.bulkCreate([
        {
          description: 'work',
          price: 200,
          ContractId: contract1.id,
        },
        {
          description: 'work',
          paid: true,
          paymentDate:'2020-08-15T19:11:26.737Z',
          price: 200,
          ContractId: contract1.id,
        },
        {
          description: 'work',
          price: 200,
          ContractId: contract2.id,
        },
      ])

      await request
        .post(`/balances/deposit/${client1.id}`)
        .send({ amount: 200 })
        .set({ profile_id: client1.id })
        .expect(422)

      await client1.reload()

      expect(client1).toMatchObject(
        { balance: 400 },
      );
    });

  })

  describe('admin', () => {

    it('should return the profession that earned the most money', async () => {
      const [
        client1,
        contractor1,
        contractor2,
        contractor3,
      ] = await Profile.bulkCreate([
        {
          firstName: 'John',
          lastName: 'Snow',
          profession: 'Knows nothing',
          balance: 400,
          type: 'client'
        },
        {
          firstName: 'Linus',
          lastName: 'Torvalds',
          profession: 'Programmer',
          balance: 1214,
          type:'contractor'
        },
        {
          firstName: 'John',
          lastName: 'Lenon',
          profession: 'Musician',
          balance: 64,
          type:'contractor'
        },
        {
          firstName: 'Alan',
          lastName: 'Turing',
          profession: 'Programmer',
          balance: 22,
          type:'contractor'
        },
      ])
      const [
        contract1,
        contract2,
        contract3,
      ] = await Contract.bulkCreate([
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client1.id,
          ContractorId: contractor1.id,
        },
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client1.id,
          ContractorId: contractor2.id,
        },
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client1.id,
          ContractorId: contractor3.id,
        },
      ])
      await Job.bulkCreate([
        {
          description: 'work',
          price: 200,
          ContractId: contract1.id,
        },
        {
          description: 'work',
          paid: true,
          paymentDate:'2010-08-10T19:11:26.737Z',
          price: 200,
          ContractId: contract1.id,
        },
        {
          description: 'work',
          price: 200,
          ContractId: contract2.id,
        },
        {
          description: 'work',
          paid: true,
          paymentDate:'2010-08-15T19:11:26.737Z',
          price: 300,
          ContractId: contract2.id,
        },
        {
          description: 'work',
          paid: true,
          paymentDate:'2010-08-20T19:11:26.737Z',
          price: 200,
          ContractId: contract3.id,
        },
      ])

      let response = await request
        .get('/admin/best-profession')
        .query({
          start: '2010-08-09T00:00:00.000Z',
          end: '2010-08-21T00:00:00.000Z',
        })
        .set({ profile_id: client1.id });

      expect(response.body).toMatchObject(
        { profession: 'Programmer' },
      );

      response = await request
        .get('/admin/best-profession')
        .query({
          start: '2010-08-14T00:00:00.000Z',
          end: '2010-08-16T00:00:00.000Z',
        })
        .set({ profile_id: client1.id });

      expect(response.body).toMatchObject(
        { profession: 'Musician' },
      );
    });

    it('should return a list of clients who pay the most for the jobs', async () => {
      const [
        client1,
        client2,
        contractor1,
      ] = await Profile.bulkCreate([
        {
          firstName: 'John',
          lastName: 'Snow',
          profession: 'Knows nothing',
          balance: 400,
          type: 'client'
        },
        {
          firstName: 'Ash',
          lastName: 'Kethcum',
          profession: 'Pokemon master',
          balance: 1.3,
          type:'client'
        },
        {
          firstName: 'Linus',
          lastName: 'Torvalds',
          profession: 'Programmer',
          balance: 1214,
          type:'contractor'
        },
      ])
      const [
        contract1,
        contract2,
      ] = await Contract.bulkCreate([
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client1.id,
          ContractorId: contractor1.id,
        },
        {
          terms: 'bla bla bla',
          status: 'in_progress',
          ClientId: client2.id,
          ContractorId: contractor1.id,
        },
      ])
      await Job.bulkCreate([
        {
          description: 'work',
          price: 200,
          ContractId: contract1.id,
        },
        {
          description: 'work',
          paid: true,
          paymentDate:'2011-08-10T19:11:26.737Z',
          price: 200,
          ContractId: contract1.id,
        },
        {
          description: 'work',
          paid: true,
          paymentDate:'2011-08-11T19:11:26.737Z',
          price: 200,
          ContractId: contract1.id,
        },
        {
          description: 'work',
          price: 200,
          ContractId: contract2.id,
        },
        {
          description: 'work',
          paid: true,
          paymentDate:'2011-08-15T19:11:26.737Z',
          price: 300,
          ContractId: contract2.id,
        },
        {
          description: 'work',
          paid: true,
          paymentDate:'2011-08-20T19:11:26.737Z',
          price: 200,
          ContractId: contract2.id,
        },
      ])

      let response = await request
        .get('/admin/best-clients')
        .query({
          start: '2011-08-09T00:00:00.000Z',
          end: '2011-08-21T00:00:00.000Z',
          limit: 2,
        })
        .set({ profile_id: client1.id });

      expect(response.body).toMatchObject(
        [
          { 'fullName': 'Ash Kethcum', 'id': client2.id, 'paid': 500 },
          { 'fullName': 'John Snow', 'id': client1.id, 'paid': 400 },
        ]
      );

      response = await request
        .get('/admin/best-clients')
        .query({
          start: '2011-08-09T00:00:00.000Z',
          end: '2011-08-19T00:00:00.000Z',
          limit: 2,
        })
        .set({ profile_id: client1.id });

      expect(response.body).toMatchObject(
        [
          { 'fullName': 'John Snow', 'id': client1.id, 'paid': 400 },
          { 'fullName': 'Ash Kethcum', 'id': client2.id, 'paid': 300 },
        ]
      );
    });

  })

})
