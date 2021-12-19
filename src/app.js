const express = require('express');
const bodyParser = require('body-parser');
const { Op } = require('sequelize');
const {sequelize, Contract} = require('./model')
const {getProfile} = require('./middleware/getProfile')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

/**
 * @returns contract by id if related by profile_id header
 */
app.get('/contracts/:id',getProfile ,async (req, res) =>{
    const {Contract} = req.app.get('models')
    const {id} = req.params
    const profileId = req.profile.id
    const contract = await Contract
        .scope({ method: ['relatedContract', profileId] })
        .findOne({ where: { id } })
    if(!contract) return res.status(404).end()
    res.json(contract)
})

/**
 * @returns list of related contracts
 */
app.get('/contracts', getProfile, async (req, res) =>{
    const {Contract} = req.app.get('models')
    const profileId = req.profile.id
    const contracts = await Contract
        .scope({ method: ['relatedContract', profileId] }, 'nonTerminated')
        .findAll()
    res.json(contracts)
})


/**
 * @returns list of unpaid jobs by related contracts
 */
 app.get('/jobs/unpaid', getProfile, async (req, res) =>{
    const { Job } = req.app.get('models')
    const profileId = req.profile.id
    const jobs = await Job
        .scope({ method: ['relatedActiveContract', profileId] }, 'unpaid')
        .findAll()
    res.json(jobs)
})

/**
 * @returns payment result
 */
 app.post('/jobs/:job_id/pay', getProfile, async (req, res) =>{
    const { Job, Profile } = req.app.get('models')
    const { job_id: jobId } = req.params
    const profileId = req.profile.id
    const job = await Job
        .scope({ method: ['relatedActiveContract', profileId] })
        .findOne({ where: { id: jobId } })

    if (!job) {
        throw new Error(`Job payment: no active contract is found for job id: ${jobId}, profile id: ${profileId}`)
    }

    const { ClientId: clientId, ContractorId: contractorId } = job.Contract

    if (profileId !== clientId) {
        throw new Error(`Job payment: only client is allowed to initiate payment for job id: ${jobId}, profile id: ${profileId}`)
    }

    try {
        await sequelize.transaction(async transaction => {
            const updatedJob = await Job
                .scope('unpaid')
                .update({
                    paid: true,
                    paymentDate: Date.now(),
                }, {
                    where: { id: jobId },
                    transaction,
                })

            if (!updatedJob) {
                throw new Error(`Job payment: cannot mark job as paid, job id: ${jobId}`)
            }

            const [[, affectedClientCount ]] = await Profile.decrement(
                { balance: job.price },
                {
                    where: {
                        id: clientId,
                        balance: {
                            [Op.gte]: job.price,
                        }
                    },
                    transaction,
                }
            )

            if (!affectedClientCount) {
                throw new Error(`Job payment: insufficient funds, job id: ${jobId}`);
            }

            const [[, affectedContractorCount ]] = await Profile.increment(
                { balance: job.price },
                {
                    where: {
                        id: contractorId,
                    },
                    transaction,
                }
            )

            if (!affectedContractorCount) {
                throw new Error(`Job payment: contractor profile is missed, job id: ${jobId}, contractor id: ${contractorId}`);
            }

        });
    } catch (e) {
        return res.status(422).send({
            error: e.message,
            success: false,
        } );
    }

    res.json({ success: true })
})

/**
 * @returns deposit result
 */
app.post('/balances/deposit/:userId', getProfile, async (req, res) =>{
    const { Job } = req.app.get('models')
    const { profile } = req
    const { id: profileId, type: profileType } = profile
    const userId = +req.params.userId

    if (!(profileId === userId && profileType === 'client')) {
        return res.status(401).end()
    }

    // vyt: @todo: validate amount value as positive number
    const { amount } = req.body

    const totalJobsToPayAmount = await Job
        .scope({ method: ['relatedActiveContract', profileId] }, 'unpaid')
        .sum('price')

    if (amount > (totalJobsToPayAmount * 0.25)) {
        return res.status(422).end()
    }

    await profile.increment({ balance: amount })
    await profile.save()

    res.send({ success: true })
})

/**
 * @returns best profession
 */
 app.get('/admin/best-profession', getProfile, async (req, res) =>{
    const { Contract, Job, Profile } = req.app.get('models')
     // vyt: @todo: validate start/end values
     const { start = Date.now(), end = Date.now() } = req.query;

     const result = await Job
        .scope({ method: ['paidBetween', start, end ] })
        .findAll({
            include: [
                {
                    model: Contract,
                    required: true,
                    attributes: [
                        'ContractorId',
                    ],
                    include: [
                        {
                            model: Profile,
                            required: true,
                            as: 'Contractor',
                            attributes: ['profession']
                        }
                    ],
                }
            ],
            attributes: [
              'Contract.Contractor.profession',
              [sequelize.fn('sum', sequelize.col('price')), 'total_price'],
            ],
            group: ['Contract.Contractor.profession'],
            order: [
                [ sequelize.col('total_price'), 'DESC' ],
            ],
            limit: 1,
            raw: true,
          })

    const profession = result[0]?.profession || '';

    res.send({ profession });
})

/**
 * @returns list of best clients
 */
 app.get('/admin/best-clients', getProfile, async (req, res) =>{
    const { Contract, Job, Profile } = req.app.get('models')
     // vyt: @todo: validate start/end/limit values
     let { start = Date.now(), end = Date.now(), limit = 10 } = req.query;
     const SYSTEM_ROWS_LIMIT = 100;
     limit = Math.min(limit, SYSTEM_ROWS_LIMIT);

     const clients = await Job
        .scope({ method: ['paidBetween', start, end ] })
        .findAll({
            include: [
                {
                    model: Contract,
                    required: true,
                    attributes: [
                        'ClientId',
                    ],
                    include: [
                        {
                            model: Profile,
                            required: true,
                            as: 'Client',
                            attributes: ['firstName', 'lastName']
                        }
                    ],
                }
            ],
            attributes: [
                'Contract.ClientId',
                [sequelize.fn('sum', sequelize.col('price')), 'total_price'],
            ],
            group: ['Contract.ClientId'],
            order: [
                [ sequelize.col('total_price'), 'DESC' ],
            ],
            limit,
            raw: true,
          })

    const result = clients.map(client => ({
        id: client.ClientId,
        paid: client.total_price,
        fullName: `${client['Contract.Client.firstName']} ${client['Contract.Client.lastName']}`,
    }))

    res.send(result);
})

module.exports = app;
