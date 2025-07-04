/* eslint-env mocha */

const { createMocks } = require('node-mocks-http');
const handler         = require('../../pages/api/chat-proxy').default;
const { expect }      = require('chai');

function mockReqRes({ method = 'POST', headers = {}, body = {} } = {}) {
  const { req, res } = createMocks({ method, url: '/api/chat', headers, body });
  return { req, res };
}

describe('/api/chat proxy', () => {
  afterEach(() => { delete global.fetch; });

  it('405s on non-POST', async () => {
    const { req, res } = mockReqRes({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).to.equal(405);
  });

  it('successfully pipes backend response', async () => {
    global.fetch = () =>
      Promise.resolve({ status: 200, json: () => Promise.resolve({ ok: true }) });

    const { req, res } = mockReqRes({ body: { msg: 'hi' } });
    await handler(req, res);

    expect(res._getStatusCode()).to.equal(200);
    expect(res._getJSONData()).to.deep.equal({ ok: true });
  });
});
