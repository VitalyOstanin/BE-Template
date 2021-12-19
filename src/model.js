const Sequelize = require('sequelize');
const { Op } = Sequelize;

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env['DEEL_BE_TEMPLATE_STORAGE'] || './database.sqlite3'
});

class Profile extends Sequelize.Model {}
Profile.init(
  {
    firstName: {
      type: Sequelize.STRING,
      allowNull: false
    },
    lastName: {
      type: Sequelize.STRING,
      allowNull: false
    },
    profession: {
      type: Sequelize.STRING,
      allowNull: false
    },
    balance:{
      type:Sequelize.DECIMAL(12,2)
    },
    type: {
      type: Sequelize.ENUM('client', 'contractor')
    }
  },
  {
    sequelize,
    modelName: 'Profile'
  }
);

class Contract extends Sequelize.Model {}
Contract.init(
  {
    terms: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    status:{
      type: Sequelize.ENUM('new','in_progress','terminated')
    }
  },
  {
    sequelize,
    modelName: 'Contract'
  }
);

class Job extends Sequelize.Model {}
Job.init(
  {
    description: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    price:{
      type: Sequelize.DECIMAL(12,2),
      allowNull: false
    },
    paid: {
      type: Sequelize.BOOLEAN,
      default:false
    },
    paymentDate:{
      type: Sequelize.DATE
    }
  },
  {
    sequelize,
    modelName: 'Job'
  }
);

Profile.hasMany(Contract, {as :'Contractor',foreignKey:'ContractorId'})
Contract.belongsTo(Profile, {as: 'Contractor'})
Profile.hasMany(Contract, {as : 'Client', foreignKey:'ClientId'})
Contract.belongsTo(Profile, {as: 'Client'})
Contract.hasMany(Job)
Job.belongsTo(Contract)


Contract.addScope('active', {
  where: {
    status: 'in_progress'
  },
})

Contract.addScope('nonTerminated', {
  where: {
    status: {
      [Op.ne]: 'terminated',
    }
  },
})

Contract.addScope('relatedContract', profileId => ({
  where: {
    [Op.or]: [
      { ClientId: profileId },
      { ContractorId: profileId },
    ],
  },
}))

Job.addScope('unpaid', {
  where: {
    // vyt: @todo: how to query boolean/tinyint correctly ?
    paid: {
      [Op.or]: [ false, null ]
    },
  },
})

Job.addScope('relatedActiveContract', profileId => ({
  include: [
    {
      model: Contract.scope({ method: ['relatedContract', profileId] }, 'active'),
      required: true,
    },
  ]
}))

Job.addScope('paidBetween', ( start, end ) => ({
  where: {
    paymentDate: {
      [Op.between]: [start, end],
    },
  }
}))

module.exports = {
  sequelize,
  Profile,
  Contract,
  Job
};
