'use strict'

const test = require('tape')
const rpc = require('../')
const axon = require('axon')
const rep = axon.socket('rep')
const req = axon.socket('req')

rep.bind(4000)
req.connect(4000)

let server = new rpc.Server(rep)
let client = new rpc.Client(req)

test('Server', function (t) {
  server.expose('add', function (a, b, fn) {
    fn(null, a + b)
  })

  client.call('add', 1, 2, function (err, n) {
    t.ok(!err, 'Client --> Server RPC call successful.')
    t.ok(n === 3, 'Remote method responded correctly.')

    server.expose({
      uppercase: function (str, fn) {
        fn(null, str.toUpperCase())
      }
    })

    client.call('uppercase', 'hello', function (err, str) {
      t.ok(!err, 'Exposed multiple methods.')
      t.ok(str === 'HELLO', 'Multiple methods return proper results.')
      t.end()
    })
  })
})

test('Client', function (t) {
  client.methods(function (err, methods) {
    t.ok(!err, 'Client.methods called successfully.')
    t.ok(methods.add.name === 'add', 'Recognized method by name.')
    t.ok(methods.add.params[0] === 'a' && methods.add.params[1] === 'b', 'Recognized parameters.')
    t.ok(methods.add.params[2] === 'fn', 'Recognized callback method.')
    t.ok(methods.hasOwnProperty('uppercase'), 'Recognizes multiple methods')
    client.call('something', function (err) {
      t.ok(err, 'Invalid method does not exist.')
      server.expose('error', function (fn) {
        fn(new Error('boom'))
      })

      client.call('error', function (err) {
        t.ok(err instanceof Error, 'Responds with error object.')
        t.ok(err.message === 'boom', 'Error maintains appropriate properties.')

        client.on('disconnect', function () {
          t.pass('Client disconnected successfully.')
          server.close()
        })

        server.on('close', function () {
          t.pass('Server shutdown successfully.')
          t.end()
        })

        client.disconnect()
      })
    })
  })
})
