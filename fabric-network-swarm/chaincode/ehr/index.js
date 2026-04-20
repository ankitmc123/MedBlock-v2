'use strict';

const { Contract } = require('fabric-contract-api');

class PharmacyContract extends Contract {

  async initLedger(ctx) {
    console.log('Pharmacy Ledger Initialized');
    return 'Pharmacy Ledger initialized';
  }

  // Only registered users can create records
  async createRecord(ctx, patientId, name, ipfsHash) {
    let role = ctx.clientIdentity.getAttributeValue('role');
    if (!role) {
      // For development/cryptogen environments, default to manager if role is missing
      role = 'manager';
      console.log('Defaulted to manager role for cryptogen identity');
    }

    const record = {
      docType: 'pharmacy_ehr',
      patientId,
      name,
      ipfsHash,
      timestamp: new Date().toISOString(),
      creator: ctx.clientIdentity.getID(),
      creatorRole: role
    };

    await ctx.stub.putState(patientId, Buffer.from(JSON.stringify(record)));
    return JSON.stringify(record);
  }

  async queryRecord(ctx, patientId) {
    const data = await ctx.stub.getState(patientId);
    if (!data || data.length === 0) {
      throw new Error(`Record ${patientId} does not exist`);
    }
    return data.toString();
  }

  // Only Managers can update records
  async updateRecord(ctx, patientId, newIpfsHash) {
    let role = ctx.clientIdentity.getAttributeValue('role');
    if (!role) {
      role = 'manager';
    }
    if (role !== 'manager') {
      throw new Error('Access Denied: Only Managers can update records');
    }

    const existing = await this.queryRecord(ctx, patientId);
    const record = JSON.parse(existing);
    
    record.ipfsHash = newIpfsHash;
    record.timestamp = new Date().toISOString();
    record.lastUpdatedBy = ctx.clientIdentity.getID();
    
    await ctx.stub.putState(patientId, Buffer.from(JSON.stringify(record)));
    return JSON.stringify(record);
  }

  async getAllRecords(ctx) {
    const iterator = await ctx.stub.getStateByRange('', '');
    const results = [];
    while (true) {
      const result = await iterator.next();
      if (result.value && result.value.value) {
        let strValue;
        try {
          strValue = result.value.value.toString('utf8');
          const record = JSON.parse(strValue);
          if (record.docType === 'pharmacy_ehr' || record.docType === 'ehr') {
            results.push(record);
          }
        } catch (err) {
          console.log(err.message);
        }
      }
      if (result.done) { 
        await iterator.close(); 
        break; 
      }
    }
    return JSON.stringify(results);
  }

}

module.exports = PharmacyContract;
module.exports.contracts = [PharmacyContract];
