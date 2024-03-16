import dotenv from 'dotenv'
import Fastify from 'fastify'
import { sepolia, gnosisChiado } from 'viem/chains'

import CelestiaController from './controllers/CelestiaController.js'
import EthereumController from './controllers/EthereumController.js'

dotenv.config()

const fastify = Fastify({
  logger: true,
  requestTimeout: 30000,
  exposeHeadRoutes: true
})

const port = process.env.PORT || 3000

const celestiaController = new CelestiaController({
  rpcUrl: process.env.CELESTIA_RPC_URL,
  bearerToken: process.env.CELESTIA_BEARER_TOKEN
})
const ethereumController = new EthereumController({
  chain: sepolia,
  privateKey: process.env.ETHEREUM_PRIVATE_KEY,
  rpcUrl: process.env.ETHEREUM_RPC_URL
})

const gnosisController = new EthereumController({
  chain: gnosisChiado,
  privateKey: process.env.GNOSIS_PRIVATE_KEY,
  rpcUrl: process.env.GNOSIS_RPC_URL
})

fastify.route({
  method: 'OPTIONS',
  url: '/*',
  handler: async (request, reply) => {
    var reqAllowedHeaders = request.headers['access-control-request-headers']
    if (reqAllowedHeaders !== undefined) {
      reply.header('Access-Control-Allow-Headers', reqAllowedHeaders)
    }
    reply
      .code(204)
      .header('Content-Length', '0')
      .header('Access-Control-Allow-Origin', 'your server')
      .header('Access-Control-Allow-Credentials', true)
      .header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
      .send()
  }
})

fastify.addHook('onRequest', function (request, reply, next) {
  reply.header('Access-Control-Allow-Origin', 'your server')
  reply.header('Access-Control-Allow-Credentials', true)
  next()
})

fastify.listen({ port }, (_err, _address) => {
  if (_err) {
    fastify.log._error(_err)
    process.exit(1)
  }
})

fastify.post('/v1', async (_request, _reply) => {
  const responses = []
  const params = _request.body.params

  if (_request.body.method === 'panda.submitBlob') {
    for (const { data, das } of params) {
      for (const { name, namespace, address } of das) {
        if (name === 'celestia') {
          responses.push(
            await celestiaController.submitBlob({
              data,
              namespace
            })
          )
        }
        if (name === 'ethereum') {
          responses.push(
            await ethereumController.submitBlob({
              address,
              content: data,
              maxFeePerGas: 180e9,
              maxPriorityFeePerGas: 1e9,
              maxFeePerBlobGas: 25e9
            })
          )
        }
        if (name === 'gnosis') {
          responses.push(
            await gnosisController.submitBlob({
              address,
              content: data,
              maxFeePerGas: 1e9,
              maxPriorityFeePerGas: 1e9,
              maxFeePerBlobGas: 1e9
            })
          )
        }
      }
    }

    _reply.send({
      id: _request.body.id,
      jsonrpc: '2.0',
      result: responses
    })
    return
  }

  if (_request.body.method === 'panda.getProof') {
    for (const { height, name, namespace, verifyOn } of params[1]) {
      /*if (name === 'celestia') {
        responses.push(
          await celestiaController.getProof({
            height,
            namespace,
            verifyOn
          })
        )
      }*/
      if (name === 'ethereum') {
        responses.push(
          await ethereumController.getProof({
            height,
            verifyOn
          })
        )
      }
    }

    _reply.send({
      id: _request.body.id,
      jsonrpc: '2.0',
      result: responses
    })
    return
  }
})
