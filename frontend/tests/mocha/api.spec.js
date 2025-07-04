/* eslint-env mocha */
process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';

require('../helpers/local-storage');

const { expect }   = require('chai');
const sinon        = require('sinon');
const proxyquire   = require('proxyquire').noCallThru();

/* ------------------------------------------------------------- */
/*  Axios test-double                                            */
/* ------------------------------------------------------------- */
let post, get, put, axiosCreate;
let api;          // lib under test

function loadApi() {
  post = sinon.stub().resolves({ data: {}, headers: {} });
  get  = sinon.stub().resolves({ data: [] });
  put  = sinon.stub().resolves({ data: {} });

  const axiosFake = {
    post, get, put,
    interceptors: { request: { use() {} }, response: { use() {} } },
  };

  axiosCreate = sinon.stub().returns(axiosFake);
  const axiosStub = { create: axiosCreate, default: { create: axiosCreate } };

  delete require.cache[require.resolve('../../lib/api')];
  api = proxyquire('../../lib/api', { axios: axiosStub });
}

beforeEach(loadApi);


describe('axios instance', () => {
  it('is created with correct baseURL & credentials flag', () => {
    expect(axiosCreate.calledOnce).to.be.true;
    const cfg = axiosCreate.firstCall.firstArg;
    expect(cfg).to.include({ baseURL: 'https://api.example.com', withCredentials: true });
  });
});

describe('API surface', () => {
  it('petApi.listPets → GET /pets', async () => {
    await api.petApi.listPets();
    expect(get.calledWith('/pets')).to.be.true;
  });

  it('userApi.getProfile → GET /users/me', async () => {
    await api.userApi.getProfile();
    expect(get.calledWith('/users/me')).to.be.true;
  });

  it('matchApi.listMatches → GET /matches', async () => {
    await api.matchApi.listMatches();
    expect(get.calledWith('/matches')).to.be.true;
  });

  it('swipeApi.recordSwipe → POST /swipes', async () => {
    post.resolves({ data: { ok: true }, headers: {} });
    await api.swipeApi.recordSwipe('pet-1', true);
    expect(post.calledWith('/swipes', { petId: 'pet-1', liked: true })).to.be.true;
  });
});
